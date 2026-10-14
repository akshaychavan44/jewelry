import { getCurrentUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { getDocumentAccess } from "@/server/services/document-access";
import { storage } from "@/server/services/storage";
import { documentResponse } from "@/lib/document-response";
import { DATABASE_UNAVAILABLE_MESSAGE, isDatabaseUnavailable } from "@/lib/database-errors";

// Private files (KYC documents, certificate originals) are only streamed after
// an authorisation check — never from a public URL. Admins may open anything;
// a jeweler may open their own store's documents; anyone may open what they uploaded.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    return await serveDocument(req, params);
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error;
    return new Response(DATABASE_UNAVAILABLE_MESSAGE, { status: 503, headers: { "Cache-Control": "private, no-store", "Retry-After": "3" } });
  }
}

async function serveDocument(req: Request, params: Promise<{ id: string }>) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const access = await getDocumentAccess(user, id);
  if (!access) return new Response("Not found", { status: 404 });
  const { file, auditSellerId } = access;

  // Identity documents are sensitive: record every admin access.
  const audit = auditSellerId
    ? db.auditLog.create({ data: { actorId: user.id, action: "kyc_document.view", entityType: "SellerProfile", entityId: auditSellerId, metadata: { fileId: file.id } } })
    : Promise.resolve();
  const content = async () => {
    if (file.visibility === "PUBLIC" && file.url) return Response.redirect(new URL(file.url, req.url), 302);
    const signed = await storage().signedUrl(file.key, file.visibility, 120);
    if (signed) return new Response(null, { status: 302, headers: { Location: signed, "Cache-Control": "private, no-store" } });
    const bytes = await storage().get(file.key, file.visibility);
    if (!bytes) return new Response("Not found", { status: 404 });
    return documentResponse(bytes, file.mimeType, file.fileName, new URL(req.url).searchParams.get("download") === "1", req.headers.get("range"));
  };
  // Fetch the authorized file while recording the audit, but do not return any
  // bytes unless the required audit write succeeds.
  const [, response] = await Promise.all([audit, content()]);
  return response;
}
