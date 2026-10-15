"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { setAccountView } from "@/server/account-view";
import { safeCallback } from "@/lib/auth-routing";

export async function switchAccountView(view: "customer" | "seller", callback?: string) {
  const destination = z.enum(["customer", "seller"]).parse(view);
  const user = await requireUser("/account");
  if (user.role !== "SELLER") redirect("/account");
  await setAccountView(destination);
  revalidatePath("/", "layout");
  redirect(safeCallback(callback) ?? (destination === "customer" ? "/" : "/seller"));
}
