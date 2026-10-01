// Human labels + badge tones for every workflow state shown in the UI.
import type {
  CertificateStatus,
  CustomRequestStatus,
  DisputePriority,
  DisputeReason,
  DisputeResolution,
  DisputeStatus,
  DocumentReviewStatus,
  KycDocumentType,
  FulfillmentStatus,
  OfferStatus,
  PaymentStatus,
  PayoutStatus,
  ProductStatus,
  ReturnStatus,
  ServiceStatus,
  UserStatus,
  VerificationStatus,
} from "@/generated/prisma/enums";

export type Tone = "neutral" | "sage" | "gold" | "success" | "warning" | "danger" | "info";

type StatusMap<T extends string> = Record<T, { label: string; tone: Tone }>;

export const FULFILLMENT_STATUS: StatusMap<FulfillmentStatus> = {
  PENDING: { label: "Order placed", tone: "neutral" },
  PROCESSING: { label: "Processing", tone: "info" },
  IN_PRODUCTION: { label: "In production", tone: "gold" },
  SHIPPED: { label: "Shipped", tone: "sage" },
  DELIVERED: { label: "Delivered", tone: "success" },
  CANCELLED: { label: "Cancelled", tone: "danger" },
  REFUNDED: { label: "Refunded", tone: "warning" },
};

/** Forward-only fulfilment workflow; a seller may also cancel before shipping. */
export const FULFILLMENT_FLOW: FulfillmentStatus[] = ["PENDING", "PROCESSING", "IN_PRODUCTION", "SHIPPED", "DELIVERED"];

export const VERIFICATION_STATUS: StatusMap<VerificationStatus> = {
  NOT_SUBMITTED: { label: "Not submitted", tone: "neutral" },
  PENDING: { label: "Pending review", tone: "warning" },
  APPROVED: { label: "Approved", tone: "success" },
  REJECTED: { label: "Rejected", tone: "danger" },
  SUSPENDED: { label: "Suspended", tone: "danger" },
};

export const PRODUCT_STATUS: StatusMap<ProductStatus> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  PENDING_REVIEW: { label: "In review", tone: "warning" },
  ACTIVE: { label: "Active", tone: "success" },
  SOLD: { label: "Sold", tone: "gold" },
  ARCHIVED: { label: "Archived", tone: "neutral" },
};

export const OFFER_STATUS: StatusMap<OfferStatus> = {
  PENDING: { label: "Awaiting jeweler", tone: "warning" },
  COUNTERED: { label: "Countered", tone: "gold" },
  ACCEPTED: { label: "Accepted", tone: "success" },
  DECLINED: { label: "Declined", tone: "danger" },
  WITHDRAWN: { label: "Withdrawn", tone: "neutral" },
  EXPIRED: { label: "Expired", tone: "neutral" },
  PURCHASED: { label: "Purchased", tone: "sage" },
};

export const DISPUTE_STATUS: StatusMap<DisputeStatus> = {
  OPEN: { label: "Open", tone: "warning" },
  AWAITING_SELLER: { label: "Awaiting jeweler", tone: "warning" },
  AWAITING_BUYER: { label: "Awaiting buyer", tone: "info" },
  UNDER_REVIEW: { label: "Under review", tone: "gold" },
  RESOLVED: { label: "Resolved", tone: "success" },
  CLOSED: { label: "Closed", tone: "neutral" },
};

export const RETURN_STATUS: StatusMap<ReturnStatus> = {
  REQUESTED: { label: "Requested", tone: "warning" },
  APPROVED: { label: "Approved", tone: "info" },
  LABEL_ISSUED: { label: "Label issued", tone: "sage" },
  IN_TRANSIT: { label: "In transit", tone: "sage" },
  RECEIVED: { label: "Received", tone: "info" },
  REFUNDED: { label: "Refunded", tone: "success" },
  REJECTED: { label: "Declined", tone: "danger" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
};

export const PAYMENT_STATUS: StatusMap<PaymentStatus> = {
  PENDING: { label: "Awaiting payment", tone: "warning" },
  REQUIRES_ACTION: { label: "Action required", tone: "warning" },
  SUCCEEDED: { label: "Paid", tone: "success" },
  FAILED: { label: "Failed", tone: "danger" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
  PARTIALLY_REFUNDED: { label: "Partially refunded", tone: "warning" },
  REFUNDED: { label: "Refunded", tone: "warning" },
};

export const PAYOUT_STATUS: StatusMap<PayoutStatus> = {
  PENDING: { label: "Held until inspection", tone: "warning" },
  ON_HOLD: { label: "On hold", tone: "danger" },
  RELEASED: { label: "Paid out", tone: "success" },
  REVERSED: { label: "Reversed", tone: "danger" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
};

export const CUSTOM_REQUEST_STATUS: StatusMap<CustomRequestStatus> = {
  OPEN: { label: "Awaiting quotes", tone: "warning" },
  QUOTED: { label: "Quote received", tone: "gold" },
  ACCEPTED: { label: "Quote accepted", tone: "success" },
  IN_PRODUCTION: { label: "In production", tone: "gold" },
  COMPLETED: { label: "Completed", tone: "success" },
  DECLINED: { label: "Declined", tone: "danger" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
};

export const SERVICE_STATUS: StatusMap<ServiceStatus> = {
  REQUESTED: { label: "Requested", tone: "warning" },
  APPROVED: { label: "Approved", tone: "info" },
  AWAITING_ITEM: { label: "Awaiting your piece", tone: "info" },
  RECEIVED: { label: "Received by jeweler", tone: "sage" },
  IN_PROGRESS: { label: "In the workshop", tone: "gold" },
  SHIPPED_BACK: { label: "Shipped back", tone: "sage" },
  COMPLETED: { label: "Completed", tone: "success" },
  DECLINED: { label: "Declined", tone: "danger" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
};

export const DISPUTE_PRIORITY: StatusMap<DisputePriority> = {
  LOW: { label: "Low", tone: "neutral" },
  NORMAL: { label: "Normal", tone: "neutral" },
  HIGH: { label: "High", tone: "warning" },
  URGENT: { label: "Urgent", tone: "danger" },
};

export const DISPUTE_REASONS: Record<DisputeReason, string> = {
  ITEM_NOT_RECEIVED: "Item not received",
  NOT_AS_DESCRIBED: "Not as described",
  AUTHENTICITY: "Authenticity concern",
  DAMAGED_IN_TRANSIT: "Damaged in transit",
  RETURN_REFUSED: "Return refused",
  REFUND_NOT_RECEIVED: "Refund not received",
  OTHER: "Other",
};

export const DISPUTE_RESOLUTIONS: Record<DisputeResolution, { label: string; hint: string }> = {
  FULL_REFUND: { label: "Full refund", hint: "Refund everything paid for this jeweler's part of the order. The jeweler's share and our commission are reversed." },
  PARTIAL_REFUND: { label: "Partial refund", hint: "Refund an agreed amount; the rest is released to the jeweler." },
  RETURN_AND_REFUND: { label: "Return & refund", hint: "Refund in full and ask the buyer to send the piece back to the jeweler's return address." },
  IN_FAVOR_OF_SELLER: { label: "In favour of jeweler", hint: "No refund. Held funds are released to the jeweler." },
  WITHDRAWN: { label: "Withdrawn by buyer", hint: "The buyer no longer wishes to pursue the case. Held funds are released." },
};

export const DOCUMENT_REVIEW_STATUS: StatusMap<DocumentReviewStatus> = {
  PENDING: { label: "To review", tone: "warning" },
  ACCEPTED: { label: "Accepted", tone: "success" },
  REJECTED: { label: "Rejected", tone: "danger" },
};

export const KYC_DOCUMENT_LABELS: Record<KycDocumentType, string> = {
  TAX_REGISTRATION: "Tax registration",
  BUSINESS_LICENSE: "Business licence",
  GOVERNMENT_ID: "Identity document",
  PROOF_OF_ADDRESS: "Proof of business address",
  BANK_STATEMENT: "Bank statement",
  OTHER: "Other document",
};

export const CERTIFICATE_STATUS: StatusMap<CertificateStatus> = {
  PENDING_REVIEW: { label: "To verify", tone: "warning" },
  VERIFIED: { label: "Verified", tone: "success" },
  REJECTED: { label: "Rejected", tone: "danger" },
};

export const USER_STATUS: StatusMap<UserStatus> = {
  ACTIVE: { label: "Active", tone: "success" },
  SUSPENDED: { label: "Suspended", tone: "danger" },
  DEACTIVATED: { label: "Deactivated", tone: "neutral" },
};
