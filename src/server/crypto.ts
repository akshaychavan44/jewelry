import "server-only";

import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Field-level encryption (AES-256-GCM) for tax IDs, bank details and
// integration secrets. Format: v1.<iv>.<tag>.<ciphertext> (base64url).

function key() {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error("ENCRYPTION_KEY is not configured");
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) throw new Error("ENCRYPTION_KEY must be 32 bytes, base64-encoded");
  return buf;
}

export function encrypt(plaintext: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), body.toString("base64url")].join(".");
}

export function decrypt(payload: string) {
  const [version, iv, tag, body] = payload.split(".");
  if (version !== "v1" || !iv || !tag || !body) throw new Error("Unrecognised ciphertext");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8");
}

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function hmacSha256(secret: string, payload: string | Buffer, encoding: "hex" | "base64" = "hex") {
  return createHmac("sha256", secret).update(payload).digest(encoding);
}

export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function lastFour(value: string) {
  return value.replace(/\s+/g, "").slice(-4);
}
