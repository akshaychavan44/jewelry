import "server-only";
import { z } from "zod";
import { encrypt, decrypt, randomToken, sha256 } from "@/server/crypto";
import { db } from "@/server/db";
import { validImageContent } from "@/lib/upload-rules";
import { storage, UploadError } from "./storage";

const metadata = z.object({
  fileName: z.string().trim().min(1).max(200),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  sizeBytes: z.number().int().positive().max(12 * 1024 * 1024, "Documents must be 12 MB or smaller."),
});
const ticketSchema = metadata.extend({ key: z.string(), userId: z.string(), sellerId: z.string(), expiresAt: z.number() });

export async function prepareKycUpload(userId: string, sellerId: string, input: unknown) {
  const data = metadata.parse(input);
  const driver = storage();
  if (!driver.presignUpload) return { direct: false as const };
  const safeName = data.fileName.toLowerCase().replace(/[^a-z0-9.]+/g, "-").slice(-80);
  const key = `kyc-document/${sellerId}/${randomToken(18)}-${safeName}`;
  const ticket = encrypt(JSON.stringify({ ...data, key, userId, sellerId, expiresAt: Date.now() + 600_000 }));
  const uploadUrl = await driver.presignUpload(key, data.mimeType, "PRIVATE", data.sizeBytes);
  return { direct: true as const, ticket, uploadUrl, headers: { "Content-Type": data.mimeType, "If-None-Match": "*" } };
}

export async function completeKycUpload(userId: string, sellerId: string, token: string) {
  let ticket: z.infer<typeof ticketSchema>;
  try { ticket = ticketSchema.parse(JSON.parse(decrypt(token))); }
  catch { throw new UploadError("This upload is invalid. Please choose the file again."); }
  if (ticket.userId !== userId || ticket.sellerId !== sellerId || ticket.expiresAt <= Date.now() || !ticket.key.startsWith(`kyc-document/${sellerId}/`)) {
    throw new UploadError("This upload has expired or belongs to another account. Please choose the file again.");
  }
  const existing = await db.fileAsset.findFirst({ where: { key: ticket.key, purpose: "KYC_DOCUMENT", visibility: "PRIVATE", uploadedById: userId } });
  if (existing) return existing.id;
  const bytes = await storage().get(ticket.key, "PRIVATE");
  if (!bytes || bytes.length !== ticket.sizeBytes) throw new UploadError("The document upload did not finish. Please try again.");
  if (!validImageContent(bytes, ticket.mimeType)) throw new UploadError("The document content does not match its file type.");
  const asset = await db.fileAsset.create({ data: { key: ticket.key, visibility: "PRIVATE", purpose: "KYC_DOCUMENT", fileName: ticket.fileName, mimeType: ticket.mimeType, sizeBytes: bytes.length, checksum: sha256(bytes.toString("base64")), uploadedById: userId, url: null } });
  return asset.id;
}
