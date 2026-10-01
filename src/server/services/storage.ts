import "server-only";

import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { FilePurpose, FileVisibility } from "@/generated/prisma/enums";
import { randomToken, sha256 } from "@/server/crypto";
import { db } from "@/server/db";

// Storage abstraction. Production: S3 (public bucket behind a CDN for product
// media, private bucket for KYC documents & certificates, served through
// short-lived signed URLs). Development: local disk.

interface StorageDriver {
  put(key: string, bytes: Buffer, contentType: string, visibility: FileVisibility): Promise<{ url: string | null }>;
  get(key: string, visibility: FileVisibility): Promise<Buffer | null>;
  remove(key: string, visibility: FileVisibility): Promise<void>;
  /** A short-lived URL for direct browser access (S3) or null (local). */
  signedUrl(key: string, visibility: FileVisibility, expiresInSeconds?: number): Promise<string | null>;
  presignUpload?(key: string, contentType: string, visibility: FileVisibility): Promise<string>;
}

class LocalDriver implements StorageDriver {
  private root(visibility: FileVisibility) {
    return visibility === "PUBLIC" ? path.resolve("public/uploads") : path.resolve("storage/private");
  }
  private file(key: string, visibility: FileVisibility) {
    const root = this.root(visibility);
    const full = path.resolve(root, key);
    if (!full.startsWith(root)) throw new Error("Invalid storage key");
    return full;
  }
  async put(key: string, bytes: Buffer, _type: string, visibility: FileVisibility) {
    const full = this.file(key, visibility);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, bytes);
    return { url: visibility === "PUBLIC" ? `/uploads/${key}` : null };
  }
  async get(key: string, visibility: FileVisibility) {
    try {
      return await readFile(this.file(key, visibility));
    } catch {
      return null;
    }
  }
  async remove(key: string, visibility: FileVisibility) {
    await unlink(this.file(key, visibility)).catch(() => undefined);
  }
  async signedUrl() {
    return null;
  }
}

class S3Driver implements StorageDriver {
  private client = new S3Client({
    region: process.env.S3_REGION,
    credentials: process.env.S3_ACCESS_KEY_ID
      ? { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "" }
      : undefined,
  });
  private bucket(visibility: FileVisibility) {
    return visibility === "PUBLIC" ? process.env.S3_BUCKET! : (process.env.S3_PRIVATE_BUCKET ?? process.env.S3_BUCKET!);
  }
  async put(key: string, bytes: Buffer, contentType: string, visibility: FileVisibility) {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket(visibility), Key: key, Body: bytes, ContentType: contentType, CacheControl: visibility === "PUBLIC" ? "public, max-age=31536000, immutable" : "private, no-store" }));
    const base = process.env.S3_PUBLIC_BASE_URL ?? `https://${this.bucket("PUBLIC")}.s3.${process.env.S3_REGION}.amazonaws.com`;
    return { url: visibility === "PUBLIC" ? `${base}/${key}` : null };
  }
  async get(key: string, visibility: FileVisibility) {
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket(visibility), Key: key })).catch(() => null);
    if (!res?.Body) return null;
    return Buffer.from(await res.Body.transformToByteArray());
  }
  async remove(key: string, visibility: FileVisibility) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket(visibility), Key: key }));
  }
  async signedUrl(key: string, visibility: FileVisibility, expiresInSeconds = 300) {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket(visibility), Key: key }), { expiresIn: expiresInSeconds });
  }
  async presignUpload(key: string, contentType: string, visibility: FileVisibility) {
    return getSignedUrl(this.client, new PutObjectCommand({ Bucket: this.bucket(visibility), Key: key, ContentType: contentType }), { expiresIn: 600 });
  }
}

let driver: StorageDriver | undefined;
export function storage(): StorageDriver {
  driver ??= process.env.S3_BUCKET ? new S3Driver() : new LocalDriver();
  return driver;
}

// ── Validated uploads ─────────────────────────────────────────────────────────

const RULES: Record<FilePurpose, { types: string[]; maxBytes: number; visibility: FileVisibility }> = {
  PRODUCT_MEDIA: { types: ["image/jpeg", "image/png", "image/webp", "image/avif"], maxBytes: 12 * 1024 * 1024, visibility: "PUBLIC" },
  STORE_BRANDING: { types: ["image/jpeg", "image/png", "image/webp", "image/svg+xml"], maxBytes: 6 * 1024 * 1024, visibility: "PUBLIC" },
  REVIEW_MEDIA: { types: ["image/jpeg", "image/png", "image/webp"], maxBytes: 8 * 1024 * 1024, visibility: "PUBLIC" },
  CERTIFICATE: { types: ["application/pdf", "image/jpeg", "image/png"], maxBytes: 12 * 1024 * 1024, visibility: "PRIVATE" },
  KYC_DOCUMENT: { types: ["application/pdf", "image/jpeg", "image/png"], maxBytes: 12 * 1024 * 1024, visibility: "PRIVATE" },
  MESSAGE_ATTACHMENT: { types: ["application/pdf", "image/jpeg", "image/png", "image/webp"], maxBytes: 8 * 1024 * 1024, visibility: "PRIVATE" },
  CUSTOM_REQUEST_REFERENCE: { types: ["image/jpeg", "image/png", "image/webp"], maxBytes: 8 * 1024 * 1024, visibility: "PUBLIC" },
  GENERATED_DOCUMENT: { types: ["application/pdf"], maxBytes: 12 * 1024 * 1024, visibility: "PRIVATE" },
};

export class UploadError extends Error {}

export async function saveUpload(file: File, purpose: FilePurpose, ownerId: string, uploadedById: string) {
  const rule = RULES[purpose];
  if (!rule.types.includes(file.type)) throw new UploadError(`${file.name}: unsupported file type.`);
  if (file.size > rule.maxBytes) throw new UploadError(`${file.name} is larger than ${Math.round(rule.maxBytes / 1024 / 1024)} MB.`);
  if (file.size === 0) throw new UploadError(`${file.name} is empty.`);

  const bytes = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").slice(-80);
  const key = `${purpose.toLowerCase().replace(/_/g, "-")}/${ownerId}/${randomToken(9)}-${safeName}`;
  const { url } = await storage().put(key, bytes, file.type, rule.visibility);
  return db.fileAsset.create({
    data: {
      key,
      visibility: rule.visibility,
      purpose,
      fileName: file.name.slice(0, 200),
      mimeType: file.type,
      sizeBytes: file.size,
      checksum: sha256(bytes.toString("base64")),
      url,
      uploadedById,
    },
  });
}
