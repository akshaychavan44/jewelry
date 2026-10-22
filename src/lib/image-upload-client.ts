import { withRequestDeadline } from "./request-deadline";
import { genUploader } from "uploadthing/client";
import type { UploadRouter } from "@/server/uploadthing";

type Purpose = "PRODUCT_MEDIA" | "STORE_BRANDING" | "CERTIFICATE" | "KYC_DOCUMENT" | "CUSTOM_REQUEST_REFERENCE";
const { uploadFiles } = genUploader<UploadRouter>();

export async function uploadImage(file: File, purpose: Purpose, onProgress?: (progress: number) => void) {
  const config = await withRequestDeadline(async (signal) => {
    const response = await fetch("/api/uploads/provider", { cache: "no-store", signal });
    if (!response.ok) throw new Error("Unable to start the image upload. Please try again.");
    return await response.json() as { uploadthing: boolean };
  }, 15_000, "The upload service did not respond. Check your connection and try again.");
  if (!config.uploadthing) {
    if (process.env.NODE_ENV === "production") throw new Error("Image uploads are temporarily unavailable. Please try again later.");
    return null;
  }
  const endpoint = purpose === "KYC_DOCUMENT" || purpose === "CERTIFICATE" || purpose === "CUSTOM_REQUEST_REFERENCE" ? "privateImage" : "publicImage";
  const [result] = await withRequestDeadline(
    (signal) => uploadFiles(endpoint, {
      files: [file], input: { purpose }, signal,
      onUploadProgress: ({ progress }) => onProgress?.(progress),
    }),
    90_000,
    `${file.name}: upload or verification timed out. Your form details are still here. Please try again.`,
  );
  if (!result?.serverData?.fileId) throw new Error("Unable to confirm the image upload. Please try again.");
  return result.serverData;
}

export async function uploadFormImages(form: FormData, fields: Record<string, Purpose>) {
  for (const [name, purpose] of Object.entries(fields)) {
    const files = form.getAll(name).filter((value): value is File => value instanceof File && value.size > 0);
    const ids: string[] = [];
    for (const file of files) {
      const asset = await uploadImage(file, purpose);
      if (!asset) break;
      ids.push(asset.fileId);
    }
    if (ids.length && ids.length === files.length) {
      form.delete(name);
      for (const id of ids) form.append(`${name}_fileId`, id);
    }
  }
}
