"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { buildQuote, type CheckoutQuote, CheckoutError, type CheckoutSelections, addressSnapshot, placeOrder } from "@/server/services/checkout";
import { getPriceContext } from "@/server/services/currency";

const selectionsSchema = z.object({
  shipping: z.record(z.string(), z.string()),
  signature: z.record(z.string(), z.boolean()),
  dutiesMode: z.enum(["DDP", "DAP"]),
});

export type QuoteResult = { ok: true; quote: CheckoutQuote } | { ok: false; message: string };

export async function quoteCheckoutAction(addressId: string, selections: CheckoutSelections): Promise<QuoteResult> {
  const user = await assertUser();
  const address = await db.address.findFirst({ where: { id: addressId, userId: user.id } });
  if (!address) return { ok: false, message: "Choose a delivery address." };
  try {
    const { quote } = await buildQuote({ userId: user.id, destination: addressSnapshot(address), selections: selectionsSchema.parse(selections), ctx: await getPriceContext() });
    return { ok: true, quote };
  } catch (error) {
    if (error instanceof CheckoutError) return { ok: false, message: error.message };
    throw error;
  }
}

export type PlaceOrderResult =
  | { ok: true; status: "paid"; orderNumber: string }
  | { ok: true; status: "requires_payment"; orderNumber: string; clientSecret: string }
  | { ok: false; message: string };

export async function placeOrderAction(input: {
  addressId: string;
  billingAddressId?: string | null;
  selections: CheckoutSelections;
  paymentMethodId?: string | null;
  note?: string | null;
}): Promise<PlaceOrderResult> {
  const user = await assertUser();
  try {
    const result = await placeOrder({
      userId: user.id,
      shippingAddressId: input.addressId,
      billingAddressId: input.billingAddressId,
      selections: selectionsSchema.parse(input.selections),
      ctx: await getPriceContext(),
      demoPaymentMethodId: input.paymentMethodId,
      note: input.note?.slice(0, 500),
    });
    revalidatePath("/", "layout");
    return { ok: true, ...result };
  } catch (error) {
    if (error instanceof CheckoutError) return { ok: false, message: error.message };
    throw error;
  }
}

const addressSchema = z.object({
  fullName: z.string().trim().min(2, "Enter the recipient's name."),
  company: z.string().trim().optional(),
  line1: z.string().trim().min(3, "Enter the street address."),
  line2: z.string().trim().optional(),
  city: z.string().trim().min(2, "Enter the city."),
  region: z.string().trim().optional(),
  postalCode: z.string().trim().min(2, "Enter the postal code."),
  country: z.string().length(2, "Choose a country."),
  phone: z.string().trim().min(6, "A phone number is required for insured delivery."),
  label: z.string().trim().optional(),
  isDefault: z.boolean().default(false),
});

export type AddressFormState = { ok?: boolean; addressId?: string; fieldErrors?: Record<string, string[] | undefined>; message?: string };

export async function saveAddressAction(_: AddressFormState, formData: FormData): Promise<AddressFormState> {
  const user = await assertUser();
  const raw = Object.fromEntries(formData);
  const parsed = addressSchema.safeParse({ ...raw, isDefault: raw.isDefault === "on" });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const id = typeof raw.id === "string" && raw.id ? raw.id : null;
  const data = { ...parsed.data, country: parsed.data.country.toUpperCase(), type: "SHIPPING" as const };

  const address = await db.$transaction(async (tx) => {
    if (data.isDefault) await tx.address.updateMany({ where: { userId: user.id, type: "SHIPPING" }, data: { isDefault: false } });
    if (id) {
      const owned = await tx.address.findFirst({ where: { id, userId: user.id } });
      if (!owned) throw new Error("Address not found");
      return tx.address.update({ where: { id }, data });
    }
    const count = await tx.address.count({ where: { userId: user.id, type: "SHIPPING" } });
    return tx.address.create({ data: { ...data, userId: user.id, isDefault: data.isDefault || count === 0 } });
  });
  revalidatePath("/checkout");
  revalidatePath("/account/addresses");
  return { ok: true, addressId: address.id, message: "Address saved." };
}

export async function deleteAddressAction(id: string) {
  const user = await assertUser();
  await db.address.deleteMany({ where: { id, userId: user.id, type: { not: "RETURN" } } });
  revalidatePath("/account/addresses");
}
