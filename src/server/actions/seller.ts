"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Carrier, FulfillmentStatus, ServiceStatus, ShippingMethod, ShippingZone } from "@/generated/prisma/enums";
import { toMinor } from "@/lib/money";
import { AccessDenied, assertSeller } from "@/server/auth/session";
import { db } from "@/server/db";
import { AfterSalesError, approveReturn, receiveReturn, rejectReturn, setCustomRequestStatus, submitQuote, updateServiceRequest } from "@/server/services/after-sales";
import { advanceSellerOrder, FulfillmentError } from "@/server/services/fulfillment";
import { createCustomApiIntegration, createWebhookIntegration } from "@/server/services/inventory-sync";
import { addCertificate, certificateSchema, ListingError, listingSchema, publishListing, removeCertificate, repriceSpotListings, saveListing, setListingStatus } from "@/server/services/listings";
import { notify } from "@/server/services/messaging";
import { saveUpload, UploadError } from "@/server/services/storage";
import type { ActionResult } from "./cart";

async function guard<T extends ActionResult>(fn: () => Promise<T>, paths: string[] = []): Promise<T | ActionResult> {
  try {
    const res = await fn();
    for (const p of paths) revalidatePath(p);
    return res;
  } catch (error) {
    if (error instanceof ListingError || error instanceof FulfillmentError || error instanceof AfterSalesError || error instanceof UploadError || error instanceof AccessDenied) {
      return { ok: false, message: error.message };
    }
    if (error instanceof z.ZodError) return { ok: false, message: error.issues[0]?.message ?? "Check the form." };
    throw error;
  }
}

// ── Listings ──────────────────────────────────────────────────────────────────

export async function saveListingAction(input: z.input<typeof listingSchema>, publish = false): Promise<ActionResult & { productId?: string }> {
  return guard(async () => {
    const { seller } = await assertSeller();
    const data = listingSchema.parse(input);
    const product = await saveListing(seller.id, data);
    if (publish) await publishListing(seller.id, product.id);
    return { ok: true, message: publish ? "Published — your piece is live." : "Saved.", productId: product.id, href: `/seller/products/${product.id}` };
  }, ["/seller/products"]);
}

export async function publishListingAction(productId: string) {
  return guard(async () => {
    const { seller } = await assertSeller();
    await publishListing(seller.id, productId);
    return { ok: true, message: "Published — your piece is live." };
  }, ["/seller/products"]);
}

export async function setListingStatusAction(productId: string, status: "ARCHIVED" | "DRAFT") {
  return guard(async () => {
    const { seller } = await assertSeller();
    await setListingStatus(seller.id, productId, status);
    return { ok: true, message: status === "ARCHIVED" ? "Archived." : "Moved back to drafts." };
  }, ["/seller/products"]);
}

export async function uploadProductImageAction(formData: FormData): Promise<ActionResult & { url?: string }> {
  return guard(async () => {
    const { seller, user } = await assertSeller({ verified: false });
    const file = formData.get("file");
    if (!(file instanceof File) || !file.size) return { ok: false, message: "Choose an image." };
    const asset = await saveUpload(file, "PRODUCT_MEDIA", seller.id, user.id);
    return { ok: true, message: "Uploaded.", url: asset.url ?? undefined };
  });
}

export async function addCertificateAction(productId: string, formData: FormData) {
  return guard(async () => {
    const { seller, user } = await assertSeller();
    const raw = Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string" && v !== ""));
    const input = certificateSchema.parse(raw);
    const file = formData.get("file");
    await addCertificate(seller.id, user.id, productId, input, file instanceof File ? file : null);
    return { ok: true, message: "Report attached. Loupe will check it against the piece before it shows as verified." };
  }, [`/seller/products/${productId}`]);
}

export async function removeCertificateAction(certificateId: string) {
  return guard(async () => {
    const { seller } = await assertSeller();
    await removeCertificate(seller.id, certificateId);
    return { ok: true, message: "Report removed." };
  }, ["/seller/products"]);
}

export async function repriceNowAction() {
  return guard(async () => {
    const { seller } = await assertSeller();
    const res = await repriceSpotListings(seller.id);
    return { ok: true, message: `Repriced ${res.variants} SKUs across ${res.products} listings at today's spot rate.` };
  }, ["/seller/pricing", "/seller/products"]);
}

// ── Orders, returns, reviews, service ─────────────────────────────────────────

export async function advanceOrderAction(sellerOrderId: string, to: string, extra: { note?: string; carrier?: string; trackingNumber?: string } = {}) {
  return guard(async () => {
    const { seller, user } = await assertSeller();
    await advanceSellerOrder({
      sellerId: seller.id,
      actorId: user.id,
      sellerOrderId,
      to: z.enum(FulfillmentStatus).parse(to),
      note: extra.note,
      carrier: extra.carrier ? z.enum(Carrier).parse(extra.carrier) : undefined,
      trackingNumber: extra.trackingNumber || undefined,
    });
    return { ok: true, message: `Order ${to === "CANCELLED" ? "cancelled and refunded" : `marked ${to.toLowerCase().replace("_", " ")}`}.` };
  }, ["/seller/orders", `/seller/orders/${sellerOrderId}`]);
}

export async function returnDecisionAction(returnId: string, decision: "APPROVE" | "REJECT" | "RECEIVE", message?: string) {
  return guard(async () => {
    const { seller } = await assertSeller();
    if (decision === "APPROVE") await approveReturn(seller.id, returnId, message);
    if (decision === "REJECT") await rejectReturn(seller.id, returnId, message || "This piece isn't eligible for return.");
    if (decision === "RECEIVE") await receiveReturn(seller.id, returnId);
    const verbs = { APPROVE: "Return approved — the buyer has a prepaid label to your return address.", REJECT: "Return declined.", RECEIVE: "Marked received and refunded." };
    return { ok: true, message: verbs[decision] };
  }, ["/seller/returns"]);
}

export async function replyToReviewAction(reviewId: string, reply: string) {
  return guard(async () => {
    const { seller } = await assertSeller();
    const text = reply.trim();
    if (text.length < 5) return { ok: false, message: "Write a short reply." };
    const review = await db.review.findFirst({ where: { id: reviewId, sellerId: seller.id } });
    if (!review) return { ok: false, message: "Review not found." };
    await db.review.update({ where: { id: reviewId }, data: { sellerReply: text.slice(0, 1000), sellerRepliedAt: new Date() } });
    return { ok: true, message: "Reply published." };
  }, ["/seller/reviews"]);
}

export async function updateServiceAction(id: string, status: string, note?: string, quote?: number) {
  return guard(async () => {
    const { seller } = await assertSeller();
    await updateServiceRequest(seller.id, id, z.enum(ServiceStatus).parse(status), note, quote ? toMinor(quote, seller.defaultCurrency) : undefined);
    return { ok: true, message: "Service request updated." };
  }, ["/seller/orders"]);
}

// ── Commissions ───────────────────────────────────────────────────────────────

export async function submitQuoteAction(input: { requestId: string; amount: number; leadTimeDays: number; depositPercent: number; message: string }) {
  return guard(async () => {
    const { seller } = await assertSeller();
    if (!seller.acceptsCustomOrders) return { ok: false, message: "Turn on commissions in your store settings first." };
    if (input.amount <= 0 || input.leadTimeDays <= 0) return { ok: false, message: "Enter a price and a lead time." };
    if (input.message.trim().length < 20) return { ok: false, message: "Tell the buyer how you'd approach it (20+ characters)." };
    await submitQuote({ sellerId: seller.id, requestId: input.requestId, amountMinor: toMinor(input.amount, seller.defaultCurrency), currency: seller.defaultCurrency, leadTimeDays: input.leadTimeDays, depositPercent: Math.min(100, Math.max(0, input.depositPercent)), message: input.message.trim() });
    return { ok: true, message: "Quote sent." };
  }, ["/seller/custom-requests"]);
}

export async function setCommissionStatusAction(requestId: string, status: "IN_PRODUCTION" | "COMPLETED" | "DECLINED") {
  return guard(async () => {
    const { seller } = await assertSeller();
    await setCustomRequestStatus(seller.id, requestId, status);
    return { ok: true, message: "Commission updated." };
  }, ["/seller/custom-requests"]);
}

// ── Integrations ──────────────────────────────────────────────────────────────

export async function createIntegrationAction(input: { provider: "SHOPIFY" | "SQUARE" | "CUSTOM_API"; name: string; secret?: string; shopDomain?: string }): Promise<ActionResult & { apiKey?: string }> {
  return guard(async () => {
    const { seller } = await assertSeller();
    const name = input.name.trim() || `${input.provider.replace("_", " ")} sync`;
    if (input.provider === "CUSTOM_API") {
      const { apiKey } = await createCustomApiIntegration(seller.id, name);
      return { ok: true, message: "API key created — copy it now, it won't be shown again.", apiKey };
    }
    if (!input.secret || input.secret.length < 8) return { ok: false, message: "Paste the webhook signing secret from your POS." };
    await createWebhookIntegration(seller.id, input.provider, name, input.secret, input.shopDomain);
    return { ok: true, message: "Connected. Add the webhook URL below to your POS." };
  }, ["/seller/integrations"]);
}

export async function mapSkuAction(integrationId: string, variantId: string, externalId: string) {
  return guard(async () => {
    const { seller } = await assertSeller();
    const integration = await db.inventoryIntegration.findFirst({ where: { id: integrationId, sellerId: seller.id } });
    const variant = await db.productVariant.findFirst({ where: { id: variantId, sellerId: seller.id } });
    if (!integration || !variant) return { ok: false, message: "Not found." };
    if (!externalId.trim()) return { ok: false, message: "Enter the POS item id." };
    await db.externalSkuMapping.upsert({
      where: { integrationId_variantId: { integrationId, variantId } },
      update: { externalId: externalId.trim(), externalSku: variant.sku },
      create: { integrationId, variantId, externalId: externalId.trim(), externalSku: variant.sku },
    });
    return { ok: true, message: `${variant.sku} mapped.` };
  }, ["/seller/integrations"]);
}

export async function disconnectIntegrationAction(integrationId: string) {
  return guard(async () => {
    const { seller } = await assertSeller();
    await db.inventoryIntegration.updateMany({ where: { id: integrationId, sellerId: seller.id }, data: { status: "DISCONNECTED", apiKeyHash: null } });
    return { ok: true, message: "Disconnected." };
  }, ["/seller/integrations"]);
}

// ── Store settings ────────────────────────────────────────────────────────────

const policySchema = z.object({
  returnWindowDays: z.coerce.number().int().min(0).max(90),
  handlingDays: z.coerce.number().int().min(0).max(30),
  acceptsOffers: z.boolean(),
  acceptsCustomOrders: z.boolean(),
});

export async function savePoliciesAction(input: z.input<typeof policySchema>) {
  return guard(async () => {
    const { seller } = await assertSeller();
    await db.sellerProfile.update({ where: { id: seller.id }, data: policySchema.parse(input) });
    return { ok: true, message: "Policies saved." };
  }, ["/seller/settings"]);
}

const rateSchema = z.object({
  zone: z.enum(ShippingZone),
  method: z.enum(ShippingMethod),
  carrier: z.enum(Carrier).nullable(),
  price: z.coerce.number().min(0),
  freeOver: z.coerce.number().min(0).nullable(),
  minDays: z.coerce.number().int().min(0).max(60),
  maxDays: z.coerce.number().int().min(0).max(90),
  insuranceRateBps: z.coerce.number().int().min(0).max(1000),
  isActive: z.boolean(),
});

export async function saveShippingRatesAction(rates: z.input<typeof rateSchema>[]) {
  return guard(async () => {
    const { seller } = await assertSeller();
    const parsed = z.array(rateSchema).parse(rates);
    const keys = new Set(parsed.map((r) => `${r.zone}:${r.method}`));
    if (keys.size !== parsed.length) return { ok: false, message: "Each zone can have each service level only once." };
    if (parsed.some((r) => r.maxDays < r.minDays)) return { ok: false, message: "Maximum days must be at least the minimum." };
    await db.$transaction([
      db.shippingRate.deleteMany({ where: { sellerId: seller.id } }),
      db.shippingRate.createMany({
        data: parsed.map((r) => ({
          sellerId: seller.id,
          zone: r.zone,
          method: r.method,
          carrier: r.carrier,
          priceMinor: toMinor(r.price, seller.defaultCurrency),
          currency: seller.defaultCurrency,
          freeOverMinor: r.freeOver ? toMinor(r.freeOver, seller.defaultCurrency) : null,
          minDays: r.minDays,
          maxDays: r.maxDays,
          insuranceRateBps: r.insuranceRateBps,
          isActive: r.isActive,
        })),
      }),
    ]);
    return { ok: true, message: "Rate card saved." };
  }, ["/seller/settings"]);
}

export async function changePlanAction(planCode: string) {
  return guard(async () => {
    const { seller, user } = await assertSeller();
    const plan = await db.subscriptionPlan.findUnique({ where: { code: planCode } });
    if (!plan?.isActive) return { ok: false, message: "Plan not found." };
    const now = new Date();
    const end = new Date(now);
    end.setMonth(end.getMonth() + (plan.interval === "YEAR" ? 12 : 1));
    await db.sellerSubscription.upsert({
      where: { sellerId: seller.id },
      update: { planId: plan.id, status: "ACTIVE", currentPeriodStart: now, currentPeriodEnd: end, cancelAtPeriodEnd: false },
      create: { sellerId: seller.id, planId: plan.id, status: "ACTIVE", currentPeriodStart: now, currentPeriodEnd: end },
    });
    if (Number(plan.priceMinor) > 0) {
      await db.ledgerEntry.create({ data: { type: "SUBSCRIPTION_FEE", amountMinor: plan.priceMinor, currency: plan.currency, amountUsdMinor: plan.priceMinor, sellerId: seller.id, description: `${plan.name} plan` } });
    }
    await notify(db, user.id, "SYSTEM", `You're on the ${plan.name} plan`, plan.description ?? undefined, "/seller/settings");
    return { ok: true, message: `Switched to ${plan.name}.` };
  }, ["/seller/settings"]);
}
