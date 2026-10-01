import { getCurrentUser, getSellerForUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { renderInvoice } from "@/server/documents/invoice";

export async function GET(req: Request, { params }: { params: Promise<{ orderNumber: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { orderNumber } = await params;
  const order = await db.order.findUnique({
    where: { orderNumber },
    include: { payments: true, sellerOrders: { include: { items: true, seller: { select: { id: true, storeName: true, legalBusinessName: true, city: true, country: true, taxIdLast4: true } } } } },
  });
  if (!order) return new Response("Not found", { status: 404 });

  // Buyers and admins see the whole invoice; a jeweler sees only their part.
  let sellerOrderId: string | undefined;
  if (order.buyerId !== user.id && user.role !== "ADMIN") {
    const seller = user.role === "SELLER" ? await getSellerForUser(user.id) : null;
    const mine = seller && order.sellerOrders.find((so) => so.seller.id === seller.id);
    if (!mine) return new Response("Not found", { status: 404 });
    sellerOrderId = mine.id;
  } else {
    sellerOrderId = new URL(req.url).searchParams.get("part") ?? undefined;
  }

  const bytes = await renderInvoice(order, sellerOrderId);
  return new Response(new Uint8Array(bytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="loupe-invoice-${orderNumber}.pdf"`, "Cache-Control": "private, no-store" },
  });
}
