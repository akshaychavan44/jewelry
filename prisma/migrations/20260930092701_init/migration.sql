-- CreateEnum
CREATE TYPE "Role" AS ENUM ('BUYER', 'SELLER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('BUYER', 'SELLER', 'ADMIN', 'SYSTEM');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('INDIVIDUAL', 'SOLE_PROPRIETOR', 'PARTNERSHIP', 'COMPANY');

-- CreateEnum
CREATE TYPE "KycDocumentType" AS ENUM ('TAX_REGISTRATION', 'BUSINESS_LICENSE', 'GOVERNMENT_ID', 'PROOF_OF_ADDRESS', 'BANK_STATEMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentReviewStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PayoutMethod" AS ENUM ('STRIPE_CONNECT', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "AddressType" AS ENUM ('SHIPPING', 'BILLING', 'RETURN', 'BUSINESS');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'SOLD', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProductCondition" AS ENUM ('NEW', 'PRE_OWNED', 'VINTAGE', 'ANTIQUE');

-- CreateEnum
CREATE TYPE "ConditionGrade" AS ENUM ('MINT', 'EXCELLENT', 'VERY_GOOD', 'GOOD', 'FAIR');

-- CreateEnum
CREATE TYPE "MetalType" AS ENUM ('GOLD_9K', 'GOLD_14K', 'GOLD_18K', 'GOLD_22K', 'GOLD_24K', 'PLATINUM', 'PALLADIUM', 'STERLING_SILVER', 'FINE_SILVER', 'TITANIUM', 'MIXED_METALS', 'OTHER');

-- CreateEnum
CREATE TYPE "MetalColor" AS ENUM ('YELLOW', 'WHITE', 'ROSE', 'TWO_TONE', 'NATURAL');

-- CreateEnum
CREATE TYPE "Gemstone" AS ENUM ('NONE', 'DIAMOND', 'LAB_GROWN_DIAMOND', 'SAPPHIRE', 'RUBY', 'EMERALD', 'PEARL', 'MOISSANITE', 'TANZANITE', 'AQUAMARINE', 'MORGANITE', 'OPAL', 'AMETHYST', 'TOPAZ', 'TOURMALINE', 'SPINEL', 'GARNET', 'CITRINE', 'PERIDOT', 'ONYX', 'TURQUOISE', 'JADE', 'OTHER');

-- CreateEnum
CREATE TYPE "StoneShape" AS ENUM ('ROUND', 'OVAL', 'CUSHION', 'PRINCESS', 'EMERALD', 'PEAR', 'MARQUISE', 'RADIANT', 'ASSCHER', 'HEART', 'BAGUETTE', 'CABOCHON', 'ROSE_CUT', 'OLD_EUROPEAN', 'OTHER');

-- CreateEnum
CREATE TYPE "ClarityGrade" AS ENUM ('FL', 'IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1', 'SI2', 'I1', 'I2', 'I3');

-- CreateEnum
CREATE TYPE "CutGrade" AS ENUM ('EXCELLENT', 'VERY_GOOD', 'GOOD', 'FAIR', 'POOR');

-- CreateEnum
CREATE TYPE "CertificateLab" AS ENUM ('GIA', 'IGI', 'HRD', 'AGS', 'GCAL', 'SSEF', 'GUBELIN', 'AGL', 'BIS_HALLMARK', 'ASSAY_OFFICE', 'OTHER');

-- CreateEnum
CREATE TYPE "CertificateStatus" AS ENUM ('PENDING_REVIEW', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PricingMode" AS ENUM ('FIXED', 'METAL_SPOT');

-- CreateEnum
CREATE TYPE "MakingChargeType" AS ENUM ('FLAT', 'PERCENT', 'PER_GRAM');

-- CreateEnum
CREATE TYPE "SpotMetal" AS ENUM ('GOLD', 'SILVER', 'PLATINUM', 'PALLADIUM');

-- CreateEnum
CREATE TYPE "SizingMode" AS ENUM ('NONE', 'VARIANT', 'MADE_TO_SIZE');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "EngravingStyle" AS ENUM ('SCRIPT', 'SERIF', 'BLOCK');

-- CreateEnum
CREATE TYPE "ShippingRegion" AS ENUM ('NORTH_AMERICA', 'LATIN_AMERICA', 'UNITED_KINGDOM', 'EUROPE', 'MIDDLE_EAST', 'AFRICA', 'INDIA', 'ASIA_PACIFIC');

-- CreateEnum
CREATE TYPE "ShippingZone" AS ENUM ('DOMESTIC', 'NORTH_AMERICA', 'LATIN_AMERICA', 'UNITED_KINGDOM', 'EUROPE', 'MIDDLE_EAST', 'AFRICA', 'INDIA', 'ASIA_PACIFIC');

-- CreateEnum
CREATE TYPE "ShippingMethod" AS ENUM ('STANDARD_INSURED', 'EXPRESS_INSURED', 'SECURE_COURIER', 'STORE_PICKUP');

-- CreateEnum
CREATE TYPE "Carrier" AS ENUM ('FEDEX', 'UPS', 'DHL', 'USPS', 'ROYAL_MAIL', 'BLUE_DART', 'BRINKS', 'MALCA_AMIT', 'OTHER');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('ACTIVE', 'COMMITTED', 'RELEASED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT', 'PLACED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'REQUIRES_ACTION', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'PARTIALLY_REFUNDED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'DEMO');

-- CreateEnum
CREATE TYPE "DutiesMode" AS ENUM ('DDP', 'DAP');

-- CreateEnum
CREATE TYPE "FulfillmentStatus" AS ENUM ('PENDING', 'PROCESSING', 'IN_PRODUCTION', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'ON_HOLD', 'RELEASED', 'REVERSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ShipmentDirection" AS ENUM ('OUTBOUND', 'RETURN', 'SERVICE');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('LABEL_CREATED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'EXCEPTION', 'RETURNED_TO_SENDER');

-- CreateEnum
CREATE TYPE "ReturnReason" AS ENUM ('NOT_AS_DESCRIBED', 'DAMAGED', 'WRONG_SIZE', 'CHANGED_MIND', 'AUTHENTICITY_CONCERN', 'ARRIVED_LATE', 'OTHER');

-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('REQUESTED', 'APPROVED', 'LABEL_ISSUED', 'IN_TRANSIT', 'RECEIVED', 'REFUNDED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "DisputeReason" AS ENUM ('ITEM_NOT_RECEIVED', 'NOT_AS_DESCRIBED', 'AUTHENTICITY', 'DAMAGED_IN_TRANSIT', 'RETURN_REFUSED', 'REFUND_NOT_RECEIVED', 'OTHER');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'AWAITING_SELLER', 'AWAITING_BUYER', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "DisputePriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "DisputeResolution" AS ENUM ('FULL_REFUND', 'PARTIAL_REFUND', 'RETURN_AND_REFUND', 'IN_FAVOR_OF_SELLER', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'COUNTERED', 'ACCEPTED', 'DECLINED', 'WITHDRAWN', 'EXPIRED', 'PURCHASED');

-- CreateEnum
CREATE TYPE "OfferAction" AS ENUM ('OFFER', 'COUNTER', 'ACCEPT', 'DECLINE', 'WITHDRAW', 'EXPIRE', 'PURCHASE');

-- CreateEnum
CREATE TYPE "ConversationType" AS ENUM ('PRODUCT_INQUIRY', 'ORDER', 'OFFER', 'CUSTOM_REQUEST', 'DISPUTE', 'SUPPORT');

-- CreateEnum
CREATE TYPE "CustomRequestStatus" AS ENUM ('OPEN', 'QUOTED', 'ACCEPTED', 'IN_PRODUCTION', 'COMPLETED', 'DECLINED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('REPAIR', 'RESIZING', 'CLEANING_POLISHING', 'RHODIUM_PLATING', 'STONE_TIGHTENING', 'RESTRINGING', 'APPRAISAL', 'ENGRAVING', 'OTHER');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('REQUESTED', 'APPROVED', 'AWAITING_ITEM', 'RECEIVED', 'IN_PROGRESS', 'SHIPPED_BACK', 'COMPLETED', 'DECLINED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PUBLISHED', 'PENDING', 'HIDDEN');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ORDER', 'OFFER', 'MESSAGE', 'REVIEW', 'KYC', 'DISPUTE', 'RETURN', 'PAYOUT', 'CUSTOM_REQUEST', 'SERVICE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('SHOPIFY', 'SQUARE', 'CUSTOM_API');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ERROR', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "SyncDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "SyncEventStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'FAILED', 'IGNORED');

-- CreateEnum
CREATE TYPE "SubscriptionInterval" AS ENUM ('MONTH', 'YEAR');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('SALE', 'COMMISSION', 'TAX_COLLECTED', 'DUTIES_COLLECTED', 'LISTING_FEE', 'SUBSCRIPTION_FEE', 'REFUND', 'COMMISSION_REVERSAL', 'PAYOUT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "AnalyticsEventType" AS ENUM ('PAGE_VIEW', 'PRODUCT_VIEW', 'STORE_VIEW', 'SEARCH', 'ADD_TO_CART', 'CHECKOUT_STARTED', 'ORDER_PLACED');

-- CreateEnum
CREATE TYPE "FileVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "FilePurpose" AS ENUM ('PRODUCT_MEDIA', 'CERTIFICATE', 'KYC_DOCUMENT', 'STORE_BRANDING', 'REVIEW_MEDIA', 'MESSAGE_ATTACHMENT', 'CUSTOM_REQUEST_REFERENCE', 'GENERATED_DOCUMENT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "passwordHash" TEXT,
    "name" TEXT,
    "image" TEXT,
    "phone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'BUYER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "preferredCurrency" CHAR(3) NOT NULL DEFAULT 'USD',
    "country" CHAR(2),
    "stripeCustomerId" TEXT,
    "marketingOptIn" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" "AddressType" NOT NULL DEFAULT 'SHIPPING',
    "label" TEXT,
    "fullName" TEXT NOT NULL,
    "company" TEXT,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT NOT NULL,
    "region" TEXT,
    "postalCode" TEXT NOT NULL,
    "country" CHAR(2) NOT NULL,
    "phone" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'STRIPE',
    "providerPaymentMethodId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'card',
    "brand" TEXT,
    "last4" TEXT,
    "expMonth" INTEGER,
    "expYear" INTEGER,
    "billingName" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tagline" TEXT,
    "bio" TEXT,
    "logoUrl" TEXT,
    "bannerUrl" TEXT,
    "country" CHAR(2) NOT NULL,
    "city" TEXT,
    "defaultCurrency" CHAR(3) NOT NULL DEFAULT 'USD',
    "foundedYear" INTEGER,
    "specialties" TEXT[],
    "returnAddressId" TEXT,
    "legalBusinessName" TEXT,
    "businessType" "BusinessType",
    "registrationNumber" TEXT,
    "taxIdEncrypted" TEXT,
    "taxIdLast4" TEXT,
    "website" TEXT,
    "payoutMethod" "PayoutMethod",
    "stripeAccountId" TEXT,
    "stripeChargesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "stripePayoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "stripeDetailsSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "bankAccountHolder" TEXT,
    "bankName" TEXT,
    "bankCountry" CHAR(2),
    "bankAccountEncrypted" TEXT,
    "bankAccountLast4" TEXT,
    "bankRoutingEncrypted" TEXT,
    "payoutCurrency" CHAR(3),
    "onboardingStep" INTEGER NOT NULL DEFAULT 1,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "suspensionReason" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isTopRated" BOOLEAN NOT NULL DEFAULT false,
    "ratingAverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "salesCount" INTEGER NOT NULL DEFAULT 0,
    "activeListingCount" INTEGER NOT NULL DEFAULT 0,
    "responseTimeMinutes" INTEGER,
    "responseRate" INTEGER,
    "commissionRateBps" INTEGER,
    "returnWindowDays" INTEGER NOT NULL DEFAULT 30,
    "handlingDays" INTEGER NOT NULL DEFAULT 2,
    "acceptsCustomOrders" BOOLEAN NOT NULL DEFAULT true,
    "acceptsOffers" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreLocation" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT NOT NULL,
    "region" TEXT,
    "postalCode" TEXT,
    "country" CHAR(2) NOT NULL,
    "phone" TEXT,
    "hours" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "appointmentOnly" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "StoreLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KycSubmission" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "snapshot" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewerId" TEXT,
    "reviewerNotes" TEXT,
    "internalNotes" TEXT,
    "riskScore" INTEGER,

    CONSTRAINT "KycSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KycDocument" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "submissionId" TEXT,
    "type" "KycDocumentType" NOT NULL,
    "fileId" TEXT NOT NULL,
    "status" "DocumentReviewStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KycDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "parentId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shortDescription" TEXT,
    "description" TEXT NOT NULL,
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "condition" "ProductCondition" NOT NULL DEFAULT 'NEW',
    "conditionGrade" "ConditionGrade",
    "conditionNotes" TEXT,
    "era" TEXT,
    "isHandcrafted" BOOLEAN NOT NULL DEFAULT true,
    "isOneOfAKind" BOOLEAN NOT NULL DEFAULT false,
    "isMadeToOrder" BOOLEAN NOT NULL DEFAULT false,
    "productionDays" INTEGER NOT NULL DEFAULT 0,
    "primaryMetal" "MetalType" NOT NULL,
    "metalColor" "MetalColor",
    "primaryGemstone" "Gemstone" NOT NULL DEFAULT 'NONE',
    "totalCaratWeight" DOUBLE PRECISION,
    "stoneShape" "StoneShape",
    "widthMm" DOUBLE PRECISION,
    "heightMm" DOUBLE PRECISION,
    "depthMm" DOUBLE PRECISION,
    "weightGrams" DOUBLE PRECISION,
    "currency" CHAR(3) NOT NULL,
    "basePriceMinor" BIGINT NOT NULL,
    "compareAtPriceMinor" BIGINT,
    "normalizedPriceUsd" BIGINT NOT NULL,
    "pricingMode" "PricingMode" NOT NULL DEFAULT 'FIXED',
    "acceptsOffers" BOOLEAN NOT NULL DEFAULT false,
    "offerFloorMinor" BIGINT,
    "sizingMode" "SizingMode" NOT NULL DEFAULT 'NONE',
    "ringSizeMin" DOUBLE PRECISION,
    "ringSizeMax" DOUBLE PRECISION,
    "resizingFeeMinor" BIGINT,
    "engravingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "engravingMaxChars" INTEGER,
    "engravingFeeMinor" BIGINT,
    "shipsFromCountry" CHAR(2) NOT NULL,
    "shipsTo" "ShippingRegion"[],
    "returnWindowDays" INTEGER,
    "warrantyMonths" INTEGER NOT NULL DEFAULT 12,
    "hsCode" TEXT NOT NULL DEFAULT '7113',
    "tags" TEXT[],
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "featuredRank" INTEGER,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "salesCount" INTEGER NOT NULL DEFAULT 0,
    "wishlistCount" INTEGER NOT NULL DEFAULT 0,
    "ratingAverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "certificationLabs" "CertificateLab"[],
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "publishedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "width" INTEGER,
    "height" INTEGER,
    "type" "MediaType" NOT NULL DEFAULT 'IMAGE',
    "angle" TEXT,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "metalType" "MetalType" NOT NULL,
    "metalColor" "MetalColor",
    "gemstone" "Gemstone",
    "caratWeight" DOUBLE PRECISION,
    "stoneQuality" TEXT,
    "ringSize" DOUBLE PRECISION,
    "chainLengthMm" INTEGER,
    "priceMinor" BIGINT NOT NULL,
    "compareAtPriceMinor" BIGINT,
    "metalWeightGrams" DOUBLE PRECISION,
    "makingChargeType" "MakingChargeType",
    "makingChargeValue" DOUBLE PRECISION,
    "stonePriceMinor" BIGINT,
    "priceComputedAt" TIMESTAMP(3),
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 1,
    "trackInventory" BOOLEAN NOT NULL DEFAULT true,
    "allowBackorder" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "barcode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "lab" "CertificateLab" NOT NULL,
    "reportNumber" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3),
    "gemstone" "Gemstone",
    "shape" "StoneShape",
    "caratWeight" DOUBLE PRECISION,
    "colorGrade" TEXT,
    "clarityGrade" "ClarityGrade",
    "cutGrade" "CutGrade",
    "polish" "CutGrade",
    "symmetry" "CutGrade",
    "fluorescence" TEXT,
    "measurements" TEXT,
    "origin" TEXT,
    "hallmarkPurity" TEXT,
    "assayOffice" TEXT,
    "fileId" TEXT,
    "pdfUrl" TEXT,
    "verifyUrl" TEXT,
    "status" "CertificateStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "verifiedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetalRate" (
    "id" TEXT NOT NULL,
    "metal" "SpotMetal" NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "pricePerGram" DECIMAL(14,4) NOT NULL,
    "source" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetalRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "base" CHAR(3) NOT NULL,
    "quote" CHAR(3) NOT NULL,
    "rate" DECIMAL(18,8) NOT NULL,
    "source" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cart" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "guestToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "ringSize" DOUBLE PRECISION,
    "chainLengthMm" INTEGER,
    "engravingText" TEXT,
    "engravingStyle" "EngravingStyle",
    "offerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryReservation" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "orderId" TEXT,
    "quantity" INTEGER NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "currency" CHAR(3) NOT NULL,
    "subtotalMinor" BIGINT NOT NULL,
    "shippingMinor" BIGINT NOT NULL,
    "insuranceMinor" BIGINT NOT NULL DEFAULT 0,
    "taxMinor" BIGINT NOT NULL,
    "dutiesMinor" BIGINT NOT NULL DEFAULT 0,
    "discountMinor" BIGINT NOT NULL DEFAULT 0,
    "totalMinor" BIGINT NOT NULL,
    "platformFeeMinor" BIGINT NOT NULL,
    "email" TEXT NOT NULL,
    "shippingAddress" JSONB NOT NULL,
    "billingAddress" JSONB NOT NULL,
    "taxProvider" TEXT,
    "taxCalculationRef" TEXT,
    "dutiesMode" "DutiesMode",
    "transferGroup" TEXT,
    "fxSnapshot" JSONB,
    "notes" TEXT,
    "placedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerOrder" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "FulfillmentStatus" NOT NULL DEFAULT 'PENDING',
    "currency" CHAR(3) NOT NULL,
    "subtotalMinor" BIGINT NOT NULL,
    "shippingMinor" BIGINT NOT NULL,
    "insuranceMinor" BIGINT NOT NULL DEFAULT 0,
    "taxMinor" BIGINT NOT NULL,
    "dutiesMinor" BIGINT NOT NULL DEFAULT 0,
    "totalMinor" BIGINT NOT NULL,
    "commissionRateBps" INTEGER NOT NULL,
    "commissionMinor" BIGINT NOT NULL,
    "sellerNetMinor" BIGINT NOT NULL,
    "shippingMethod" "ShippingMethod" NOT NULL,
    "signatureRequired" BOOLEAN NOT NULL DEFAULT true,
    "insured" BOOLEAN NOT NULL DEFAULT true,
    "declaredValueMinor" BIGINT NOT NULL,
    "estimatedDeliveryFrom" TIMESTAMP(3),
    "estimatedDeliveryTo" TIMESTAMP(3),
    "buyerNote" TEXT,
    "sellerNote" TEXT,
    "processingAt" TIMESTAMP(3),
    "productionStartedAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderStatusEvent" (
    "id" TEXT NOT NULL,
    "sellerOrderId" TEXT NOT NULL,
    "status" "FulfillmentStatus" NOT NULL,
    "note" TEXT,
    "actorType" "ActorType" NOT NULL,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "sellerOrderId" TEXT NOT NULL,
    "productId" TEXT,
    "variantId" TEXT,
    "offerId" TEXT,
    "title" TEXT NOT NULL,
    "variantTitle" TEXT,
    "sku" TEXT NOT NULL,
    "imageUrl" TEXT,
    "metalType" "MetalType",
    "quantity" INTEGER NOT NULL,
    "unitPriceMinor" BIGINT NOT NULL,
    "listPriceMinor" BIGINT NOT NULL,
    "listCurrency" CHAR(3) NOT NULL,
    "engravingFeeMinor" BIGINT NOT NULL DEFAULT 0,
    "totalMinor" BIGINT NOT NULL,
    "ringSize" DOUBLE PRECISION,
    "chainLengthMm" INTEGER,
    "engravingText" TEXT,
    "engravingStyle" "EngravingStyle",
    "pricingSnapshot" JSONB,
    "certificateSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "providerRef" TEXT,
    "chargeId" TEXT,
    "status" "PaymentStatus" NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "methodSummary" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "sellerOrderId" TEXT,
    "disputeId" TEXT,
    "returnRequestId" TEXT,
    "amountMinor" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "initiatedBy" "ActorType" NOT NULL,
    "initiatedById" TEXT,
    "providerRefundId" TEXT,
    "reverseTransfer" BOOLEAN NOT NULL DEFAULT true,
    "isForced" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "sellerOrderId" TEXT NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "releaseAfter" TIMESTAMP(3),
    "providerTransferId" TEXT,
    "releasedAt" TIMESTAMP(3),
    "holdReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingRate" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "zone" "ShippingZone" NOT NULL,
    "method" "ShippingMethod" NOT NULL,
    "carrier" "Carrier",
    "priceMinor" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "freeOverMinor" BIGINT,
    "minDays" INTEGER NOT NULL,
    "maxDays" INTEGER NOT NULL,
    "insuranceRateBps" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ShippingRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "sellerOrderId" TEXT,
    "returnRequestId" TEXT,
    "serviceRequestId" TEXT,
    "direction" "ShipmentDirection" NOT NULL DEFAULT 'OUTBOUND',
    "carrier" "Carrier" NOT NULL,
    "service" TEXT,
    "trackingNumber" TEXT,
    "trackingUrl" TEXT,
    "labelUrl" TEXT,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'LABEL_CREATED',
    "fromAddress" JSONB NOT NULL,
    "toAddress" JSONB NOT NULL,
    "insuredValueMinor" BIGINT,
    "currency" CHAR(3),
    "signatureRequired" BOOLEAN NOT NULL DEFAULT true,
    "weightGrams" INTEGER,
    "costMinor" BIGINT,
    "providerShipmentId" TEXT,
    "estimatedDeliveryAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentEvent" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShipmentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnRequest" (
    "id" TEXT NOT NULL,
    "rmaNumber" TEXT NOT NULL,
    "sellerOrderId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "reason" "ReturnReason" NOT NULL,
    "details" TEXT,
    "photoUrls" TEXT[],
    "status" "ReturnStatus" NOT NULL DEFAULT 'REQUESTED',
    "returnToAddress" JSONB,
    "refundAmountMinor" BIGINT,
    "restockingFeeMinor" BIGINT NOT NULL DEFAULT 0,
    "sellerResponse" TEXT,
    "approvedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReturnRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnItem" (
    "id" TEXT NOT NULL,
    "returnRequestId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "ReturnItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "orderItemId" TEXT,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "photoUrls" TEXT[],
    "status" "ReviewStatus" NOT NULL DEFAULT 'PUBLISHED',
    "isVerifiedPurchase" BOOLEAN NOT NULL DEFAULT false,
    "sellerReply" TEXT,
    "sellerRepliedAt" TIMESTAMP(3),
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "caseNumber" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "sellerOrderId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "openedById" TEXT NOT NULL,
    "assignedAdminId" TEXT,
    "returnRequestId" TEXT,
    "reason" "DisputeReason" NOT NULL,
    "description" TEXT NOT NULL,
    "evidenceUrls" TEXT[],
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "DisputePriority" NOT NULL DEFAULT 'NORMAL',
    "claimAmountMinor" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "resolution" "DisputeResolution",
    "resolutionNotes" TEXT,
    "internalNotes" TEXT,
    "refundAmountMinor" BIGINT,
    "sellerResponseDueAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
    "currency" CHAR(3) NOT NULL,
    "listPriceMinor" BIGINT NOT NULL,
    "currentAmountMinor" BIGINT NOT NULL,
    "acceptedAmountMinor" BIGINT,
    "lastActor" "ActorType" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "purchaseDeadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferEvent" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "actor" "ActorType" NOT NULL,
    "actorId" TEXT,
    "action" "OfferAction" NOT NULL,
    "amountMinor" BIGINT,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "type" "ConversationType" NOT NULL,
    "subject" TEXT,
    "sellerId" TEXT,
    "productId" TEXT,
    "sellerOrderId" TEXT,
    "offerId" TEXT,
    "customRequestId" TEXT,
    "disputeId" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationParticipant" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "lastReadAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT,
    "body" TEXT NOT NULL,
    "attachments" JSONB,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WishlistItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "notifyOnPriceDrop" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FavoriteStore" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteStore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomRequest" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT,
    "categoryId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "budgetMinMinor" BIGINT,
    "budgetMaxMinor" BIGINT,
    "currency" CHAR(3) NOT NULL,
    "metalPreference" "MetalType",
    "gemstonePreference" "Gemstone",
    "ringSize" DOUBLE PRECISION,
    "neededBy" TIMESTAMP(3),
    "referenceImageUrls" TEXT[],
    "status" "CustomRequestStatus" NOT NULL DEFAULT 'OPEN',
    "acceptedQuoteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomRequestQuote" (
    "id" TEXT NOT NULL,
    "customRequestId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "depositPercent" INTEGER NOT NULL DEFAULT 0,
    "leadTimeDays" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'PENDING',
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomRequestQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warranty" (
    "id" TEXT NOT NULL,
    "warrantyNumber" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "coverage" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "isTransferable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Warranty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRequest" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "orderItemId" TEXT,
    "warrantyId" TEXT,
    "type" "ServiceType" NOT NULL,
    "description" TEXT NOT NULL,
    "photoUrls" TEXT[],
    "status" "ServiceStatus" NOT NULL DEFAULT 'REQUESTED',
    "coveredByWarranty" BOOLEAN NOT NULL DEFAULT false,
    "quoteMinor" BIGINT,
    "currency" CHAR(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceEvent" (
    "id" TEXT NOT NULL,
    "serviceRequestId" TEXT NOT NULL,
    "status" "ServiceStatus" NOT NULL,
    "note" TEXT,
    "actorType" "ActorType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSettings" (
    "id" TEXT NOT NULL DEFAULT 'platform',
    "defaultCommissionBps" INTEGER NOT NULL DEFAULT 1200,
    "listingFeeMinor" BIGINT NOT NULL DEFAULT 0,
    "listingFeeCurrency" CHAR(3) NOT NULL DEFAULT 'USD',
    "signatureThresholdUsd" BIGINT NOT NULL DEFAULT 50000,
    "secureCourierThresholdUsd" BIGINT NOT NULL DEFAULT 2500000,
    "inspectionWindowDays" INTEGER NOT NULL DEFAULT 3,
    "offerExpiryHours" INTEGER NOT NULL DEFAULT 48,
    "minOfferBps" INTEGER NOT NULL DEFAULT 5000,
    "reservationMinutes" INTEGER NOT NULL DEFAULT 15,
    "requiredKycDocuments" "KycDocumentType"[],
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT,
    "sellerId" TEXT,
    "rateBps" INTEGER NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceMinor" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "interval" "SubscriptionInterval" NOT NULL DEFAULT 'MONTH',
    "commissionDiscountBps" INTEGER NOT NULL DEFAULT 0,
    "featuredSlots" INTEGER NOT NULL DEFAULT 0,
    "homepagePlacement" BOOLEAN NOT NULL DEFAULT false,
    "listingFeeWaived" BOOLEAN NOT NULL DEFAULT false,
    "features" TEXT[],
    "stripePriceId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerSubscription" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "stripeSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "type" "LedgerEntryType" NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "amountUsdMinor" BIGINT NOT NULL,
    "sellerId" TEXT,
    "orderId" TEXT,
    "sellerOrderId" TEXT,
    "reference" TEXT,
    "description" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryIntegration" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "name" TEXT NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'ACTIVE',
    "shopDomain" TEXT,
    "externalLocationId" TEXT,
    "apiKeyPrefix" TEXT,
    "apiKeyHash" TEXT,
    "webhookSecretEncrypted" TEXT,
    "accessTokenEncrypted" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalSkuMapping" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "externalSku" TEXT,
    "lastQuantity" INTEGER,
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "ExternalSkuMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventorySyncEvent" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "direction" "SyncDirection" NOT NULL,
    "externalEventId" TEXT,
    "topic" TEXT NOT NULL,
    "status" "SyncEventStatus" NOT NULL,
    "payload" JSONB NOT NULL,
    "error" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventorySyncEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileAsset" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "visibility" "FileVisibility" NOT NULL,
    "purpose" "FilePurpose" NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "checksum" TEXT,
    "url" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "href" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribedAt" TIMESTAMP(3),

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" BIGSERIAL NOT NULL,
    "type" "AnalyticsEventType" NOT NULL,
    "sessionId" TEXT,
    "userId" TEXT,
    "sellerId" TEXT,
    "productId" TEXT,
    "path" TEXT,
    "referrer" TEXT,
    "country" CHAR(2),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "Address_userId_type_idx" ON "Address"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_providerPaymentMethodId_key" ON "PaymentMethod"("providerPaymentMethodId");

-- CreateIndex
CREATE INDEX "PaymentMethod_userId_idx" ON "PaymentMethod"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SellerProfile_userId_key" ON "SellerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SellerProfile_slug_key" ON "SellerProfile"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SellerProfile_returnAddressId_key" ON "SellerProfile"("returnAddressId");

-- CreateIndex
CREATE UNIQUE INDEX "SellerProfile_stripeAccountId_key" ON "SellerProfile"("stripeAccountId");

-- CreateIndex
CREATE INDEX "SellerProfile_verificationStatus_submittedAt_idx" ON "SellerProfile"("verificationStatus", "submittedAt");

-- CreateIndex
CREATE INDEX "SellerProfile_country_idx" ON "SellerProfile"("country");

-- CreateIndex
CREATE INDEX "SellerProfile_isFeatured_ratingAverage_idx" ON "SellerProfile"("isFeatured", "ratingAverage");

-- CreateIndex
CREATE INDEX "StoreLocation_sellerId_idx" ON "StoreLocation"("sellerId");

-- CreateIndex
CREATE INDEX "StoreLocation_country_city_idx" ON "StoreLocation"("country", "city");

-- CreateIndex
CREATE INDEX "KycSubmission_status_submittedAt_idx" ON "KycSubmission"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "KycSubmission_sellerId_idx" ON "KycSubmission"("sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "KycDocument_fileId_key" ON "KycDocument"("fileId");

-- CreateIndex
CREATE INDEX "KycDocument_sellerId_type_idx" ON "KycDocument"("sellerId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_parentId_position_idx" ON "Category"("parentId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_status_categoryId_normalizedPriceUsd_idx" ON "Product"("status", "categoryId", "normalizedPriceUsd");

-- CreateIndex
CREATE INDEX "Product_status_publishedAt_idx" ON "Product"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "Product_status_primaryMetal_idx" ON "Product"("status", "primaryMetal");

-- CreateIndex
CREATE INDEX "Product_status_primaryGemstone_idx" ON "Product"("status", "primaryGemstone");

-- CreateIndex
CREATE INDEX "Product_status_isFeatured_featuredRank_idx" ON "Product"("status", "isFeatured", "featuredRank");

-- CreateIndex
CREATE INDEX "Product_sellerId_status_idx" ON "Product"("sellerId", "status");

-- CreateIndex
CREATE INDEX "ProductImage_productId_position_idx" ON "ProductImage"("productId", "position");

-- CreateIndex
CREATE INDEX "ProductVariant_productId_isActive_position_idx" ON "ProductVariant"("productId", "isActive", "position");

-- CreateIndex
CREATE INDEX "ProductVariant_metalType_idx" ON "ProductVariant"("metalType");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_sellerId_sku_key" ON "ProductVariant"("sellerId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_fileId_key" ON "Certificate"("fileId");

-- CreateIndex
CREATE INDEX "Certificate_productId_idx" ON "Certificate"("productId");

-- CreateIndex
CREATE INDEX "Certificate_variantId_idx" ON "Certificate"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_lab_reportNumber_key" ON "Certificate"("lab", "reportNumber");

-- CreateIndex
CREATE INDEX "MetalRate_metal_currency_fetchedAt_idx" ON "MetalRate"("metal", "currency", "fetchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRate_base_quote_key" ON "ExchangeRate"("base", "quote");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_userId_key" ON "Cart"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_guestToken_key" ON "Cart"("guestToken");

-- CreateIndex
CREATE INDEX "Cart_updatedAt_idx" ON "Cart"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_offerId_key" ON "CartItem"("offerId");

-- CreateIndex
CREATE INDEX "CartItem_cartId_idx" ON "CartItem"("cartId");

-- CreateIndex
CREATE INDEX "InventoryReservation_variantId_status_expiresAt_idx" ON "InventoryReservation"("variantId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "InventoryReservation_orderId_idx" ON "InventoryReservation"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Order_transferGroup_key" ON "Order"("transferGroup");

-- CreateIndex
CREATE INDEX "Order_buyerId_createdAt_idx" ON "Order"("buyerId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Order_paymentStatus_idx" ON "Order"("paymentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "SellerOrder_reference_key" ON "SellerOrder"("reference");

-- CreateIndex
CREATE INDEX "SellerOrder_sellerId_status_createdAt_idx" ON "SellerOrder"("sellerId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "SellerOrder_orderId_idx" ON "SellerOrder"("orderId");

-- CreateIndex
CREATE INDEX "OrderStatusEvent_sellerOrderId_createdAt_idx" ON "OrderStatusEvent"("sellerOrderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrderItem_offerId_key" ON "OrderItem"("offerId");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_sellerOrderId_idx" ON "OrderItem"("sellerOrderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerRef_key" ON "Payment"("providerRef");

-- CreateIndex
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_providerRefundId_key" ON "Refund"("providerRefundId");

-- CreateIndex
CREATE INDEX "Refund_orderId_idx" ON "Refund"("orderId");

-- CreateIndex
CREATE INDEX "Refund_sellerOrderId_idx" ON "Refund"("sellerOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_sellerOrderId_key" ON "Payout"("sellerOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_providerTransferId_key" ON "Payout"("providerTransferId");

-- CreateIndex
CREATE INDEX "Payout_sellerId_status_idx" ON "Payout"("sellerId", "status");

-- CreateIndex
CREATE INDEX "Payout_status_releaseAfter_idx" ON "Payout"("status", "releaseAfter");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingRate_sellerId_zone_method_key" ON "ShippingRate"("sellerId", "zone", "method");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_returnRequestId_key" ON "Shipment"("returnRequestId");

-- CreateIndex
CREATE INDEX "Shipment_sellerOrderId_idx" ON "Shipment"("sellerOrderId");

-- CreateIndex
CREATE INDEX "Shipment_trackingNumber_idx" ON "Shipment"("trackingNumber");

-- CreateIndex
CREATE INDEX "ShipmentEvent_shipmentId_occurredAt_idx" ON "ShipmentEvent"("shipmentId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnRequest_rmaNumber_key" ON "ReturnRequest"("rmaNumber");

-- CreateIndex
CREATE INDEX "ReturnRequest_sellerId_status_idx" ON "ReturnRequest"("sellerId", "status");

-- CreateIndex
CREATE INDEX "ReturnRequest_buyerId_createdAt_idx" ON "ReturnRequest"("buyerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnItem_returnRequestId_orderItemId_key" ON "ReturnItem"("returnRequestId", "orderItemId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_orderItemId_key" ON "Review"("orderItemId");

-- CreateIndex
CREATE INDEX "Review_productId_status_createdAt_idx" ON "Review"("productId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Review_sellerId_status_createdAt_idx" ON "Review"("sellerId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Review_authorId_idx" ON "Review"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "Dispute_caseNumber_key" ON "Dispute"("caseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Dispute_returnRequestId_key" ON "Dispute"("returnRequestId");

-- CreateIndex
CREATE INDEX "Dispute_status_priority_createdAt_idx" ON "Dispute"("status", "priority", "createdAt");

-- CreateIndex
CREATE INDEX "Dispute_sellerId_status_idx" ON "Dispute"("sellerId", "status");

-- CreateIndex
CREATE INDEX "Dispute_openedById_idx" ON "Dispute"("openedById");

-- CreateIndex
CREATE INDEX "Offer_buyerId_status_idx" ON "Offer"("buyerId", "status");

-- CreateIndex
CREATE INDEX "Offer_sellerId_status_updatedAt_idx" ON "Offer"("sellerId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "Offer_productId_idx" ON "Offer"("productId");

-- CreateIndex
CREATE INDEX "Offer_status_expiresAt_idx" ON "Offer"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "OfferEvent_offerId_createdAt_idx" ON "OfferEvent"("offerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_offerId_key" ON "Conversation"("offerId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_disputeId_key" ON "Conversation"("disputeId");

-- CreateIndex
CREATE INDEX "Conversation_sellerId_lastMessageAt_idx" ON "Conversation"("sellerId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "Conversation_productId_idx" ON "Conversation"("productId");

-- CreateIndex
CREATE INDEX "ConversationParticipant_userId_idx" ON "ConversationParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationParticipant_conversationId_userId_key" ON "ConversationParticipant"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "WishlistItem_productId_idx" ON "WishlistItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "WishlistItem_userId_productId_key" ON "WishlistItem"("userId", "productId");

-- CreateIndex
CREATE INDEX "FavoriteStore_sellerId_idx" ON "FavoriteStore"("sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteStore_userId_sellerId_key" ON "FavoriteStore"("userId", "sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomRequest_reference_key" ON "CustomRequest"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "CustomRequest_acceptedQuoteId_key" ON "CustomRequest"("acceptedQuoteId");

-- CreateIndex
CREATE INDEX "CustomRequest_buyerId_status_idx" ON "CustomRequest"("buyerId", "status");

-- CreateIndex
CREATE INDEX "CustomRequest_sellerId_status_idx" ON "CustomRequest"("sellerId", "status");

-- CreateIndex
CREATE INDEX "CustomRequest_status_createdAt_idx" ON "CustomRequest"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CustomRequestQuote_customRequestId_sellerId_key" ON "CustomRequestQuote"("customRequestId", "sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "Warranty_warrantyNumber_key" ON "Warranty"("warrantyNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Warranty_orderItemId_key" ON "Warranty"("orderItemId");

-- CreateIndex
CREATE INDEX "Warranty_buyerId_idx" ON "Warranty"("buyerId");

-- CreateIndex
CREATE INDEX "Warranty_sellerId_idx" ON "Warranty"("sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceRequest_ticketNumber_key" ON "ServiceRequest"("ticketNumber");

-- CreateIndex
CREATE INDEX "ServiceRequest_buyerId_createdAt_idx" ON "ServiceRequest"("buyerId", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceRequest_sellerId_status_idx" ON "ServiceRequest"("sellerId", "status");

-- CreateIndex
CREATE INDEX "ServiceEvent_serviceRequestId_createdAt_idx" ON "ServiceEvent"("serviceRequestId", "createdAt");

-- CreateIndex
CREATE INDEX "CommissionRule_isActive_categoryId_idx" ON "CommissionRule"("isActive", "categoryId");

-- CreateIndex
CREATE INDEX "CommissionRule_isActive_sellerId_idx" ON "CommissionRule"("isActive", "sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_code_key" ON "SubscriptionPlan"("code");

-- CreateIndex
CREATE UNIQUE INDEX "SellerSubscription_sellerId_key" ON "SellerSubscription"("sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "SellerSubscription_stripeSubscriptionId_key" ON "SellerSubscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "LedgerEntry_type_occurredAt_idx" ON "LedgerEntry"("type", "occurredAt");

-- CreateIndex
CREATE INDEX "LedgerEntry_sellerId_occurredAt_idx" ON "LedgerEntry"("sellerId", "occurredAt");

-- CreateIndex
CREATE INDEX "LedgerEntry_orderId_idx" ON "LedgerEntry"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryIntegration_apiKeyHash_key" ON "InventoryIntegration"("apiKeyHash");

-- CreateIndex
CREATE INDEX "InventoryIntegration_sellerId_idx" ON "InventoryIntegration"("sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalSkuMapping_integrationId_externalId_key" ON "ExternalSkuMapping"("integrationId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalSkuMapping_integrationId_variantId_key" ON "ExternalSkuMapping"("integrationId", "variantId");

-- CreateIndex
CREATE INDEX "InventorySyncEvent_integrationId_createdAt_idx" ON "InventorySyncEvent"("integrationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "InventorySyncEvent_integrationId_externalEventId_key" ON "InventorySyncEvent"("integrationId", "externalEventId");

-- CreateIndex
CREATE UNIQUE INDEX "FileAsset_key_key" ON "FileAsset"("key");

-- CreateIndex
CREATE INDEX "FileAsset_uploadedById_idx" ON "FileAsset"("uploadedById");

-- CreateIndex
CREATE INDEX "FileAsset_purpose_idx" ON "FileAsset"("purpose");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_type_createdAt_idx" ON "AnalyticsEvent"("type", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_sellerId_type_createdAt_idx" ON "AnalyticsEvent"("sellerId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_productId_createdAt_idx" ON "AnalyticsEvent"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerProfile" ADD CONSTRAINT "SellerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerProfile" ADD CONSTRAINT "SellerProfile_returnAddressId_fkey" FOREIGN KEY ("returnAddressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreLocation" ADD CONSTRAINT "StoreLocation_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "SellerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycSubmission" ADD CONSTRAINT "KycSubmission_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "SellerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycSubmission" ADD CONSTRAINT "KycSubmission_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycDocument" ADD CONSTRAINT "KycDocument_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "SellerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycDocument" ADD CONSTRAINT "KycDocument_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "KycSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycDocument" ADD CONSTRAINT "KycDocument_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "SellerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerOrder" ADD CONSTRAINT "SellerOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerOrder" ADD CONSTRAINT "SellerOrder_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "SellerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusEvent" ADD CONSTRAINT "OrderStatusEvent_sellerOrderId_fkey" FOREIGN KEY ("sellerOrderId") REFERENCES "SellerOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_sellerOrderId_fkey" FOREIGN KEY ("sellerOrderId") REFERENCES "SellerOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_sellerOrderId_fkey" FOREIGN KEY ("sellerOrderId") REFERENCES "SellerOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "Dispute"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_returnRequestId_fkey" FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "SellerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_sellerOrderId_fkey" FOREIGN KEY ("sellerOrderId") REFERENCES "SellerOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingRate" ADD CONSTRAINT "ShippingRate_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "SellerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_sellerOrderId_fkey" FOREIGN KEY ("sellerOrderId") REFERENCES "SellerOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_returnRequestId_fkey" FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentEvent" ADD CONSTRAINT "ShipmentEvent_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_sellerOrderId_fkey" FOREIGN KEY ("sellerOrderId") REFERENCES "SellerOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "SellerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnItem" ADD CONSTRAINT "ReturnItem_returnRequestId_fkey" FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnItem" ADD CONSTRAINT "ReturnItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "SellerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_sellerOrderId_fkey" FOREIGN KEY ("sellerOrderId") REFERENCES "SellerOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "SellerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_assignedAdminId_fkey" FOREIGN KEY ("assignedAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_returnRequestId_fkey" FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "SellerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferEvent" ADD CONSTRAINT "OfferEvent_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "SellerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_sellerOrderId_fkey" FOREIGN KEY ("sellerOrderId") REFERENCES "SellerOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_customRequestId_fkey" FOREIGN KEY ("customRequestId") REFERENCES "CustomRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "Dispute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteStore" ADD CONSTRAINT "FavoriteStore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteStore" ADD CONSTRAINT "FavoriteStore_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "SellerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomRequest" ADD CONSTRAINT "CustomRequest_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomRequest" ADD CONSTRAINT "CustomRequest_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "SellerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomRequest" ADD CONSTRAINT "CustomRequest_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomRequest" ADD CONSTRAINT "CustomRequest_acceptedQuoteId_fkey" FOREIGN KEY ("acceptedQuoteId") REFERENCES "CustomRequestQuote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomRequestQuote" ADD CONSTRAINT "CustomRequestQuote_customRequestId_fkey" FOREIGN KEY ("customRequestId") REFERENCES "CustomRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomRequestQuote" ADD CONSTRAINT "CustomRequestQuote_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "SellerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warranty" ADD CONSTRAINT "Warranty_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warranty" ADD CONSTRAINT "Warranty_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warranty" ADD CONSTRAINT "Warranty_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "SellerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "SellerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_warrantyId_fkey" FOREIGN KEY ("warrantyId") REFERENCES "Warranty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceEvent" ADD CONSTRAINT "ServiceEvent_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "SellerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerSubscription" ADD CONSTRAINT "SellerSubscription_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "SellerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerSubscription" ADD CONSTRAINT "SellerSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "SellerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryIntegration" ADD CONSTRAINT "InventoryIntegration_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "SellerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalSkuMapping" ADD CONSTRAINT "ExternalSkuMapping_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "InventoryIntegration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalSkuMapping" ADD CONSTRAINT "ExternalSkuMapping_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventorySyncEvent" ADD CONSTRAINT "InventorySyncEvent_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "InventoryIntegration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAsset" ADD CONSTRAINT "FileAsset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
