import type { FilePurpose, FileVisibility } from "./domain-enums";
import { REFERENCE_IMAGE_MAX_BYTES, REFERENCE_IMAGE_TYPES } from "./reference-images";

export const UPLOAD_RULES: Record<FilePurpose, { types: string[]; maxBytes: number; visibility: FileVisibility }> = {
  PRODUCT_MEDIA: { types: ["image/jpeg", "image/png", "image/webp", "image/avif"], maxBytes: 12 * 1024 * 1024, visibility: "PUBLIC" },
  STORE_BRANDING: { types: ["image/jpeg", "image/png", "image/webp"], maxBytes: 6 * 1024 * 1024, visibility: "PUBLIC" },
  REVIEW_MEDIA: { types: ["image/jpeg", "image/png", "image/webp"], maxBytes: 8 * 1024 * 1024, visibility: "PUBLIC" },
  CERTIFICATE: { types: ["image/jpeg", "image/png", "image/webp"], maxBytes: 12 * 1024 * 1024, visibility: "PRIVATE" },
  KYC_DOCUMENT: { types: ["image/jpeg", "image/png", "image/webp"], maxBytes: 12 * 1024 * 1024, visibility: "PRIVATE" },
  MESSAGE_ATTACHMENT: { types: ["image/jpeg", "image/png", "image/webp"], maxBytes: 8 * 1024 * 1024, visibility: "PRIVATE" },
  CUSTOM_REQUEST_REFERENCE: { types: REFERENCE_IMAGE_TYPES, maxBytes: REFERENCE_IMAGE_MAX_BYTES, visibility: "PRIVATE" },
  // Platform-generated invoices and shipping documents are not user uploads.
  GENERATED_DOCUMENT: { types: ["application/pdf"], maxBytes: 12 * 1024 * 1024, visibility: "PRIVATE" },
};

export function validImageContent(bytes: Buffer, mimeType: string): boolean {
  if (mimeType === "image/jpeg") return bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  if (mimeType === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mimeType === "image/webp") return bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  if (mimeType === "image/avif") return bytes.toString("ascii", 4, 8) === "ftyp" && /avif|avis/.test(bytes.toString("ascii", 8, 32));
  return false;
}
