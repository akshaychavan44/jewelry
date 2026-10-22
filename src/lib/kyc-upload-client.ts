import { withRequestDeadline } from "./request-deadline";
import { uploadImage } from "./image-upload-client";

type UploadResponse = { direct?: boolean; ticket?: string; uploadUrl?: string; headers?: Record<string, string>; fileId?: string; message?: string };

async function uploadRequest(body: Record<string, unknown>): Promise<UploadResponse> {
  return withRequestDeadline(async (signal) => {
    const response = await fetch("/api/uploads/kyc", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
    const data: UploadResponse = await response.json();
    if (!response.ok) throw new Error(data.message ?? "Unable to upload your document. Please try again.");
    return data;
  }, 20_000, "The document service did not respond. Please try again.");
}

/** Keep document bytes out of the server-action request on cloud deployments. */
export async function uploadKycDocuments(form: FormData, onStatus?: (message: string) => void): Promise<void> {
  for (const [name, value] of [...form.entries()]) {
    if (!name.startsWith("doc_") || !(value instanceof File) || !value.size) continue;
    onStatus?.(`Uploading ${value.name}…`);
    const uploaded = await uploadImage(value, "KYC_DOCUMENT", (progress) => {
      onStatus?.(progress >= 100 ? `Verifying ${value.name}…` : `Uploading ${value.name}: ${Math.round(progress)}%`);
    });
    if (uploaded) {
      form.delete(name);
      form.set(`${name}_fileId`, uploaded.fileId);
      continue;
    }
    const prepared = await uploadRequest({ step: "prepare", fileName: value.name, mimeType: value.type, sizeBytes: value.size });
    if (prepared.direct === false) continue; // Local development keeps disk uploads.
    if (!prepared.uploadUrl || !prepared.ticket || !prepared.headers) throw new Error("Unable to start document upload.");
    const response = await withRequestDeadline(
      (signal) => fetch(prepared.uploadUrl!, { method: "PUT", headers: prepared.headers, body: value, credentials: "omit", signal }),
      90_000, `${value.name}: upload timed out. Please try again.`,
    );
    if (!response.ok) throw new Error(`${value.name}: upload failed. Please try again.`);
    onStatus?.(`Verifying ${value.name}…`);
    const completed = await uploadRequest({ step: "complete", ticket: prepared.ticket });
    if (!completed.fileId) throw new Error("Unable to confirm document upload.");
    form.delete(name);
    form.set(`${name}_fileId`, completed.fileId);
  }
  // Empty file controls otherwise still get serialized by FormData.
  for (const [name, value] of [...form.entries()]) if (value instanceof File && !value.size) form.delete(name);
}
