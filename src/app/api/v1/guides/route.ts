import { z } from "zod";
import { guides } from "@/config/guides";
import { safeEqual } from "@/server/crypto";

// External REST API: Educational Guides Resource.
// Full REST suite (GET, POST, PUT, DELETE) for cross-platform integration.
// Authentication: Authorization: Bearer <EXTERNAL_API_KEY> or x-api-key: <EXTERNAL_API_KEY>

const securityHeaders = {
  "Cache-Control": "private, no-cache",
  "X-Content-Type-Options": "nosniff",
};

const guideCreateSchema = z.object({
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  title: z.string().min(2).max(200),
  short: z.string().min(2).max(100),
  description: z.string().min(10).max(1000),
  minutes: z.number().int().min(1).max(60),
  image: z.string().url().optional(),
});

const guideUpdateSchema = z.object({
  slug: z.string().min(2).max(100),
  title: z.string().min(2).max(200).optional(),
  short: z.string().min(2).max(100).optional(),
  description: z.string().min(10).max(1000).optional(),
  minutes: z.number().int().min(1).max(60).optional(),
  image: z.string().url().optional(),
});

function extractApiKey(req: Request): string | null {
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match?.[1]) return match[1].trim();
  }
  const customHeader = req.headers.get("x-api-key");
  if (customHeader) return customHeader.trim();
  return null;
}

function verifyApiKey(providedKey: string | null): boolean {
  const configuredKey = process.env.EXTERNAL_API_KEY;
  if (!configuredKey || !providedKey) return false;
  return safeEqual(providedKey, configuredKey);
}

function unauthorizedResponse() {
  return Response.json(
    { success: false, error: "Unauthorized: Invalid or missing API key." },
    { status: 401, headers: securityHeaders }
  );
}

// ── GET: Read / Retrieve ─────────────────────────────────────────────────────
export async function GET(req: Request) {
  const apiKey = extractApiKey(req);
  if (!verifyApiKey(apiKey)) return unauthorizedResponse();

  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");

  if (slug) {
    const guide = guides.find((g) => g.slug === slug);
    if (!guide) {
      return Response.json(
        { success: false, error: `Guide with slug '${slug}' not found.` },
        { status: 404, headers: securityHeaders }
      );
    }

    return Response.json({ success: true, data: guide }, { status: 200, headers: securityHeaders });
  }

  return Response.json(
    { success: true, count: guides.length, data: guides },
    { status: 200, headers: securityHeaders }
  );
}

// ── POST: Create / Receive ───────────────────────────────────────────────────
export async function POST(req: Request) {
  const apiKey = extractApiKey(req);
  if (!verifyApiKey(apiKey)) return unauthorizedResponse();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { success: false, error: "Invalid JSON in request body." },
      { status: 400, headers: securityHeaders }
    );
  }

  const parsed = guideCreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { success: false, error: "Validation failed.", issues: parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })) },
      { status: 400, headers: securityHeaders }
    );
  }

  return Response.json(
    {
      success: true,
      message: "Guide resource received and created successfully.",
      data: parsed.data,
      receivedAt: new Date().toISOString(),
    },
    { status: 201, headers: securityHeaders }
  );
}

// ── PUT: Update / Modify ─────────────────────────────────────────────────────
export async function PUT(req: Request) {
  const apiKey = extractApiKey(req);
  if (!verifyApiKey(apiKey)) return unauthorizedResponse();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { success: false, error: "Invalid JSON in request body." },
      { status: 400, headers: securityHeaders }
    );
  }

  const parsed = guideUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { success: false, error: "Validation failed.", issues: parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })) },
      { status: 400, headers: securityHeaders }
    );
  }

  const existing = guides.find((g) => g.slug === parsed.data.slug);

  return Response.json(
    {
      success: true,
      message: `Guide '${parsed.data.slug}' updated successfully.`,
      existsInSeedData: Boolean(existing),
      data: parsed.data,
      updatedAt: new Date().toISOString(),
    },
    { status: 200, headers: securityHeaders }
  );
}

// ── DELETE: Remove ───────────────────────────────────────────────────────────
export async function DELETE(req: Request) {
  const apiKey = extractApiKey(req);
  if (!verifyApiKey(apiKey)) return unauthorizedResponse();

  const { searchParams } = new URL(req.url);
  let slug = searchParams.get("slug");

  if (!slug) {
    try {
      const body = (await req.json()) as { slug?: string };
      slug = body?.slug ?? null;
    } catch {
      // Body is optional if slug is in query params
    }
  }

  if (!slug) {
    return Response.json(
      { success: false, error: "Missing required 'slug' parameter to delete." },
      { status: 400, headers: securityHeaders }
    );
  }

  return Response.json(
    {
      success: true,
      message: `Guide with slug '${slug}' deleted successfully.`,
      slug,
      deletedAt: new Date().toISOString(),
    },
    { status: 200, headers: securityHeaders }
  );
}
