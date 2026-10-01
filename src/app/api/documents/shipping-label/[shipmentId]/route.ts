import { getCurrentUser, getSellerForUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { renderShippingLabel } from "@/server/documents/logistics";

export async function GET(_req: Request, { params }: { params: Promise<{ shipmentId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { shipmentId } = await params;
  const shipment = await db.shipment.findUnique({
    where: { id: shipmentId },
    include: {
      sellerOrder: { select: { reference: true, sellerId: true, order: { select: { buyerId: true } } } },
      returnRequest: { select: { rmaNumber: true, buyerId: true, sellerId: true } },
    },
  });
  if (!shipment) return new Response("Not found", { status: 404 });

  const seller = user.role === "SELLER" ? await getSellerForUser(user.id) : null;
  const sellerId = shipment.sellerOrder?.sellerId ?? shipment.returnRequest?.sellerId;
  const allowed =
    user.role === "ADMIN" ||
    (seller && seller.id === sellerId) ||
    (shipment.direction === "RETURN" && shipment.returnRequest?.buyerId === user.id);
  if (!allowed) return new Response("Not found", { status: 404 });

  const bytes = await renderShippingLabel(shipment);
  return new Response(new Uint8Array(bytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="label-${shipment.trackingNumber ?? shipment.id}.pdf"`, "Cache-Control": "private, no-store" },
  });
}
