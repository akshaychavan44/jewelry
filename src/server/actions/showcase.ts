"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Gemstone, MetalType } from "@/lib/domain-enums";
import { AccessDenied, assertSeller } from "@/server/auth/session";
import { db } from "@/server/db";
import { randomCode, slugify } from "@/lib/utils";
import { toMinor, toUsdMinor } from "@/lib/money";
import { getFxRates } from "@/server/services/market";
import { ownedUpload, saveUpload, UploadError } from "@/server/services/storage";
export type ShowcaseState = { ok?: boolean; message?: string; productId?: string };
const schema = z.object({
  id: z.string().optional(), title: z.string().trim().min(3).max(150),
  description: z.string().trim().min(20).max(5000), categoryId: z.string().min(1, "Choose a category."),
  metal: z.enum(MetalType), gemstone: z.enum(Gemstone),
  price: z.coerce.number().positive().max(100000000),
});
function refresh(slug: string) {
  for (const path of ["/", "/shop", "/jewelers", `/jewelers/${slug}`, "/seller/products", "/seller", "/account/wishlist"]) revalidatePath(path);
  revalidatePath("/product/[slug]", "page");
}
export async function saveShowcaseAction(_: ShowcaseState, form: FormData): Promise<ShowcaseState> {
  try {
    const { seller, user } = await assertSeller({ verified: false, listed: true });
    const d = schema.parse({ ...Object.fromEntries(form), id: form.get("id") || undefined });
    const existing = d.id ? await db.product.findFirst({ where: { id: d.id, sellerId: seller.id, deletedAt: null }, include: { images: true, variants: { orderBy: { position: "asc" } } } }) : null;
    if (d.id && !existing) return { message: "Jewelry not found." };
    const category = await db.category.findFirst({ where: { id: d.categoryId, isActive: true } });
    if (!category) return { message: "Choose an available category." };
    const files = form.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
    const ids = z.array(z.string().min(1).max(128)).max(6).parse(form.getAll("images_fileId"));
    const directAssets = await Promise.all(ids.map(id => ownedUpload(id, "PRODUCT_MEDIA", user.id)));
    if (directAssets.length + files.length > 6 || directAssets.reduce((sum, asset) => sum + asset.sizeBytes, 0) + files.reduce((sum, file) => sum + file.size, 0) > 24 * 1024 * 1024) return { message: "Choose up to six images, totaling no more than 24 MB." };
    if (!existing?.images.length && !files.length && !directAssets.length) return { message: "Add at least one photo." };
    const showOnProfile = form.get("showOnProfile") === "on";
    const showOnWebsite = form.get("showOnWebsite") === "on";
    const draft = form.get("draft") === "on";
    const currency = existing?.currency ?? seller.defaultCurrency;
    const amount = toMinor(d.price, currency);
    if (amount < 1) return { message: "Enter a guide price of at least one minor currency unit." };
    const normalized = toUsdMinor(amount, currency, await getFxRates());
    const assets: Awaited<ReturnType<typeof saveUpload>>[] = [...directAssets];
    for (const file of files) assets.push(await saveUpload(file, "PRODUCT_MEDIA", seller.id, user.id));
    const product = await db.$transaction(async tx => {
      const data = { title: d.title, description: d.description, categoryId: d.categoryId, primaryMetal: d.metal, primaryGemstone: d.gemstone, basePriceMinor: amount, normalizedPriceUsd: normalized, pricingMode: "FIXED" as const, acceptsOffers: false, status: draft ? "DRAFT" as const : "ACTIVE" as const, publishedAt: draft ? existing?.publishedAt : existing?.publishedAt ?? new Date() };
      const p = existing ? await tx.product.update({ where: { id: existing.id }, data }) : await tx.product.create({ data: { ...data, sellerId: seller.id, slug: `${slugify(d.title)}-${randomCode(6).toLowerCase()}`, currency, shipsFromCountry: seller.country, shipsTo: [], tags: [], certificationLabs: [], inStock: true } });
      // Keep existing variants and certificates intact; update the main display variant only.
      const variant = existing?.variants.find(v => v.isDefault) ?? existing?.variants[0];
      if (variant) await tx.productVariant.update({ where: { id: variant.id }, data: { priceMinor: amount, metalType: d.metal, gemstone: d.gemstone, isActive: true } });
      else await tx.productVariant.create({ data: { productId: p.id, sellerId: seller.id, sku: `SHOW-${randomCode(10)}`, title: "Standard", metalType: d.metal, gemstone: d.gemstone, priceMinor: amount, isDefault: true, trackInventory: false, stockQuantity: 1 } });
      if (assets.length) {
        await tx.productImage.deleteMany({ where: { productId: p.id } });
        for (const [position, asset] of assets.entries()) await tx.productImage.create({ data: { productId: p.id, url: asset.url!, alt: d.title, position } });
      }
      await tx.$executeRaw`INSERT INTO "JewelryVisibility" ("productId", "showOnProfile", "showOnWebsite") VALUES (${p.id}, ${showOnProfile}, ${showOnWebsite}) ON CONFLICT ("productId") DO UPDATE SET "showOnProfile" = EXCLUDED."showOnProfile", "showOnWebsite" = EXCLUDED."showOnWebsite", "updatedAt" = CURRENT_TIMESTAMP`;
      return p;
    });
    refresh(seller.slug);
    return { ok: true, message: draft ? "Draft saved. This piece is private." : "Jewelry saved with your visibility choices.", productId: product.id };
  } catch (error) {
    if (error instanceof z.ZodError) return { message: error.issues[0]?.message };
    if (error instanceof AccessDenied || error instanceof UploadError) return { message: error.message };
    throw error;
  }
}
export async function archiveShowcaseAction(id: string): Promise<ShowcaseState> {
  const { seller } = await assertSeller({ verified: false, listed: true });
  const result = await db.product.updateMany({ where: { id, sellerId: seller.id, deletedAt: null }, data: { status: "ARCHIVED" } });
  if (!result.count) return { message: "Jewelry not found." };
  refresh(seller.slug);
  return { ok: true, message: "Jewelry archived and hidden from the website." };
}
