import "server-only";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UTApi, UTFiles } from "uploadthing/server";
import { UploadThingError } from "uploadthing/server";
import { getCurrentUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { randomToken, sha256 } from "@/server/crypto";
import { UPLOAD_RULES, validImageContent } from "@/lib/upload-rules";
import { z } from "zod";

const f = createUploadthing();
const purposeSchema = z.enum(["PRODUCT_MEDIA", "STORE_BRANDING", "CERTIFICATE", "KYC_DOCUMENT", "CUSTOM_REQUEST_REFERENCE"]);

function imageRoute(visibility: "PUBLIC" | "PRIVATE") {
  return f({ image: { maxFileSize: "16MB", maxFileCount: 1, acl: "public-read" } }, { awaitServerData: true })
    .input(z.object({ purpose: purposeSchema }))
    .middleware(async ({ input, files }) => {
      const user = await getCurrentUser();
      if (!user) throw new UploadThingError({ code: "FORBIDDEN", message: "Sign in before uploading images." });
      const reference = input.purpose === "CUSTOM_REQUEST_REFERENCE";
      if (!reference && !["SELLER", "ADMIN"].includes(user.role)) throw new UploadThingError({ code: "FORBIDDEN", message: "Sign in to your jeweler account first." });
      const rule = UPLOAD_RULES[input.purpose];
      if (rule.visibility !== visibility) throw new UploadThingError("Invalid upload destination.");
      const file = files[0];
      if (!file || !rule.types.includes(file.type) || file.size <= 0 || file.size > rule.maxBytes) {
        throw new UploadThingError(`Choose a JPG, PNG or WebP image up to ${rule.maxBytes / 1024 / 1024} MB${input.purpose === "PRODUCT_MEDIA" ? " (AVIF is also accepted)" : ""}.`);
      }
      const seller = reference ? null : await db.sellerProfile.findUnique({ where: { userId: user.id } });
      if (!reference && input.purpose !== "STORE_BRANDING" && !seller) throw new UploadThingError("Set up your store profile first.");
      if (input.purpose === "KYC_DOCUMENT" && !["NOT_SUBMITTED", "REJECTED"].includes(seller!.verificationStatus)) {
        throw new UploadThingError("Your verification documents cannot be changed right now.");
      }
      if (input.purpose === "CERTIFICATE" && seller!.verificationStatus !== "APPROVED") throw new UploadThingError("Your store must be approved before attaching certificates.");
      const ownerId = reference || input.purpose === "STORE_BRANDING" ? user.id : seller!.id;
      const name = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").slice(-80);
      const key = `${input.purpose.toLowerCase().replace(/_/g, "-")}/${ownerId}/${randomToken(18)}-${name}`;
      return { userId: user.id, purpose: input.purpose, key, mimeType: file.type, fileName: file.name.slice(0, 200), sizeBytes: file.size, [UTFiles]: [{ ...file, customId: key }] };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const api = new UTApi();
      try {
        if (file.customId !== metadata.key || file.size !== metadata.sizeBytes) throw new Error("Upload metadata did not match.");
        const { ufsUrl } = await api.generateSignedURL(file.key, { expiresIn: 120 });
        const response = await fetch(ufsUrl, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
        if (!response.ok) throw new Error("Unable to verify the uploaded image.");
        const bytes = Buffer.from(await response.arrayBuffer());
        if (bytes.length !== metadata.sizeBytes || !validImageContent(bytes, metadata.mimeType)) throw new Error("The file content does not match its image type.");
        const existing = await db.fileAsset.findFirst({ where: { key: metadata.key, uploadedById: metadata.userId } });
        const asset = existing ?? await db.fileAsset.create({ data: {
          key: metadata.key, purpose: metadata.purpose, visibility,
          fileName: metadata.fileName, mimeType: metadata.mimeType, sizeBytes: bytes.length,
          checksum: sha256(bytes.toString("base64")), uploadedById: metadata.userId,
          url: file.ufsUrl,
        } });
        return { fileId: asset.id, url: asset.url };
      } catch (error) {
        await api.deleteFiles(file.key).catch(() => undefined);
        console.error("Image upload verification failed:", error);
        throw new UploadThingError("We could not verify this image. Please try uploading it again.");
      }
    });
}

export const uploadRouter = { publicImage: imageRoute("PUBLIC"), privateImage: imageRoute("PRIVATE") } satisfies FileRouter;
export type UploadRouter = typeof uploadRouter;
