import { getCurrentUser, getSellerForUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { renderPackingSlip } from "@/server/documents/logistics";

export async function GET(_req: Request, { params }: { params: Promise<{ sellerOrderId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { sellerOrderId } = await params;
  const so = await db.sellerOrder.findUnique({
    where: { id: sellerOrderId },
    include: { order: { select: { orderNumber: true, shippingAddress: true, placedAt: true, createdAt: true } }, items: true, seller: { select: { storeName: true, returnWindowDays: true } } },
  });
  if (!so) return new Response("Not found", { status: 404 });
  const seller = user.role === "SELLER" ? await getSellerForUser(user.id) : null;
  if (user.role !== "ADMIN" && seller?.id !== so.sellerId) return new Response("Not found", { status: 404 });

  const bytes = await renderPackingSlip(so);
  return new Response(new Uint8Array(bytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="packing-slip-${so.reference}.pdf"`, "Cache-Control": "private, no-store" },
  });
}
