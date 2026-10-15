// Application-owned row and relation types for the Neon data layer.

import type { ActorType, AddressType, AnalyticsEventType, BusinessType, Carrier, CertificateLab, CertificateStatus, ClarityGrade, ConditionGrade, ConversationType, CustomRequestStatus, CutGrade, DisputePriority, DisputeReason, DisputeResolution, DisputeStatus, DocumentReviewStatus, DutiesMode, EngravingStyle, FilePurpose, FileVisibility, FulfillmentStatus, Gemstone, IntegrationProvider, IntegrationStatus, KycDocumentType, LedgerEntryType, MakingChargeType, MediaType, MetalColor, MetalType, NotificationType, OfferAction, OfferStatus, OrderStatus, PaymentProvider, PaymentStatus, PayoutMethod, PayoutStatus, PricingMode, ProductCondition, ProductStatus, QuoteStatus, RefundStatus, ReservationStatus, ReturnReason, ReturnStatus, ReviewStatus, Role, ServiceStatus, ServiceType, ShipmentDirection, ShipmentStatus, ShippingMethod, ShippingRegion, ShippingZone, SizingMode, SpotMetal, StoneShape, SubscriptionInterval, SubscriptionStatus, SyncDirection, SyncEventStatus, UserStatus, VerificationStatus } from "@/lib/domain-enums";
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface User {
  id: string;
  email: string;
  emailVerified: Date | null;
  passwordHash: string | null;
  name: string | null;
  image: string | null;
  phone: string | null;
  role: Role;
  status: UserStatus;
  preferredCurrency: string;
  country: string | null;
  stripeCustomerId: string | null;
  marketingOptIn: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Account {
  id: string;
  userId: string;
  type: string;
  provider: string;
  providerAccountId: string;
  refresh_token: string | null;
  access_token: string | null;
  expires_at: number | null;
  token_type: string | null;
  scope: string | null;
  id_token: string | null;
  session_state: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VerificationToken {
  identifier: string;
  token: string;
  expires: Date;
}

export interface Address {
  id: string;
  userId: string | null;
  type: AddressType;
  label: string | null;
  fullName: string;
  company: string | null;
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postalCode: string;
  country: string;
  phone: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentMethod {
  id: string;
  userId: string;
  provider: PaymentProvider;
  providerPaymentMethodId: string;
  type: string;
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
  billingName: string | null;
  isDefault: boolean;
  createdAt: Date;
}

export interface SellerProfile {
  id: string;
  userId: string;
  storeName: string;
  slug: string;
  tagline: string | null;
  bio: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  country: string;
  city: string | null;
  defaultCurrency: string;
  foundedYear: number | null;
  specialties: string[];
  returnAddressId: string | null;
  legalBusinessName: string | null;
  businessType: BusinessType | null;
  registrationNumber: string | null;
  taxIdEncrypted: string | null;
  taxIdLast4: string | null;
  website: string | null;
  payoutMethod: PayoutMethod | null;
  stripeAccountId: string | null;
  stripeChargesEnabled: boolean;
  stripePayoutsEnabled: boolean;
  stripeDetailsSubmitted: boolean;
  bankAccountHolder: string | null;
  bankName: string | null;
  bankCountry: string | null;
  bankAccountEncrypted: string | null;
  bankAccountLast4: string | null;
  bankRoutingEncrypted: string | null;
  payoutCurrency: string | null;
  onboardingStep: number;
  verificationStatus: VerificationStatus;
  submittedAt: Date | null;
  approvedAt: Date | null;
  suspendedAt: Date | null;
  suspensionReason: string | null;
  isFeatured: boolean;
  isTopRated: boolean;
  ratingAverage: number;
  ratingCount: number;
  salesCount: number;
  activeListingCount: number;
  responseTimeMinutes: number | null;
  responseRate: number | null;
  commissionRateBps: number | null;
  returnWindowDays: number;
  handlingDays: number;
  acceptsCustomOrders: boolean;
  acceptsOffers: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface JewelerDirectorySettings {
  sellerId: string;
  instagram: string;
  facebook: string;
  youtube: string;
  whatsapp: string;
  publicEmail: string;
  maps: string;
  isPaused: boolean;
  updatedAt: Date;
}

export interface StoreLocation {
  id: string;
  sellerId: string;
  name: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postalCode: string | null;
  country: string;
  phone: string | null;
  hours: string | null;
  latitude: number | null;
  longitude: number | null;
  appointmentOnly: boolean;
}

export interface KycSubmission {
  id: string;
  sellerId: string;
  status: VerificationStatus;
  snapshot: JsonValue;
  submittedAt: Date;
  reviewedAt: Date | null;
  reviewerId: string | null;
  reviewerNotes: string | null;
  internalNotes: string | null;
  riskScore: number | null;
}

export interface KycDocument {
  id: string;
  sellerId: string;
  submissionId: string | null;
  type: KycDocumentType;
  fileId: string;
  status: DocumentReviewStatus;
  rejectionReason: string | null;
  expiresAt: Date | null;
  createdAt: Date;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  position: number;
  isActive: boolean;
}

export interface Product {
  id: string;
  sellerId: string;
  categoryId: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  description: string;
  status: ProductStatus;
  condition: ProductCondition;
  conditionGrade: ConditionGrade | null;
  conditionNotes: string | null;
  era: string | null;
  isHandcrafted: boolean;
  isOneOfAKind: boolean;
  isMadeToOrder: boolean;
  productionDays: number;
  primaryMetal: MetalType;
  metalColor: MetalColor | null;
  primaryGemstone: Gemstone;
  totalCaratWeight: number | null;
  stoneShape: StoneShape | null;
  widthMm: number | null;
  heightMm: number | null;
  depthMm: number | null;
  weightGrams: number | null;
  currency: string;
  basePriceMinor: bigint;
  compareAtPriceMinor: bigint | null;
  normalizedPriceUsd: bigint;
  pricingMode: PricingMode;
  acceptsOffers: boolean;
  offerFloorMinor: bigint | null;
  sizingMode: SizingMode;
  ringSizeMin: number | null;
  ringSizeMax: number | null;
  resizingFeeMinor: bigint | null;
  engravingEnabled: boolean;
  engravingMaxChars: number | null;
  engravingFeeMinor: bigint | null;
  shipsFromCountry: string;
  shipsTo: ShippingRegion[];
  returnWindowDays: number | null;
  warrantyMonths: number;
  hsCode: string;
  tags: string[];
  isFeatured: boolean;
  featuredRank: number | null;
  viewCount: number;
  salesCount: number;
  wishlistCount: number;
  ratingAverage: number;
  ratingCount: number;
  inStock: boolean;
  certificationLabs: CertificateLab[];
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductImage {
  id: string;
  productId: string;
  variantId: string | null;
  url: string;
  alt: string | null;
  position: number;
  width: number | null;
  height: number | null;
  type: MediaType;
  angle: string | null;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sellerId: string;
  sku: string;
  title: string;
  metalType: MetalType;
  metalColor: MetalColor | null;
  gemstone: Gemstone | null;
  caratWeight: number | null;
  stoneQuality: string | null;
  ringSize: number | null;
  chainLengthMm: number | null;
  priceMinor: bigint;
  compareAtPriceMinor: bigint | null;
  metalWeightGrams: number | null;
  makingChargeType: MakingChargeType | null;
  makingChargeValue: number | null;
  stonePriceMinor: bigint | null;
  priceComputedAt: Date | null;
  stockQuantity: number;
  lowStockThreshold: number;
  trackInventory: boolean;
  allowBackorder: boolean;
  isDefault: boolean;
  isActive: boolean;
  position: number;
  barcode: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Certificate {
  id: string;
  productId: string;
  variantId: string | null;
  lab: CertificateLab;
  reportNumber: string;
  issuedAt: Date | null;
  gemstone: Gemstone | null;
  shape: StoneShape | null;
  caratWeight: number | null;
  colorGrade: string | null;
  clarityGrade: ClarityGrade | null;
  cutGrade: CutGrade | null;
  polish: CutGrade | null;
  symmetry: CutGrade | null;
  fluorescence: string | null;
  measurements: string | null;
  origin: string | null;
  hallmarkPurity: string | null;
  assayOffice: string | null;
  fileId: string | null;
  pdfUrl: string | null;
  verifyUrl: string | null;
  status: CertificateStatus;
  verifiedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MetalRate {
  id: string;
  metal: SpotMetal;
  currency: string;
  pricePerGram: number;
  source: string;
  fetchedAt: Date;
}

export interface ExchangeRate {
  id: string;
  base: string;
  quote: string;
  rate: number;
  source: string;
  fetchedAt: Date;
}

export interface Cart {
  id: string;
  userId: string | null;
  guestToken: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  variantId: string;
  quantity: number;
  ringSize: number | null;
  chainLengthMm: number | null;
  engravingText: string | null;
  engravingStyle: EngravingStyle | null;
  offerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryReservation {
  id: string;
  variantId: string;
  orderId: string | null;
  quantity: number;
  status: ReservationStatus;
  expiresAt: Date;
  createdAt: Date;
}

export interface Order {
  id: string;
  orderNumber: string;
  buyerId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  currency: string;
  subtotalMinor: bigint;
  shippingMinor: bigint;
  insuranceMinor: bigint;
  taxMinor: bigint;
  dutiesMinor: bigint;
  discountMinor: bigint;
  totalMinor: bigint;
  platformFeeMinor: bigint;
  email: string;
  shippingAddress: JsonValue;
  billingAddress: JsonValue;
  taxProvider: string | null;
  taxCalculationRef: string | null;
  dutiesMode: DutiesMode | null;
  transferGroup: string | null;
  fxSnapshot: JsonValue | null;
  notes: string | null;
  placedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SellerOrder {
  id: string;
  orderId: string;
  sellerId: string;
  reference: string;
  status: FulfillmentStatus;
  currency: string;
  subtotalMinor: bigint;
  shippingMinor: bigint;
  insuranceMinor: bigint;
  taxMinor: bigint;
  dutiesMinor: bigint;
  totalMinor: bigint;
  commissionRateBps: number;
  commissionMinor: bigint;
  sellerNetMinor: bigint;
  shippingMethod: ShippingMethod;
  signatureRequired: boolean;
  insured: boolean;
  declaredValueMinor: bigint;
  estimatedDeliveryFrom: Date | null;
  estimatedDeliveryTo: Date | null;
  buyerNote: string | null;
  sellerNote: string | null;
  processingAt: Date | null;
  productionStartedAt: Date | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  cancelledAt: Date | null;
  refundedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderStatusEvent {
  id: string;
  sellerOrderId: string;
  status: FulfillmentStatus;
  note: string | null;
  actorType: ActorType;
  actorId: string | null;
  createdAt: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  sellerOrderId: string;
  productId: string | null;
  variantId: string | null;
  offerId: string | null;
  title: string;
  variantTitle: string | null;
  sku: string;
  imageUrl: string | null;
  metalType: MetalType | null;
  quantity: number;
  unitPriceMinor: bigint;
  listPriceMinor: bigint;
  listCurrency: string;
  engravingFeeMinor: bigint;
  totalMinor: bigint;
  ringSize: number | null;
  chainLengthMm: number | null;
  engravingText: string | null;
  engravingStyle: EngravingStyle | null;
  pricingSnapshot: JsonValue | null;
  certificateSnapshot: JsonValue | null;
  createdAt: Date;
}

export interface Payment {
  id: string;
  orderId: string;
  provider: PaymentProvider;
  providerRef: string | null;
  chargeId: string | null;
  status: PaymentStatus;
  amountMinor: bigint;
  currency: string;
  methodSummary: string | null;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Refund {
  id: string;
  orderId: string;
  sellerOrderId: string | null;
  disputeId: string | null;
  returnRequestId: string | null;
  amountMinor: bigint;
  currency: string;
  reason: string;
  status: RefundStatus;
  initiatedBy: ActorType;
  initiatedById: string | null;
  providerRefundId: string | null;
  reverseTransfer: boolean;
  isForced: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payout {
  id: string;
  sellerId: string;
  sellerOrderId: string;
  amountMinor: bigint;
  currency: string;
  status: PayoutStatus;
  releaseAfter: Date | null;
  providerTransferId: string | null;
  releasedAt: Date | null;
  holdReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShippingRate {
  id: string;
  sellerId: string;
  zone: ShippingZone;
  method: ShippingMethod;
  carrier: Carrier | null;
  priceMinor: bigint;
  currency: string;
  freeOverMinor: bigint | null;
  minDays: number;
  maxDays: number;
  insuranceRateBps: number;
  isActive: boolean;
}

export interface Shipment {
  id: string;
  sellerOrderId: string | null;
  returnRequestId: string | null;
  serviceRequestId: string | null;
  direction: ShipmentDirection;
  carrier: Carrier;
  service: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  labelUrl: string | null;
  status: ShipmentStatus;
  fromAddress: JsonValue;
  toAddress: JsonValue;
  insuredValueMinor: bigint | null;
  currency: string | null;
  signatureRequired: boolean;
  weightGrams: number | null;
  costMinor: bigint | null;
  providerShipmentId: string | null;
  estimatedDeliveryAt: Date | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShipmentEvent {
  id: string;
  shipmentId: string;
  status: ShipmentStatus;
  description: string;
  location: string | null;
  occurredAt: Date;
  createdAt: Date;
}

export interface ReturnRequest {
  id: string;
  rmaNumber: string;
  sellerOrderId: string;
  buyerId: string;
  sellerId: string;
  reason: ReturnReason;
  details: string | null;
  photoUrls: string[];
  status: ReturnStatus;
  returnToAddress: JsonValue | null;
  refundAmountMinor: bigint | null;
  restockingFeeMinor: bigint;
  sellerResponse: string | null;
  approvedAt: Date | null;
  receivedAt: Date | null;
  refundedAt: Date | null;
  rejectedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReturnItem {
  id: string;
  returnRequestId: string;
  orderItemId: string;
  quantity: number;
}

export interface Review {
  id: string;
  productId: string;
  sellerId: string;
  authorId: string;
  orderItemId: string | null;
  rating: number;
  title: string | null;
  body: string;
  photoUrls: string[];
  status: ReviewStatus;
  isVerifiedPurchase: boolean;
  sellerReply: string | null;
  sellerRepliedAt: Date | null;
  helpfulCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Dispute {
  id: string;
  caseNumber: string;
  orderId: string;
  sellerOrderId: string;
  sellerId: string;
  openedById: string;
  assignedAdminId: string | null;
  returnRequestId: string | null;
  reason: DisputeReason;
  description: string;
  evidenceUrls: string[];
  status: DisputeStatus;
  priority: DisputePriority;
  claimAmountMinor: bigint;
  currency: string;
  resolution: DisputeResolution | null;
  resolutionNotes: string | null;
  internalNotes: string | null;
  refundAmountMinor: bigint | null;
  sellerResponseDueAt: Date | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Offer {
  id: string;
  productId: string;
  variantId: string | null;
  buyerId: string;
  sellerId: string;
  status: OfferStatus;
  currency: string;
  listPriceMinor: bigint;
  currentAmountMinor: bigint;
  acceptedAmountMinor: bigint | null;
  lastActor: ActorType;
  expiresAt: Date;
  acceptedAt: Date | null;
  purchaseDeadline: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OfferEvent {
  id: string;
  offerId: string;
  actor: ActorType;
  actorId: string | null;
  action: OfferAction;
  amountMinor: bigint | null;
  message: string | null;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  subject: string | null;
  sellerId: string | null;
  productId: string | null;
  sellerOrderId: string | null;
  offerId: string | null;
  customRequestId: string | null;
  disputeId: string | null;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationParticipant {
  id: string;
  conversationId: string;
  userId: string;
  role: Role;
  lastReadAt: Date | null;
  joinedAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string | null;
  body: string;
  attachments: JsonValue | null;
  isSystem: boolean;
  createdAt: Date;
}

export interface WishlistItem {
  id: string;
  userId: string;
  productId: string;
  variantId: string | null;
  notifyOnPriceDrop: boolean;
  createdAt: Date;
}

export interface FavoriteStore {
  id: string;
  userId: string;
  sellerId: string;
  createdAt: Date;
}

export interface CustomRequest {
  id: string;
  reference: string;
  buyerId: string;
  sellerId: string | null;
  categoryId: string | null;
  title: string;
  description: string;
  budgetMinMinor: bigint | null;
  budgetMaxMinor: bigint | null;
  currency: string;
  metalPreference: MetalType | null;
  gemstonePreference: Gemstone | null;
  ringSize: number | null;
  neededBy: Date | null;
  referenceImageUrls: string[];
  status: CustomRequestStatus;
  inquiryStatus: string;
  contactPhone: string;
  contactWhatsapp: string;
  acceptedQuoteId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomRequestQuote {
  id: string;
  customRequestId: string;
  sellerId: string;
  amountMinor: bigint;
  currency: string;
  depositPercent: number;
  leadTimeDays: number;
  message: string;
  status: QuoteStatus;
  validUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Warranty {
  id: string;
  warrantyNumber: string;
  orderItemId: string;
  buyerId: string;
  sellerId: string;
  coverage: string;
  startsAt: Date;
  endsAt: Date;
  isTransferable: boolean;
  createdAt: Date;
}

export interface ServiceRequest {
  id: string;
  ticketNumber: string;
  buyerId: string;
  sellerId: string;
  orderItemId: string | null;
  warrantyId: string | null;
  type: ServiceType;
  description: string;
  photoUrls: string[];
  status: ServiceStatus;
  coveredByWarranty: boolean;
  quoteMinor: bigint | null;
  currency: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceEvent {
  id: string;
  serviceRequestId: string;
  status: ServiceStatus;
  note: string | null;
  actorType: ActorType;
  createdAt: Date;
}

export interface PlatformSettings {
  id: string;
  defaultCommissionBps: number;
  listingFeeMinor: bigint;
  listingFeeCurrency: string;
  signatureThresholdUsd: bigint;
  secureCourierThresholdUsd: bigint;
  inspectionWindowDays: number;
  offerExpiryHours: number;
  minOfferBps: number;
  reservationMinutes: number;
  requiredKycDocuments: KycDocumentType[];
  updatedAt: Date;
  updatedById: string | null;
}

export interface CommissionRule {
  id: string;
  name: string;
  categoryId: string | null;
  sellerId: string | null;
  rateBps: number;
  priority: number;
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceMinor: bigint;
  currency: string;
  interval: SubscriptionInterval;
  commissionDiscountBps: number;
  featuredSlots: number;
  homepagePlacement: boolean;
  listingFeeWaived: boolean;
  features: string[];
  stripePriceId: string | null;
  isActive: boolean;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SellerSubscription {
  id: string;
  sellerId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LedgerEntry {
  id: string;
  type: LedgerEntryType;
  amountMinor: bigint;
  currency: string;
  amountUsdMinor: bigint;
  sellerId: string | null;
  orderId: string | null;
  sellerOrderId: string | null;
  reference: string | null;
  description: string | null;
  occurredAt: Date;
}

export interface InventoryIntegration {
  id: string;
  sellerId: string;
  provider: IntegrationProvider;
  name: string;
  status: IntegrationStatus;
  shopDomain: string | null;
  externalLocationId: string | null;
  apiKeyPrefix: string | null;
  apiKeyHash: string | null;
  webhookSecretEncrypted: string | null;
  accessTokenEncrypted: string | null;
  lastSyncedAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExternalSkuMapping {
  id: string;
  integrationId: string;
  variantId: string;
  externalId: string;
  externalSku: string | null;
  lastQuantity: number | null;
  lastSyncedAt: Date | null;
}

export interface InventorySyncEvent {
  id: string;
  integrationId: string;
  direction: SyncDirection;
  externalEventId: string | null;
  topic: string;
  status: SyncEventStatus;
  payload: JsonValue;
  error: string | null;
  processedAt: Date | null;
  createdAt: Date;
}

export interface FileAsset {
  id: string;
  key: string;
  visibility: FileVisibility;
  purpose: FilePurpose;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string | null;
  url: string | null;
  uploadedById: string | null;
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string | null;
  href: string | null;
  readAt: Date | null;
  createdAt: Date;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  source: string | null;
  createdAt: Date;
  unsubscribedAt: Date | null;
}

export interface AnalyticsEvent {
  id: bigint;
  type: AnalyticsEventType;
  sessionId: string | null;
  userId: string | null;
  sellerId: string | null;
  productId: string | null;
  path: string | null;
  referrer: string | null;
  country: string | null;
  metadata: JsonValue | null;
  createdAt: Date;
}

export interface AuditLog {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: JsonValue | null;
  ipAddress: string | null;
  createdAt: Date;
}

export interface BusinessNameChange {
  id: string;
  sellerId: string;
  previousName: string;
  requestedName: string;
  reason: string;
  status: string;
  reviewNotes: string;
  createdAt: Date;
  reviewedAt: Date | null;
}

export interface JewelryVisibility {
  productId: string;
  showOnProfile: boolean;
  showOnWebsite: boolean;
  updatedAt: Date;
}

export interface JewelerReview {
  id: string;
  sellerId: string;
  authorId: string;
  rating: number;
  body: string;
  sellerReply: string;
  reportedReason: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DatabaseModels {
  User: User;
  Account: Account;
  VerificationToken: VerificationToken;
  Address: Address;
  PaymentMethod: PaymentMethod;
  SellerProfile: SellerProfile;
  JewelerDirectorySettings: JewelerDirectorySettings;
  StoreLocation: StoreLocation;
  KycSubmission: KycSubmission;
  KycDocument: KycDocument;
  Category: Category;
  Product: Product;
  ProductImage: ProductImage;
  ProductVariant: ProductVariant;
  Certificate: Certificate;
  MetalRate: MetalRate;
  ExchangeRate: ExchangeRate;
  Cart: Cart;
  CartItem: CartItem;
  InventoryReservation: InventoryReservation;
  Order: Order;
  SellerOrder: SellerOrder;
  OrderStatusEvent: OrderStatusEvent;
  OrderItem: OrderItem;
  Payment: Payment;
  Refund: Refund;
  Payout: Payout;
  ShippingRate: ShippingRate;
  Shipment: Shipment;
  ShipmentEvent: ShipmentEvent;
  ReturnRequest: ReturnRequest;
  ReturnItem: ReturnItem;
  Review: Review;
  Dispute: Dispute;
  Offer: Offer;
  OfferEvent: OfferEvent;
  Conversation: Conversation;
  ConversationParticipant: ConversationParticipant;
  Message: Message;
  WishlistItem: WishlistItem;
  FavoriteStore: FavoriteStore;
  CustomRequest: CustomRequest;
  CustomRequestQuote: CustomRequestQuote;
  Warranty: Warranty;
  ServiceRequest: ServiceRequest;
  ServiceEvent: ServiceEvent;
  PlatformSettings: PlatformSettings;
  CommissionRule: CommissionRule;
  SubscriptionPlan: SubscriptionPlan;
  SellerSubscription: SellerSubscription;
  LedgerEntry: LedgerEntry;
  InventoryIntegration: InventoryIntegration;
  ExternalSkuMapping: ExternalSkuMapping;
  InventorySyncEvent: InventorySyncEvent;
  FileAsset: FileAsset;
  Notification: Notification;
  NewsletterSubscriber: NewsletterSubscriber;
  AnalyticsEvent: AnalyticsEvent;
  AuditLog: AuditLog;
  BusinessNameChange: BusinessNameChange;
  JewelryVisibility: JewelryVisibility;
  JewelerReview: JewelerReview;
}

export interface DatabaseRelations {
  User: {
    accounts: Account[];
    sellerProfile: SellerProfile | null;
    addresses: Address[];
    paymentMethods: PaymentMethod[];
    cart: Cart | null;
    orders: Order[];
    reviews: Review[];
    wishlistItems: WishlistItem[];
    favoriteStores: FavoriteStore[];
    offers: Offer[];
    customRequests: CustomRequest[];
    warranties: Warranty[];
    serviceRequests: ServiceRequest[];
    returnRequests: ReturnRequest[];
    disputesOpened: Dispute[];
    disputesAssigned: Dispute[];
    participations: ConversationParticipant[];
    messages: Message[];
    notifications: Notification[];
    kycReviews: KycSubmission[];
    auditLogs: AuditLog[];
    files: FileAsset[];
  };
  Account: {
    user: User;
  };
  VerificationToken: {
  };
  Address: {
    user: User | null;
    sellerReturnFor: SellerProfile | null;
  };
  PaymentMethod: {
    user: User;
  };
  SellerProfile: {
    user: User;
    returnAddress: Address | null;
    locations: StoreLocation[];
    nameChanges: BusinessNameChange[];
    directorySettings: JewelerDirectorySettings | null;
    products: Product[];
    sellerOrders: SellerOrder[];
    kycSubmissions: KycSubmission[];
    kycDocuments: KycDocument[];
    shippingRates: ShippingRate[];
    offers: Offer[];
    reviews: Review[];
    favoritedBy: FavoriteStore[];
    customRequests: CustomRequest[];
    quotes: CustomRequestQuote[];
    integrations: InventoryIntegration[];
    payouts: Payout[];
    subscription: SellerSubscription | null;
    ledgerEntries: LedgerEntry[];
    disputes: Dispute[];
    returnRequests: ReturnRequest[];
    warranties: Warranty[];
    serviceRequests: ServiceRequest[];
    conversations: Conversation[];
    commissionRules: CommissionRule[];
  };
  JewelerDirectorySettings: {
    seller: SellerProfile;
  };
  StoreLocation: {
    seller: SellerProfile;
  };
  KycSubmission: {
    seller: SellerProfile;
    reviewer: User | null;
    documents: KycDocument[];
  };
  KycDocument: {
    seller: SellerProfile;
    submission: KycSubmission | null;
    file: FileAsset;
  };
  Category: {
    parent: Category | null;
    children: Category[];
    products: Product[];
    customRequests: CustomRequest[];
    commissionRules: CommissionRule[];
  };
  Product: {
    seller: SellerProfile;
    category: Category;
    images: ProductImage[];
    variants: ProductVariant[];
    certificates: Certificate[];
    reviews: Review[];
    wishlistItems: WishlistItem[];
    offers: Offer[];
    orderItems: OrderItem[];
    cartItems: CartItem[];
    conversations: Conversation[];
  };
  ProductImage: {
    product: Product;
    variant: ProductVariant | null;
  };
  ProductVariant: {
    product: Product;
    images: ProductImage[];
    certificates: Certificate[];
    cartItems: CartItem[];
    orderItems: OrderItem[];
    offers: Offer[];
    wishlistItems: WishlistItem[];
    reservations: InventoryReservation[];
    externalMappings: ExternalSkuMapping[];
  };
  Certificate: {
    product: Product;
    variant: ProductVariant | null;
    file: FileAsset | null;
  };
  MetalRate: {
  };
  ExchangeRate: {
  };
  Cart: {
    user: User | null;
    items: CartItem[];
  };
  CartItem: {
    cart: Cart;
    product: Product;
    variant: ProductVariant;
    offer: Offer | null;
  };
  InventoryReservation: {
    variant: ProductVariant;
    order: Order | null;
  };
  Order: {
    buyer: User;
    sellerOrders: SellerOrder[];
    items: OrderItem[];
    payments: Payment[];
    refunds: Refund[];
    reservations: InventoryReservation[];
    disputes: Dispute[];
  };
  SellerOrder: {
    order: Order;
    seller: SellerProfile;
    items: OrderItem[];
    shipments: Shipment[];
    statusEvents: OrderStatusEvent[];
    returnRequests: ReturnRequest[];
    disputes: Dispute[];
    refunds: Refund[];
    payout: Payout | null;
    conversations: Conversation[];
  };
  OrderStatusEvent: {
    sellerOrder: SellerOrder;
  };
  OrderItem: {
    order: Order;
    sellerOrder: SellerOrder;
    product: Product | null;
    variant: ProductVariant | null;
    offer: Offer | null;
    review: Review | null;
    warranty: Warranty | null;
    returnItems: ReturnItem[];
    serviceRequests: ServiceRequest[];
  };
  Payment: {
    order: Order;
  };
  Refund: {
    order: Order;
    sellerOrder: SellerOrder | null;
    dispute: Dispute | null;
    returnRequest: ReturnRequest | null;
  };
  Payout: {
    seller: SellerProfile;
    sellerOrder: SellerOrder;
  };
  ShippingRate: {
    seller: SellerProfile;
  };
  Shipment: {
    sellerOrder: SellerOrder | null;
    returnRequest: ReturnRequest | null;
    serviceRequest: ServiceRequest | null;
    events: ShipmentEvent[];
  };
  ShipmentEvent: {
    shipment: Shipment;
  };
  ReturnRequest: {
    sellerOrder: SellerOrder;
    buyer: User;
    seller: SellerProfile;
    items: ReturnItem[];
    shipment: Shipment | null;
    refunds: Refund[];
    dispute: Dispute | null;
  };
  ReturnItem: {
    returnRequest: ReturnRequest;
    orderItem: OrderItem;
  };
  Review: {
    product: Product;
    seller: SellerProfile;
    author: User;
    orderItem: OrderItem | null;
  };
  Dispute: {
    order: Order;
    sellerOrder: SellerOrder;
    seller: SellerProfile;
    openedBy: User;
    assignedAdmin: User | null;
    returnRequest: ReturnRequest | null;
    refunds: Refund[];
    conversation: Conversation | null;
  };
  Offer: {
    product: Product;
    variant: ProductVariant | null;
    buyer: User;
    seller: SellerProfile;
    events: OfferEvent[];
    cartItem: CartItem | null;
    orderItem: OrderItem | null;
    conversation: Conversation | null;
  };
  OfferEvent: {
    offer: Offer;
  };
  Conversation: {
    seller: SellerProfile | null;
    product: Product | null;
    sellerOrder: SellerOrder | null;
    offer: Offer | null;
    customRequest: CustomRequest | null;
    dispute: Dispute | null;
    participants: ConversationParticipant[];
    messages: Message[];
  };
  ConversationParticipant: {
    conversation: Conversation;
    user: User;
  };
  Message: {
    conversation: Conversation;
    sender: User | null;
  };
  WishlistItem: {
    user: User;
    product: Product;
    variant: ProductVariant | null;
  };
  FavoriteStore: {
    user: User;
    seller: SellerProfile;
  };
  CustomRequest: {
    buyer: User;
    seller: SellerProfile | null;
    category: Category | null;
    quotes: CustomRequestQuote[];
    acceptedQuote: CustomRequestQuote | null;
    conversations: Conversation[];
  };
  CustomRequestQuote: {
    customRequest: CustomRequest;
    seller: SellerProfile;
    acceptedFor: CustomRequest | null;
  };
  Warranty: {
    orderItem: OrderItem;
    buyer: User;
    seller: SellerProfile;
    serviceRequests: ServiceRequest[];
  };
  ServiceRequest: {
    buyer: User;
    seller: SellerProfile;
    orderItem: OrderItem | null;
    warranty: Warranty | null;
    events: ServiceEvent[];
    shipments: Shipment[];
  };
  ServiceEvent: {
    serviceRequest: ServiceRequest;
  };
  PlatformSettings: {
  };
  CommissionRule: {
    category: Category | null;
    seller: SellerProfile | null;
  };
  SubscriptionPlan: {
    subscriptions: SellerSubscription[];
  };
  SellerSubscription: {
    seller: SellerProfile;
    plan: SubscriptionPlan;
  };
  LedgerEntry: {
    seller: SellerProfile | null;
  };
  InventoryIntegration: {
    seller: SellerProfile;
    mappings: ExternalSkuMapping[];
    events: InventorySyncEvent[];
  };
  ExternalSkuMapping: {
    integration: InventoryIntegration;
    variant: ProductVariant;
  };
  InventorySyncEvent: {
    integration: InventoryIntegration;
  };
  FileAsset: {
    uploadedBy: User | null;
    kycDocument: KycDocument | null;
    certificate: Certificate | null;
  };
  Notification: {
    user: User;
  };
  NewsletterSubscriber: {
  };
  AnalyticsEvent: {
  };
  AuditLog: {
    actor: User | null;
  };
  BusinessNameChange: {
    seller: SellerProfile;
  };
  JewelryVisibility: {
  };
  JewelerReview: {
  };
}
