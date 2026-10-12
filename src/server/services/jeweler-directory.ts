import "server-only";
import { db, type Tx } from "@/server/db";
import { notify } from "./messaging";
import type { InquiryStatus } from "@/lib/jeweler-profile";

export type DirectorySettings = {
  sellerId: string; instagram: string; facebook: string; youtube: string;
  whatsapp: string; publicEmail: string; maps: string; isPaused: boolean;
};

export async function getDirectorySettings(sellerId: string, executor: Pick<Tx, "$queryRaw"> = db): Promise<DirectorySettings> {
  const rows = await executor.$queryRaw<DirectorySettings[]>`SELECT * FROM "JewelerDirectorySettings" WHERE "sellerId" = ${sellerId}`;
  return rows[0] ?? { sellerId, instagram: "", facebook: "", youtube: "", whatsapp: "", publicEmail: "", maps: "", isPaused: false };
}

export async function getPausedSellerIds(executor: Pick<Tx, "$queryRaw"> = db): Promise<string[]> {
  const rows = await executor.$queryRaw<{ sellerId: string }[]>`SELECT "sellerId" FROM "JewelerDirectorySettings" WHERE "isPaused" = TRUE`;
  return rows.map((r) => r.sellerId);
}

export async function inquiryStatusesForSeller(sellerId: string) {
  return db.$queryRaw<{ id: string; inquiryStatus: InquiryStatus; status: string }[]>`SELECT "id", "inquiryStatus", "status" FROM "CustomRequest" WHERE "sellerId" = ${sellerId}`;
}

export async function inquiryStatusesForBuyer(buyerId: string) {
  return db.$queryRaw<{ id: string; inquiryStatus: InquiryStatus }[]>`SELECT "id", "inquiryStatus" FROM "CustomRequest" WHERE "buyerId" = ${buyerId}`;
}

export async function setInquiryStatus(sellerId: string, requestId: string, status: InquiryStatus, executor: Pick<Tx, "$queryRaw"> = db) {
  const rows = await executor.$queryRaw<{ id: string }[]>`UPDATE "CustomRequest" SET "inquiryStatus" = ${status}, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${requestId} AND "sellerId" = ${sellerId} AND "status" <> 'CANCELLED' RETURNING "id"`;
  return rows.length > 0;
}

export async function cancelInquiry(buyerId: string, requestId: string, executor: Pick<Tx, "$queryRaw"> = db) {
  return executor.$queryRaw<{ id: string; sellerId: string | null }[]>`UPDATE "CustomRequest" SET "status" = 'CANCELLED', "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${requestId} AND "buyerId" = ${buyerId} AND "status" IN ('OPEN', 'QUOTED') AND "inquiryStatus" <> 'CLOSED' RETURNING "id", "sellerId"`;
}

export async function inquiryContacts(sellerId: string) {
  return db.$queryRaw<{ id: string; contactPhone: string; contactWhatsapp: string }[]>`SELECT "id", "contactPhone", "contactWhatsapp" FROM "CustomRequest" WHERE "sellerId" = ${sellerId}`;
}

export type NameChange = { id: string; sellerId: string; previousName: string; requestedName: string; reason: string; status: string; reviewNotes: string; createdAt: Date };
export async function nameChanges(sellerId: string) {
  return db.$queryRaw<NameChange[]>`SELECT * FROM "BusinessNameChange" WHERE "sellerId" = ${sellerId} ORDER BY "createdAt" DESC LIMIT 5`;
}

export async function applyNameReview(tx: Tx, adminId: string, d: { id: string; decision: "APPROVED" | "REJECTED"; notes: string }) {
      const rows = await tx.$queryRaw<NameChange[]>`UPDATE "BusinessNameChange" SET "status" = ${d.decision}, "reviewNotes" = ${d.notes}, "reviewedAt" = CURRENT_TIMESTAMP WHERE "id" = ${d.id} AND "status" = 'PENDING' RETURNING *`;
      const change = rows[0];
      if (!change) return null;
      const seller = await tx.sellerProfile.findUniqueOrThrow({ where: { id: change.sellerId } });
      if (d.decision === "APPROVED") {
        await tx.sellerProfile.update({ where: { id: seller.id }, data: { storeName: change.requestedName } });
        await tx.storeLocation.updateMany({ where: { sellerId: seller.id, name: change.previousName }, data: { name: change.requestedName } });
      }
      await tx.auditLog.create({ data: { actorId: adminId, action: "business_name.review", entityType: "SellerProfile", entityId: seller.id, metadata: { previousName: change.previousName, requestedName: change.requestedName, decision: d.decision, notes: d.notes } } });
      await notify(tx, seller.userId, "SYSTEM", `Business name change ${d.decision.toLowerCase()}`, d.notes || change.requestedName, "/seller/settings");
      return seller.slug;
}

export async function sellerCanReadReference(sellerId: string, fileId: string, executor: Pick<Tx, "customRequest"> = db) {
  return !!await executor.customRequest.findFirst({ where: { sellerId, referenceImageUrls: { has: `/api/files/${fileId}` } }, select: { id: true } });
}
