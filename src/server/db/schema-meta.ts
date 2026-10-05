/**
 * Database schema metadata for Neon SQL Query Engine.
 * Defines model table names, primary keys, field types, and relation foreign keys.
 */

export interface RelationMeta {
  type: "one" | "many";
  model: string;
  foreignKey: string;
  targetKey: string;
}

export interface ModelMeta {
  table: string;
  primaryKey: string;
  jsonFields?: Set<string>;
  arrayFields?: Set<string>;
  bigintFields?: Set<string>;
  relations: Record<string, RelationMeta>;
}

export const SCHEMA_META: Record<string, ModelMeta> = {
  User: {
    table: "User",
    primaryKey: "id",
    relations: {
      accounts: { type: "many", model: "Account", foreignKey: "userId", targetKey: "id" },
      sellerProfile: { type: "one", model: "SellerProfile", foreignKey: "userId", targetKey: "id" },
      addresses: { type: "many", model: "Address", foreignKey: "userId", targetKey: "id" },
      paymentMethods: { type: "many", model: "PaymentMethod", foreignKey: "userId", targetKey: "id" },
      cart: { type: "one", model: "Cart", foreignKey: "userId", targetKey: "id" },
      orders: { type: "many", model: "Order", foreignKey: "buyerId", targetKey: "id" },
      reviews: { type: "many", model: "Review", foreignKey: "userId", targetKey: "id" },
      wishlistItems: { type: "many", model: "WishlistItem", foreignKey: "userId", targetKey: "id" },
      favoriteStores: { type: "many", model: "FavoriteStore", foreignKey: "userId", targetKey: "id" },
      offers: { type: "many", model: "Offer", foreignKey: "buyerId", targetKey: "id" },
      customRequests: { type: "many", model: "CustomRequest", foreignKey: "buyerId", targetKey: "id" },
      warranties: { type: "many", model: "Warranty", foreignKey: "buyerId", targetKey: "id" },
      serviceRequests: { type: "many", model: "ServiceRequest", foreignKey: "buyerId", targetKey: "id" },
      returnRequests: { type: "many", model: "ReturnRequest", foreignKey: "buyerId", targetKey: "id" },
      disputesOpened: { type: "many", model: "Dispute", foreignKey: "openedById", targetKey: "id" },
      disputesAssigned: { type: "many", model: "Dispute", foreignKey: "assignedToId", targetKey: "id" },
      participations: { type: "many", model: "ConversationParticipant", foreignKey: "userId", targetKey: "id" },
      messages: { type: "many", model: "Message", foreignKey: "senderId", targetKey: "id" },
      notifications: { type: "many", model: "Notification", foreignKey: "userId", targetKey: "id" },
      kycReviews: { type: "many", model: "KycSubmission", foreignKey: "reviewerId", targetKey: "id" },
      auditLogs: { type: "many", model: "AuditLog", foreignKey: "actorId", targetKey: "id" },
      files: { type: "many", model: "FileAsset", foreignKey: "uploadedById", targetKey: "id" },
    },
  },
  Account: {
    table: "Account",
    primaryKey: "id",
    relations: {
      user: { type: "one", model: "User", foreignKey: "id", targetKey: "userId" },
    },
  },
  VerificationToken: {
    table: "VerificationToken",
    primaryKey: "token",
    relations: {},
  },
  Address: {
    table: "Address",
    primaryKey: "id",
    relations: {
      user: { type: "one", model: "User", foreignKey: "id", targetKey: "userId" },
      sellerReturnFor: { type: "one", model: "SellerProfile", foreignKey: "returnAddressId", targetKey: "id" },
    },
  },
  PaymentMethod: {
    table: "PaymentMethod",
    primaryKey: "id",
    relations: {
      user: { type: "one", model: "User", foreignKey: "id", targetKey: "userId" },
    },
  },
  SellerProfile: {
    table: "SellerProfile",
    primaryKey: "id",
    arrayFields: new Set(["specialties"]),
    relations: {
      user: { type: "one", model: "User", foreignKey: "id", targetKey: "userId" },
      returnAddress: { type: "one", model: "Address", foreignKey: "id", targetKey: "returnAddressId" },
      locations: { type: "many", model: "StoreLocation", foreignKey: "sellerId", targetKey: "id" },
      products: { type: "many", model: "Product", foreignKey: "sellerId", targetKey: "id" },
      sellerOrders: { type: "many", model: "SellerOrder", foreignKey: "sellerId", targetKey: "id" },
      kycSubmissions: { type: "many", model: "KycSubmission", foreignKey: "sellerId", targetKey: "id" },
      kycDocuments: { type: "many", model: "KycDocument", foreignKey: "sellerId", targetKey: "id" },
      shippingRates: { type: "many", model: "ShippingRate", foreignKey: "sellerId", targetKey: "id" },
      offers: { type: "many", model: "Offer", foreignKey: "sellerId", targetKey: "id" },
      reviews: { type: "many", model: "Review", foreignKey: "sellerId", targetKey: "id" },
      favoritedBy: { type: "many", model: "FavoriteStore", foreignKey: "sellerId", targetKey: "id" },
      customRequests: { type: "many", model: "CustomRequest", foreignKey: "sellerId", targetKey: "id" },
      quotes: { type: "many", model: "CustomRequestQuote", foreignKey: "sellerId", targetKey: "id" },
      integrations: { type: "many", model: "InventoryIntegration", foreignKey: "sellerId", targetKey: "id" },
      payouts: { type: "many", model: "Payout", foreignKey: "sellerId", targetKey: "id" },
      subscription: { type: "one", model: "SellerSubscription", foreignKey: "sellerId", targetKey: "id" },
      ledgerEntries: { type: "many", model: "LedgerEntry", foreignKey: "sellerId", targetKey: "id" },
      disputes: { type: "many", model: "Dispute", foreignKey: "sellerId", targetKey: "id" },
      returnRequests: { type: "many", model: "ReturnRequest", foreignKey: "sellerId", targetKey: "id" },
      warranties: { type: "many", model: "Warranty", foreignKey: "sellerId", targetKey: "id" },
      serviceRequests: { type: "many", model: "ServiceRequest", foreignKey: "sellerId", targetKey: "id" },
      conversations: { type: "many", model: "Conversation", foreignKey: "sellerId", targetKey: "id" },
      commissionRules: { type: "many", model: "CommissionRule", foreignKey: "sellerId", targetKey: "id" },
    },
  },
  StoreLocation: {
    table: "StoreLocation",
    primaryKey: "id",
    relations: {
      seller: { type: "one", model: "SellerProfile", foreignKey: "id", targetKey: "sellerId" },
    },
  },
  KycSubmission: {
    table: "KycSubmission",
    primaryKey: "id",
    jsonFields: new Set(["snapshot"]),
    relations: {
      seller: { type: "one", model: "SellerProfile", foreignKey: "id", targetKey: "sellerId" },
      reviewer: { type: "one", model: "User", foreignKey: "id", targetKey: "reviewerId" },
      documents: { type: "many", model: "KycDocument", foreignKey: "submissionId", targetKey: "id" },
    },
  },
  KycDocument: {
    table: "KycDocument",
    primaryKey: "id",
    relations: {
      seller: { type: "one", model: "SellerProfile", foreignKey: "id", targetKey: "sellerId" },
      submission: { type: "one", model: "KycSubmission", foreignKey: "id", targetKey: "submissionId" },
      file: { type: "one", model: "FileAsset", foreignKey: "id", targetKey: "fileId" },
    },
  },
  Category: {
    table: "Category",
    primaryKey: "id",
    relations: {
      parent: { type: "one", model: "Category", foreignKey: "id", targetKey: "parentId" },
      children: { type: "many", model: "Category", foreignKey: "parentId", targetKey: "id" },
      products: { type: "many", model: "Product", foreignKey: "categoryId", targetKey: "id" },
      customRequests: { type: "many", model: "CustomRequest", foreignKey: "categoryId", targetKey: "id" },
      commissionRules: { type: "many", model: "CommissionRule", foreignKey: "categoryId", targetKey: "id" },
    },
  },
  Product: {
    table: "Product",
    primaryKey: "id",
    arrayFields: new Set(["shipsTo", "tags", "certificationLabs"]),
    bigintFields: new Set(["basePriceMinor", "compareAtPriceMinor", "normalizedPriceUsd", "offerFloorMinor", "resizingFeeMinor", "engravingFeeMinor"]),
    relations: {
      seller: { type: "one", model: "SellerProfile", foreignKey: "id", targetKey: "sellerId" },
      category: { type: "one", model: "Category", foreignKey: "id", targetKey: "categoryId" },
      images: { type: "many", model: "ProductImage", foreignKey: "productId", targetKey: "id" },
      variants: { type: "many", model: "ProductVariant", foreignKey: "productId", targetKey: "id" },
      certificates: { type: "many", model: "Certificate", foreignKey: "productId", targetKey: "id" },
      reviews: { type: "many", model: "Review", foreignKey: "productId", targetKey: "id" },
      wishlistItems: { type: "many", model: "WishlistItem", foreignKey: "productId", targetKey: "id" },
      offers: { type: "many", model: "Offer", foreignKey: "productId", targetKey: "id" },
      orderItems: { type: "many", model: "OrderItem", foreignKey: "productId", targetKey: "id" },
      cartItems: { type: "many", model: "CartItem", foreignKey: "productId", targetKey: "id" },
      conversations: { type: "many", model: "Conversation", foreignKey: "productId", targetKey: "id" },
    },
  },
  ProductImage: {
    table: "ProductImage",
    primaryKey: "id",
    relations: {
      product: { type: "one", model: "Product", foreignKey: "id", targetKey: "productId" },
      variant: { type: "one", model: "ProductVariant", foreignKey: "id", targetKey: "variantId" },
    },
  },
  ProductVariant: {
    table: "ProductVariant",
    primaryKey: "id",
    bigintFields: new Set(["priceMinor", "compareAtPriceMinor", "stonePriceMinor"]),
    relations: {
      product: { type: "one", model: "Product", foreignKey: "id", targetKey: "productId" },
      images: { type: "many", model: "ProductImage", foreignKey: "variantId", targetKey: "id" },
      certificates: { type: "many", model: "Certificate", foreignKey: "variantId", targetKey: "id" },
      cartItems: { type: "many", model: "CartItem", foreignKey: "variantId", targetKey: "id" },
      orderItems: { type: "many", model: "OrderItem", foreignKey: "variantId", targetKey: "id" },
      offers: { type: "many", model: "Offer", foreignKey: "variantId", targetKey: "id" },
      wishlistItems: { type: "many", model: "WishlistItem", foreignKey: "variantId", targetKey: "id" },
      reservations: { type: "many", model: "InventoryReservation", foreignKey: "variantId", targetKey: "id" },
      externalMappings: { type: "many", model: "ExternalSkuMapping", foreignKey: "variantId", targetKey: "id" },
    },
  },
  Certificate: {
    table: "Certificate",
    primaryKey: "id",
    relations: {
      product: { type: "one", model: "Product", foreignKey: "id", targetKey: "productId" },
      variant: { type: "one", model: "ProductVariant", foreignKey: "id", targetKey: "variantId" },
      file: { type: "one", model: "FileAsset", foreignKey: "id", targetKey: "fileId" },
    },
  },
  MetalRate: {
    table: "MetalRate",
    primaryKey: "id",
    relations: {},
  },
  ExchangeRate: {
    table: "ExchangeRate",
    primaryKey: "id",
    relations: {},
  },
  Cart: {
    table: "Cart",
    primaryKey: "id",
    relations: {
      user: { type: "one", model: "User", foreignKey: "id", targetKey: "userId" },
      items: { type: "many", model: "CartItem", foreignKey: "cartId", targetKey: "id" },
    },
  },
  CartItem: {
    table: "CartItem",
    primaryKey: "id",
    relations: {
      cart: { type: "one", model: "Cart", foreignKey: "id", targetKey: "cartId" },
      product: { type: "one", model: "Product", foreignKey: "id", targetKey: "productId" },
      variant: { type: "one", model: "ProductVariant", foreignKey: "id", targetKey: "variantId" },
      offer: { type: "one", model: "Offer", foreignKey: "id", targetKey: "offerId" },
    },
  },
  InventoryReservation: {
    table: "InventoryReservation",
    primaryKey: "id",
    relations: {
      variant: { type: "one", model: "ProductVariant", foreignKey: "id", targetKey: "variantId" },
      order: { type: "one", model: "Order", foreignKey: "id", targetKey: "orderId" },
    },
  },
  Order: {
    table: "Order",
    primaryKey: "id",
    jsonFields: new Set(["shippingAddress", "billingAddress", "fxSnapshot"]),
    bigintFields: new Set(["subtotalMinor", "shippingMinor", "insuranceMinor", "taxMinor", "dutiesMinor", "discountMinor", "totalMinor", "platformFeeMinor"]),
    relations: {
      buyer: { type: "one", model: "User", foreignKey: "id", targetKey: "buyerId" },
      sellerOrders: { type: "many", model: "SellerOrder", foreignKey: "orderId", targetKey: "id" },
      items: { type: "many", model: "OrderItem", foreignKey: "orderId", targetKey: "id" },
      payments: { type: "many", model: "Payment", foreignKey: "orderId", targetKey: "id" },
      refunds: { type: "many", model: "Refund", foreignKey: "orderId", targetKey: "id" },
      reservations: { type: "many", model: "InventoryReservation", foreignKey: "orderId", targetKey: "id" },
      disputes: { type: "many", model: "Dispute", foreignKey: "orderId", targetKey: "id" },
    },
  },
  SellerOrder: {
    table: "SellerOrder",
    primaryKey: "id",
    bigintFields: new Set(["subtotalMinor", "shippingMinor", "insuranceMinor", "taxMinor", "dutiesMinor", "totalMinor", "commissionMinor", "sellerNetMinor", "declaredValueMinor"]),
    relations: {
      order: { type: "one", model: "Order", foreignKey: "id", targetKey: "orderId" },
      seller: { type: "one", model: "SellerProfile", foreignKey: "id", targetKey: "sellerId" },
      items: { type: "many", model: "OrderItem", foreignKey: "sellerOrderId", targetKey: "id" },
      shipments: { type: "many", model: "Shipment", foreignKey: "sellerOrderId", targetKey: "id" },
      statusEvents: { type: "many", model: "OrderStatusEvent", foreignKey: "sellerOrderId", targetKey: "id" },
      returnRequests: { type: "many", model: "ReturnRequest", foreignKey: "sellerOrderId", targetKey: "id" },
      disputes: { type: "many", model: "Dispute", foreignKey: "sellerOrderId", targetKey: "id" },
      refunds: { type: "many", model: "Refund", foreignKey: "sellerOrderId", targetKey: "id" },
      payout: { type: "one", model: "Payout", foreignKey: "sellerOrderId", targetKey: "id" },
      conversations: { type: "many", model: "Conversation", foreignKey: "sellerOrderId", targetKey: "id" },
    },
  },
  OrderStatusEvent: {
    table: "OrderStatusEvent",
    primaryKey: "id",
    relations: {
      sellerOrder: { type: "one", model: "SellerOrder", foreignKey: "id", targetKey: "sellerOrderId" },
    },
  },
  OrderItem: {
    table: "OrderItem",
    primaryKey: "id",
    jsonFields: new Set(["pricingSnapshot", "certificateSnapshot"]),
    bigintFields: new Set(["unitPriceMinor", "listPriceMinor", "engravingFeeMinor", "totalMinor"]),
    relations: {
      order: { type: "one", model: "Order", foreignKey: "id", targetKey: "orderId" },
      sellerOrder: { type: "one", model: "SellerOrder", foreignKey: "id", targetKey: "sellerOrderId" },
      product: { type: "one", model: "Product", foreignKey: "id", targetKey: "productId" },
      variant: { type: "one", model: "ProductVariant", foreignKey: "id", targetKey: "variantId" },
      offer: { type: "one", model: "Offer", foreignKey: "id", targetKey: "offerId" },
      review: { type: "one", model: "Review", foreignKey: "orderItemId", targetKey: "id" },
      warranty: { type: "one", model: "Warranty", foreignKey: "orderItemId", targetKey: "id" },
      returnItems: { type: "many", model: "ReturnItem", foreignKey: "orderItemId", targetKey: "id" },
      serviceRequests: { type: "many", model: "ServiceRequest", foreignKey: "orderItemId", targetKey: "id" },
    },
  },
  Payment: {
    table: "Payment",
    primaryKey: "id",
    bigintFields: new Set(["amountMinor"]),
    relations: {
      order: { type: "one", model: "Order", foreignKey: "id", targetKey: "orderId" },
    },
  },
  Refund: {
    table: "Refund",
    primaryKey: "id",
    bigintFields: new Set(["amountMinor"]),
    relations: {
      order: { type: "one", model: "Order", foreignKey: "id", targetKey: "orderId" },
      sellerOrder: { type: "one", model: "SellerOrder", foreignKey: "id", targetKey: "sellerOrderId" },
      dispute: { type: "one", model: "Dispute", foreignKey: "id", targetKey: "disputeId" },
      returnRequest: { type: "one", model: "ReturnRequest", foreignKey: "id", targetKey: "returnRequestId" },
    },
  },
  Payout: {
    table: "Payout",
    primaryKey: "id",
    bigintFields: new Set(["amountMinor"]),
    relations: {
      seller: { type: "one", model: "SellerProfile", foreignKey: "id", targetKey: "sellerId" },
      sellerOrder: { type: "one", model: "SellerOrder", foreignKey: "id", targetKey: "sellerOrderId" },
    },
  },
  ShippingRate: {
    table: "ShippingRate",
    primaryKey: "id",
    bigintFields: new Set(["priceMinor", "freeOverMinor"]),
    relations: {
      seller: { type: "one", model: "SellerProfile", foreignKey: "id", targetKey: "sellerId" },
    },
  },
  Shipment: {
    table: "Shipment",
    primaryKey: "id",
    relations: {
      sellerOrder: { type: "one", model: "SellerOrder", foreignKey: "id", targetKey: "sellerOrderId" },
      returnRequest: { type: "one", model: "ReturnRequest", foreignKey: "id", targetKey: "returnRequestId" },
      serviceRequest: { type: "one", model: "ServiceRequest", foreignKey: "id", targetKey: "serviceRequestId" },
      events: { type: "many", model: "ShipmentEvent", foreignKey: "shipmentId", targetKey: "id" },
    },
  },
  ShipmentEvent: {
    table: "ShipmentEvent",
    primaryKey: "id",
    relations: {
      shipment: { type: "one", model: "Shipment", foreignKey: "id", targetKey: "shipmentId" },
    },
  },
  ReturnRequest: {
    table: "ReturnRequest",
    primaryKey: "id",
    relations: {
      order: { type: "one", model: "Order", foreignKey: "id", targetKey: "orderId" },
      sellerOrder: { type: "one", model: "SellerOrder", foreignKey: "id", targetKey: "sellerOrderId" },
      buyer: { type: "one", model: "User", foreignKey: "id", targetKey: "buyerId" },
      seller: { type: "one", model: "SellerProfile", foreignKey: "id", targetKey: "sellerId" },
      items: { type: "many", model: "ReturnItem", foreignKey: "returnRequestId", targetKey: "id" },
      shipment: { type: "one", model: "Shipment", foreignKey: "returnRequestId", targetKey: "id" },
      refund: { type: "one", model: "Refund", foreignKey: "returnRequestId", targetKey: "id" },
    },
  },
  ReturnItem: {
    table: "ReturnItem",
    primaryKey: "id",
    relations: {
      returnRequest: { type: "one", model: "ReturnRequest", foreignKey: "id", targetKey: "returnRequestId" },
      orderItem: { type: "one", model: "OrderItem", foreignKey: "id", targetKey: "orderItemId" },
    },
  },
  Review: {
    table: "Review",
    primaryKey: "id",
    arrayFields: new Set(["images"]),
    relations: {
      user: { type: "one", model: "User", foreignKey: "id", targetKey: "userId" },
      seller: { type: "one", model: "SellerProfile", foreignKey: "id", targetKey: "sellerId" },
      product: { type: "one", model: "Product", foreignKey: "id", targetKey: "productId" },
      orderItem: { type: "one", model: "OrderItem", foreignKey: "id", targetKey: "orderItemId" },
    },
  },
  Dispute: {
    table: "Dispute",
    primaryKey: "id",
    arrayFields: new Set(["evidenceUrls"]),
    bigintFields: new Set(["amountRequestedMinor", "amountResolvedMinor"]),
    relations: {
      order: { type: "one", model: "Order", foreignKey: "id", targetKey: "orderId" },
      sellerOrder: { type: "one", model: "SellerOrder", foreignKey: "id", targetKey: "sellerOrderId" },
      openedBy: { type: "one", model: "User", foreignKey: "id", targetKey: "openedById" },
      seller: { type: "one", model: "SellerProfile", foreignKey: "id", targetKey: "sellerId" },
      assignedTo: { type: "one", model: "User", foreignKey: "id", targetKey: "assignedToId" },
      refund: { type: "one", model: "Refund", foreignKey: "disputeId", targetKey: "id" },
    },
  },
  Offer: {
    table: "Offer",
    primaryKey: "id",
    bigintFields: new Set(["currentAmountMinor"]),
    relations: {
      buyer: { type: "one", model: "User", foreignKey: "id", targetKey: "buyerId" },
      seller: { type: "one", model: "SellerProfile", foreignKey: "id", targetKey: "sellerId" },
      product: { type: "one", model: "Product", foreignKey: "id", targetKey: "productId" },
      variant: { type: "one", model: "ProductVariant", foreignKey: "id", targetKey: "variantId" },
      events: { type: "many", model: "OfferEvent", foreignKey: "offerId", targetKey: "id" },
      cartItem: { type: "one", model: "CartItem", foreignKey: "offerId", targetKey: "id" },
      orderItem: { type: "one", model: "OrderItem", foreignKey: "offerId", targetKey: "id" },
    },
  },
  OfferEvent: {
    table: "OfferEvent",
    primaryKey: "id",
    bigintFields: new Set(["amountMinor"]),
    relations: {
      offer: { type: "one", model: "Offer", foreignKey: "id", targetKey: "offerId" },
    },
  },
  Conversation: {
    table: "Conversation",
    primaryKey: "id",
    relations: {
      participants: { type: "many", model: "ConversationParticipant", foreignKey: "conversationId", targetKey: "id" },
      messages: { type: "many", model: "Message", foreignKey: "conversationId", targetKey: "id" },
      product: { type: "one", model: "Product", foreignKey: "id", targetKey: "productId" },
      seller: { type: "one", model: "SellerProfile", foreignKey: "id", targetKey: "sellerId" },
      sellerOrder: { type: "one", model: "SellerOrder", foreignKey: "id", targetKey: "sellerOrderId" },
      offer: { type: "one", model: "Offer", foreignKey: "id", targetKey: "offerId" },
      dispute: { type: "one", model: "Dispute", foreignKey: "id", targetKey: "disputeId" },
      customRequest: { type: "one", model: "CustomRequest", foreignKey: "id", targetKey: "customRequestId" },
    },
  },
  ConversationParticipant: {
    table: "ConversationParticipant",
    primaryKey: "id",
    relations: {
      conversation: { type: "one", model: "Conversation", foreignKey: "id", targetKey: "conversationId" },
      user: { type: "one", model: "User", foreignKey: "id", targetKey: "userId" },
    },
  },
  Message: {
    table: "Message",
    primaryKey: "id",
    jsonFields: new Set(["attachments"]),
    relations: {
      conversation: { type: "one", model: "Conversation", foreignKey: "id", targetKey: "conversationId" },
      sender: { type: "one", model: "User", foreignKey: "id", targetKey: "senderId" },
    },
  },
  WishlistItem: {
    table: "WishlistItem",
    primaryKey: "id",
    relations: {
      user: { type: "one", model: "User", foreignKey: "id", targetKey: "userId" },
      product: { type: "one", model: "Product", foreignKey: "id", targetKey: "productId" },
      variant: { type: "one", model: "ProductVariant", foreignKey: "id", targetKey: "variantId" },
    },
  },
  FavoriteStore: {
    table: "FavoriteStore",
    primaryKey: "id",
    relations: {
      user: { type: "one", model: "User", foreignKey: "id", targetKey: "userId" },
      seller: { type: "one", model: "SellerProfile", foreignKey: "id", targetKey: "sellerId" },
    },
  },
  CustomRequest: {
    table: "CustomRequest",
    primaryKey: "id",
    arrayFields: new Set(["inspirationUrls"]),
    bigintFields: new Set(["budgetMinor"]),
    relations: {
      buyer: { type: "one", model: "User", foreignKey: "id", targetKey: "buyerId" },
      seller: { type: "one", model: "SellerProfile", foreignKey: "id", targetKey: "sellerId" },
      category: { type: "one", model: "Category", foreignKey: "id", targetKey: "categoryId" },
      quotes: { type: "many", model: "CustomRequestQuote", foreignKey: "customRequestId", targetKey: "id" },
      acceptedQuote: { type: "one", model: "CustomRequestQuote", foreignKey: "id", targetKey: "acceptedQuoteId" },
    },
  },
  CustomRequestQuote: {
    table: "CustomRequestQuote",
    primaryKey: "id",
    bigintFields: new Set(["priceMinor"]),
    relations: {
      customRequest: { type: "one", model: "CustomRequest", foreignKey: "id", targetKey: "customRequestId" },
      seller: { type: "one", model: "SellerProfile", foreignKey: "id", targetKey: "sellerId" },
    },
  },
  Warranty: {
    table: "Warranty",
    primaryKey: "id",
    relations: {
      orderItem: { type: "one", model: "OrderItem", foreignKey: "id", targetKey: "orderItemId" },
      product: { type: "one", model: "Product", foreignKey: "id", targetKey: "productId" },
      buyer: { type: "one", model: "User", foreignKey: "id", targetKey: "buyerId" },
      seller: { type: "one", model: "SellerProfile", foreignKey: "id", targetKey: "sellerId" },
      services: { type: "many", model: "ServiceRequest", foreignKey: "warrantyId", targetKey: "id" },
    },
  },
  ServiceRequest: {
    table: "ServiceRequest",
    primaryKey: "id",
    arrayFields: new Set(["images"]),
    bigintFields: new Set(["quotedPriceMinor", "finalPriceMinor"]),
    relations: {
      orderItem: { type: "one", model: "OrderItem", foreignKey: "id", targetKey: "orderItemId" },
      warranty: { type: "one", model: "Warranty", foreignKey: "id", targetKey: "warrantyId" },
      buyer: { type: "one", model: "User", foreignKey: "id", targetKey: "buyerId" },
      seller: { type: "one", model: "SellerProfile", foreignKey: "id", targetKey: "sellerId" },
      events: { type: "many", model: "ServiceEvent", foreignKey: "serviceRequestId", targetKey: "id" },
      shipment: { type: "one", model: "Shipment", foreignKey: "serviceRequestId", targetKey: "id" },
    },
  },
  ServiceEvent: {
    table: "ServiceEvent",
    primaryKey: "id",
    relations: {
      serviceRequest: { type: "one", model: "ServiceRequest", foreignKey: "id", targetKey: "serviceRequestId" },
    },
  },
  PlatformSettings: {
    table: "PlatformSettings",
    primaryKey: "id",
    jsonFields: new Set(["fxSnapshot", "supportedCurrencies"]),
    relations: {},
  },
  CommissionRule: {
    table: "CommissionRule",
    primaryKey: "id",
    relations: {
      seller: { type: "one", model: "SellerProfile", foreignKey: "id", targetKey: "sellerId" },
      category: { type: "one", model: "Category", foreignKey: "id", targetKey: "categoryId" },
      plan: { type: "one", model: "SubscriptionPlan", foreignKey: "id", targetKey: "planId" },
    },
  },
  SubscriptionPlan: {
    table: "SubscriptionPlan",
    primaryKey: "id",
    arrayFields: new Set(["features"]),
    bigintFields: new Set(["priceMinor"]),
    relations: {
      subscriptions: { type: "many", model: "SellerSubscription", foreignKey: "planId", targetKey: "id" },
      commissionRules: { type: "many", model: "CommissionRule", foreignKey: "planId", targetKey: "id" },
    },
  },
  SellerSubscription: {
    table: "SellerSubscription",
    primaryKey: "id",
    relations: {
      seller: { type: "one", model: "SellerProfile", foreignKey: "id", targetKey: "sellerId" },
      plan: { type: "one", model: "SubscriptionPlan", foreignKey: "id", targetKey: "planId" },
    },
  },
  LedgerEntry: {
    table: "LedgerEntry",
    primaryKey: "id",
    bigintFields: new Set(["amountMinor", "amountUsdMinor", "balanceAfterMinor"]),
    jsonFields: new Set(["metadata"]),
    relations: {
      seller: { type: "one", model: "SellerProfile", foreignKey: "id", targetKey: "sellerId" },
    },
  },
  InventoryIntegration: {
    table: "InventoryIntegration",
    primaryKey: "id",
    jsonFields: new Set(["credentialsEncrypted", "config"]),
    relations: {
      seller: { type: "one", model: "SellerProfile", foreignKey: "id", targetKey: "sellerId" },
      mappings: { type: "many", model: "ExternalSkuMapping", foreignKey: "integrationId", targetKey: "id" },
      events: { type: "many", model: "InventorySyncEvent", foreignKey: "integrationId", targetKey: "id" },
    },
  },
  ExternalSkuMapping: {
    table: "ExternalSkuMapping",
    primaryKey: "id",
    relations: {
      integration: { type: "one", model: "InventoryIntegration", foreignKey: "id", targetKey: "integrationId" },
      variant: { type: "one", model: "ProductVariant", foreignKey: "id", targetKey: "variantId" },
    },
  },
  InventorySyncEvent: {
    table: "InventorySyncEvent",
    primaryKey: "id",
    jsonFields: new Set(["payload"]),
    relations: {
      integration: { type: "one", model: "InventoryIntegration", foreignKey: "id", targetKey: "integrationId" },
    },
  },
  FileAsset: {
    table: "FileAsset",
    primaryKey: "id",
    relations: {
      uploadedBy: { type: "one", model: "User", foreignKey: "id", targetKey: "uploadedById" },
      kycDocument: { type: "one", model: "KycDocument", foreignKey: "fileId", targetKey: "id" },
      certificate: { type: "one", model: "Certificate", foreignKey: "fileId", targetKey: "id" },
    },
  },
  Notification: {
    table: "Notification",
    primaryKey: "id",
    jsonFields: new Set(["data"]),
    relations: {
      user: { type: "one", model: "User", foreignKey: "id", targetKey: "userId" },
    },
  },
  NewsletterSubscriber: {
    table: "NewsletterSubscriber",
    primaryKey: "id",
    relations: {},
  },
  AnalyticsEvent: {
    table: "AnalyticsEvent",
    primaryKey: "id",
    jsonFields: new Set(["metadata"]),
    relations: {},
  },
  AuditLog: {
    table: "AuditLog",
    primaryKey: "id",
    jsonFields: new Set(["before", "after", "metadata"]),
    relations: {
      actor: { type: "one", model: "User", foreignKey: "id", targetKey: "actorId" },
    },
  },
};
