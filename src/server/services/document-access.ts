import "server-only";

import type { Role } from "@/generated/prisma/enums";
import { db } from "@/server/db";
import { sellerCanReadReference } from "./jeweler-directory";

/** Resolve only the ownership relations needed for this viewer. */
export async function getDocumentAccess(viewer: { id: string; role: Role }, id: string) {
  const file = await db.fileAsset.findUnique({ where: { id } });
  if (!file) return null;
  if (viewer.role === "ADMIN") {
    const document = await db.kycDocument.findUnique({ where: { fileId: id }, select: { sellerId: true } });
    return { file, auditSellerId: document?.sellerId };
  }
  if (file.uploadedById === viewer.id) return { file, auditSellerId: undefined };
  if (viewer.role !== "SELLER") return null;
  const seller = await db.sellerProfile.findUnique({ where: { userId: viewer.id }, select: { id: true } });
  if (!seller) return null;
  const [document, certificate, reference] = await Promise.all([
    db.kycDocument.findUnique({ where: { fileId: id }, select: { sellerId: true } }),
    db.certificate.findUnique({ where: { fileId: id }, select: { product: { select: { sellerId: true } } } }),
    file.purpose === "CUSTOM_REQUEST_REFERENCE" ? sellerCanReadReference(seller.id, file.id) : false,
  ]);
  return document?.sellerId === seller.id || certificate?.product.sellerId === seller.id || reference
    ? { file, auditSellerId: undefined }
    : null;
}
