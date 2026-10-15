ALTER TABLE "CustomRequest" ADD COLUMN IF NOT EXISTS "contactPhone" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CustomRequest" ADD COLUMN IF NOT EXISTS "contactWhatsapp" TEXT NOT NULL DEFAULT '';
CREATE TABLE IF NOT EXISTS "BusinessNameChange" (
  "id" TEXT PRIMARY KEY,
  "sellerId" TEXT NOT NULL REFERENCES "SellerProfile"("id") ON DELETE CASCADE,
  "previousName" TEXT NOT NULL,
  "requestedName" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING', 'APPROVED', 'REJECTED')),
  "reviewNotes" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS "BusinessNameChange_pending_seller" ON "BusinessNameChange" ("sellerId") WHERE "status" = 'PENDING';
