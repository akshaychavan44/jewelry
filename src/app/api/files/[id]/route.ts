import { getCurrentUser, getSellerForUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { storage } from "@/server/services/storage";

// Private files (KYC documents, certificate originals) are only streamed after
// an authorisation check — never from a public URL. Admins may open anything;
// a jeweler may open their own store's documents; anyone may open what they uploaded.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const file = await db.fileAsset.findUnique({
    where: { id },
    include: { kycDocument: { select: { sellerId: true } }, certificate: { select: { product: { select: { sellerId: true } } } } },
  });
  if (!file) return new Response("Not found", { status: 404 });

  let allowed = user.role === "ADMIN" || file.uploadedById === user.id;
  if (!allowed && user.role === "SELLER") {
    const seller = await getSellerForUser(user.id);
    allowed = !!seller && (file.kycDocument?.sellerId === seller.id || file.certificate?.product.sellerId === seller.id);
  }
  if (!allowed) return new Response("Not found", { status: 404 });

  // Identity documents are sensitive: record every admin access.
  if (file.kycDocument && user.role === "ADMIN") {
    await db.auditLog.create({ data: { actorId: user.id, action: "kyc_document.view", entityType: "SellerProfile", entityId: file.kycDocument.sellerId, metadata: { fileId: file.id } } });
  }

  if (file.visibility === "PUBLIC" && file.url) return Response.redirect(new URL(file.url, req.url), 302);
  const signed = await storage().signedUrl(file.key, file.visibility, 120);
  if (signed) return Response.redirect(signed, 302);

  const bytes = await storage().get(file.key, file.visibility);
  if (!bytes) return new Response("Not found", { status: 404 });
  const download = new URL(req.url).searchParams.get("download") === "1";
  const name = file.fileName.replace(/[^\w.\- ]+/g, "_");
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${name}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
