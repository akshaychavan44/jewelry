import "server-only";
import { UTApi, UTFile } from "uploadthing/server";
import type { FileVisibility } from "@/lib/domain-enums";

/** Keep our existing logical keys as UploadThing custom IDs. */
export class UploadThingDriver {
  constructor(private api: Pick<UTApi, "uploadFiles" | "getSignedURL" | "deleteFiles"> = new UTApi({ defaultKeyType: "customId" })) {}

  async put(key: string, bytes: Buffer, contentType: string, visibility: FileVisibility) {
    const file = new UTFile([new Uint8Array(bytes)], key.split("/").at(-1) ?? "image", { type: contentType, customId: key });
    const result = await this.api.uploadFiles(file, { acl: visibility === "PRIVATE" ? "private" : "public-read" });
    if (result.error) throw new Error("The storage provider could not save this file. Please try again.");
    return { url: visibility === "PUBLIC" ? result.data.ufsUrl : null };
  }

  async signedUrl(key: string, _visibility: FileVisibility, expiresInSeconds = 300) {
    // Resolving custom IDs requires the API-backed signing method.
    const result = await this.api.getSignedURL(key, { keyType: "customId", expiresIn: expiresInSeconds });
    return result.ufsUrl;
  }

  async get(key: string, visibility: FileVisibility) {
    const url = await this.signedUrl(key, visibility);
    const response = await fetch(url, { cache: "no-store" });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error("The storage provider could not read this file. Please try again.");
    return Buffer.from(await response.arrayBuffer());
  }

  async remove(key: string, _visibility: FileVisibility) {
    const result = await this.api.deleteFiles(key, { keyType: "customId" });
    if (!result.success) throw new Error("The storage provider could not remove this file.");
  }
}
