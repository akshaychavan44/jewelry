import type { VerificationStatus } from "@/lib/domain-enums";

// PENDING is set only after the completed application is submitted.
export const LISTED_JEWELER_STATUSES: VerificationStatus[] = ["PENDING", "APPROVED"];
export const listedJewelerWhere = { verificationStatus: { in: LISTED_JEWELER_STATUSES } };

export function isListedJeweler(status: VerificationStatus): boolean {
  return LISTED_JEWELER_STATUSES.includes(status);
}
