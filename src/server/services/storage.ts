import "server-only";

import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { FilePurpose, FileVisibility } from "@/lib/domain-enums";
import { randomToken, sha256 } from "@/server/crypto";
import { db } from "@/server/db";
import { UPLOAD_RULES as RULES, validImageContent } from "@/lib/upload-rules";
import { UploadThingDriver } from "./uploadthing-storage";
import { resolveStorageConfig, type CloudStorageConfig } from "./storage-config";

// UploadThing is preferred when configured. Existing S3 deployments remain
// supported; local disk is only available in development.

interface StorageDriver {
  put(key: string, bytes: Buffer, contentType: string, visibility: FileVisibility): Promise<{ url: string | null }>;
  get(key: string, visibility: FileVisibility): Promise<Buffer | null>;
  remove(key: string, visibility: FileVisibility): Promise<void>;
  /** A short-lived URL for direct browser access (S3) or null (local). */
  signedUrl(key: string, visibility: FileVisibility, expiresInSeconds?: number): Promise<string | null>;
  presignUpload?(key: string, contentType: string, visibility: FileVisibility, sizeBytes: number): Promise<string>;
}

class LocalDriver implements StorageDriver {
  private root(visibility: FileVisibility) {
    return visibility === "PUBLIC" ? path.resolve("public/uploads") : path.resolve("storage/private");
  }
  private file(key: string, visibility: FileVisibility) {
    const root = this.root(visibility);
    const full = path.resolve(root, key);
    if (!full.startsWith(root + path.sep)) throw new Error("Invalid storage key");
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
  private client: S3Client;
  constructor(private config: CloudStorageConfig) {
    this.client = new S3Client({
      region: config.region, endpoint: config.endpoint,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
      requestChecksumCalculation: "WHEN_REQUIRED",
    });
  }
  private bucket(visibility: FileVisibility) {
    return visibility === "PUBLIC" ? this.config.bucket : this.config.privateBucket;
  }
  async put(key: string, bytes: Buffer, contentType: string, visibility: FileVisibility) {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket(visibility), Key: key, Body: bytes, ContentType: contentType, CacheControl: visibility === "PUBLIC" ? "public, max-age=31536000, immutable" : "private, no-store" }));
    const base = this.config.publicBaseUrl;
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
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket(visibility), Key: key, ResponseCacheControl: visibility === "PRIVATE" ? "private, no-store" : undefined }), { expiresIn: expiresInSeconds });
  }
  async presignUpload(key: string, contentType: string, visibility: FileVisibility, sizeBytes: number) {
    return getSignedUrl(this.client, new PutObjectCommand({ Bucket: this.bucket(visibility), Key: key, ContentType: contentType, ContentLength: sizeBytes, IfNoneMatch: "*" }), { expiresIn: 600, signableHeaders: new Set(["content-type", "if-none-match"]) });
  }
}

let driver: StorageDriver | undefined;
export function storage(): StorageDriver {
  if (!driver) {
    if (process.env.UPLOADTHING_TOKEN?.trim()) {
      driver = new UploadThingDriver();
      return driver;
    }
    let config: CloudStorageConfig | null;
    try { config = resolveStorageConfig(process.env); }
    catch (error) {
      console.error("Upload storage configuration:", error instanceof Error ? error.message : "Invalid settings");
      throw new UploadError("File uploads are temporarily unavailable. Please contact support.");
    }
    driver = config ? new S3Driver(config) : new LocalDriver();
  }
  return driver;
}

// ── Validated uploads ─────────────────────────────────────────────────────────

export class UploadError extends Error {}

export async function saveUpload(file: File, purpose: FilePurpose, ownerId: string, uploadedById: string) {
  const rule = RULES[purpose];
  if (!rule.types.includes(file.type)) throw new UploadError(`${file.name}: unsupported file type.`);
  if (file.size > rule.maxBytes) throw new UploadError(`${file.name} is larger than ${Math.round(rule.maxBytes / 1024 / 1024)} MB.`);
  if (file.size === 0) throw new UploadError(`${file.name} is empty.`);

  const bytes = Buffer.from(await file.arrayBuffer());
  if (file.type.startsWith("image/") && !validImageContent(bytes, file.type)) {
    throw new UploadError(`${file.name}: the file content does not match the image type.`);
  }
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

/** Resolve direct-upload references without trusting client-supplied URLs. */
export async function ownedUpload(id: string, purpose: FilePurpose, userId: string) {
  const asset = await db.fileAsset.findFirst({ where: { id, purpose, uploadedById: userId, visibility: RULES[purpose].visibility } });
  if (!asset) throw new UploadError("This upload does not belong to your account. Please upload it again.");
  return asset;
}
