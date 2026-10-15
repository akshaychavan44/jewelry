import { z } from "zod";
import { getCurrentUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { prepareKycUpload, completeKycUpload } from "@/server/services/kyc-upload";
import { UploadError } from "@/server/services/storage";
import { isDatabaseUnavailable, DATABASE_UNAVAILABLE_MESSAGE } from "@/lib/database-errors";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
  if (request.headers.get("origin") !== new URL(request.url).origin) return reply({ message: "Invalid request origin." }, 403);
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "SELLER" && user.role !== "ADMIN")) return reply({ message: "Sign in to your jeweler account first." }, 401);
    const seller = await db.sellerProfile.findUnique({ where: { userId: user.id }, select: { id: true, verificationStatus: true } });
    if (!seller || !["NOT_SUBMITTED", "REJECTED"].includes(seller.verificationStatus)) return reply({ message: "Your verification documents cannot be changed right now." }, 403);
    const raw = await request.text();
    if (raw.length > 4096) return reply({ message: "Upload request is too large." }, 413);
    let input: unknown;
    try { input = JSON.parse(raw); } catch { return reply({ message: "Invalid upload request." }, 400); }
    const body = z.discriminatedUnion("step", [
      z.object({ step: z.literal("prepare"), fileName: z.string(), mimeType: z.string(), sizeBytes: z.number() }),
      z.object({ step: z.literal("complete"), ticket: z.string().max(3000) }),
    ]).parse(input);
    if (body.step === "prepare") return reply(await prepareKycUpload(user.id, seller.id, body));
    return reply({ fileId: await completeKycUpload(user.id, seller.id, body.ticket) });
  } catch (error) {
    if (error instanceof UploadError) return reply({ message: error.message }, 400);
    if (error instanceof z.ZodError) return reply({ message: error.issues[0]?.message ?? "Invalid upload request." }, 400);
    if (isDatabaseUnavailable(error)) return reply({ message: DATABASE_UNAVAILABLE_MESSAGE }, 503);
    console.error("KYC upload failed:", error);
    return reply({ message: "We could not upload your document. Please try again later." }, 503);
  }
}
