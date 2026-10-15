type Env = Record<string, string | undefined>;
export type CloudStorageConfig = {
  bucket: string; privateBucket: string; region: string; accessKeyId: string;
  secretAccessKey: string; endpoint?: string; publicBaseUrl: string;
};
export class StorageConfigurationError extends Error {}

export function resolveStorageConfig(env: Env): CloudStorageConfig | null {
  const value = (key: string) => env[key]?.trim() || undefined;
  const required = env.NODE_ENV === "production" || env.VERCEL === "1";
  const bucket = value("S3_BUCKET");
  const hasCloudSettings = Object.keys(env).some(key => key.startsWith("S3_") && value(key));
  if (!bucket && !required && !hasCloudSettings) return null;
  const endpoint = value("S3_ENDPOINT");
  const region = value("S3_REGION") ?? (endpoint ? "auto" : undefined);
  const privateBucket = value("S3_PRIVATE_BUCKET");
  const accessKeyId = value("S3_ACCESS_KEY_ID");
  const secretAccessKey = value("S3_SECRET_ACCESS_KEY");
  const missing = [!bucket && "S3_BUCKET", !privateBucket && "S3_PRIVATE_BUCKET", !region && "S3_REGION", !accessKeyId && "S3_ACCESS_KEY_ID", !secretAccessKey && "S3_SECRET_ACCESS_KEY"].filter(Boolean);
  if (missing.length) throw new StorageConfigurationError("Missing storage settings: " + missing.join(", "));
  if (bucket === privateBucket) throw new StorageConfigurationError("Public and private upload buckets must be different.");
  const publicBaseUrl = value("S3_PUBLIC_BASE_URL") ?? (!endpoint ? `https://${bucket}.s3.${region}.amazonaws.com` : undefined);
  if (!publicBaseUrl) throw new StorageConfigurationError("S3_PUBLIC_BASE_URL is required with a custom endpoint.");
  for (const url of [endpoint, publicBaseUrl].filter((v): v is string => !!v)) {
    let parsed: URL;
    try { parsed = new URL(url); } catch { throw new StorageConfigurationError("Storage URLs must use HTTPS."); }
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash) throw new StorageConfigurationError("Storage URLs must use HTTPS without credentials or query strings.");
  }
  return { bucket: bucket!, privateBucket: privateBucket!, region: region!, accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey!, endpoint, publicBaseUrl: publicBaseUrl.replace(/\/$/, "") };
}
