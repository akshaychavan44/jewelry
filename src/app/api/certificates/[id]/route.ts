import { db } from "@/server/db";
import { renderCertificateSummary } from "@/server/documents/certificate";
import { storage } from "@/server/services/storage";

// Certificates of *listed* pieces are public so buyers can inspect them before
// purchasing. Certificates on drafts or unapproved stores are not served.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cert = await db.certificate.findUnique({
    where: { id },
    include: { file: true, product: { select: { title: true, status: true, seller: { select: { storeName: true, verificationStatus: true } } } } },
  });
  const listed = cert && ["ACTIVE", "SOLD"].includes(cert.product.status) && cert.product.seller.verificationStatus === "APPROVED";
  if (!cert || !listed || cert.status === "REJECTED") return new Response("Not found", { status: 404 });

  const headers = { "Content-Disposition": `inline; filename="${cert.lab.toLowerCase()}-${cert.reportNumber}.pdf"`, "Cache-Control": "private, max-age=300" };

  if (cert.file) {
    const signed = await storage().signedUrl(cert.file.key, cert.file.visibility);
    if (signed) return Response.redirect(signed, 302);
    const bytes = await storage().get(cert.file.key, cert.file.visibility);
    if (bytes) return new Response(new Uint8Array(bytes), { headers: { ...headers, "Content-Type": cert.file.mimeType } });
  }

  const pdf = await renderCertificateSummary(cert, cert.product.title, cert.product.seller.storeName);
  return new Response(new Uint8Array(pdf), { headers: { ...headers, "Content-Type": "application/pdf" } });
}
