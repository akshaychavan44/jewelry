import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { randomToken, safeEqual } from "@/server/crypto";
import { slugify } from "@/lib/utils";

// External REST API: Jewelers / Sellers Endpoint
// Enables external software / POS to automatically create, approve, and list jeweler profiles.
//
// Authentication:
//   Authorization: Bearer <EXTERNAL_API_KEY>  OR  x-api-key: <EXTERNAL_API_KEY>

const securityHeaders = {
  "Cache-Control": "private, no-cache",
  "X-Content-Type-Options": "nosniff",
};

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

const jewelerCreateSchema = z.object({
  storeName: z.string().min(2, "Store name must be at least 2 characters").max(100),
  email: z.string().email("A valid email address is required"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  tagline: z.string().max(200).optional(),
  bio: z.string().max(2000).optional(),
  country: z.string().min(2).max(3).default("US"),
  city: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
  whatsapp: z.string().max(30).optional(),
  publicEmail: z.string().email().optional(),
  defaultCurrency: z.string().min(3).max(3).default("USD"),
  foundedYear: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  specialties: z.array(z.string()).max(10).default([]),
  logoUrl: z.string().url().optional(),
  bannerUrl: z.string().url().optional(),
  socials: z
    .object({
      instagram: z.string().optional(),
      facebook: z.string().optional(),
      youtube: z.string().optional(),
      maps: z.string().optional(),
    })
    .optional(),
  address: z
    .object({
      line1: z.string().optional(),
      line2: z.string().optional(),
      city: z.string().optional(),
      region: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
});

async function uniqueSlug(name: string, excludeSellerId?: string): Promise<string> {
  const base = slugify(name) || "atelier";
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const taken = await db.sellerProfile.findFirst({
      where: { slug: candidate, ...(excludeSellerId ? { id: { not: excludeSellerId } } : {}) },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/**
 * GET /api/v1/jewelers
 * Query existing jewelers (by ?slug=..., ?email=..., or list).
 */
export async function GET(req: Request) {
  const apiKey = extractApiKey(req);
  if (!verifyApiKey(apiKey)) {
    return Response.json(
      { error: "Unauthorized. Provide a valid EXTERNAL_API_KEY via Bearer token or x-api-key header." },
      { status: 401, headers: securityHeaders }
    );
  }

  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  const email = searchParams.get("email");

  try {
    if (slug) {
      const seller = await db.sellerProfile.findUnique({
        where: { slug },
        include: { user: { select: { email: true, name: true, role: true } } },
      });
      if (!seller) return Response.json({ error: "Jeweler not found" }, { status: 404, headers: securityHeaders });
      return Response.json({ jeweler: seller }, { headers: securityHeaders });
    }

    if (email) {
      const user = await db.user.findFirst({
        where: { email: { equals: email.trim().toLowerCase(), mode: "insensitive" } },
        include: { sellerProfile: true },
      });
      if (!user || !user.sellerProfile) {
        return Response.json({ error: "No jeweler profile found for this email" }, { status: 404, headers: securityHeaders });
      }
      return Response.json({ jeweler: user.sellerProfile, user: { email: user.email, name: user.name } }, { headers: securityHeaders });
    }

    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10), 1), 100);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

    const jewelers = await db.sellerProfile.findMany({
      where: { verificationStatus: "APPROVED" },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      select: {
        id: true,
        storeName: true,
        slug: true,
        city: true,
        country: true,
        logoUrl: true,
        bannerUrl: true,
        tagline: true,
        specialties: true,
        verificationStatus: true,
        createdAt: true,
      },
    });

    const total = await db.sellerProfile.count({ where: { verificationStatus: "APPROVED" } });

    return Response.json({ jewelers, total, limit, offset }, { headers: securityHeaders });
  } catch (error) {
    console.error("GET /api/v1/jewelers error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500, headers: securityHeaders });
  }
}

/**
 * POST /api/v1/jewelers
 * Automatically creates, approves, and lists a jeweler profile from an external form.
 */
export async function POST(req: Request) {
  const apiKey = extractApiKey(req);
  if (!verifyApiKey(apiKey)) {
    return Response.json(
      { error: "Unauthorized. Provide a valid EXTERNAL_API_KEY via Bearer token or x-api-key header." },
      { status: 401, headers: securityHeaders }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON payload" }, { status: 400, headers: securityHeaders });
  }

  const parsed = jewelerCreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422, headers: securityHeaders }
    );
  }

  const data = parsed.data;
  const normalizedEmail = data.email.trim().toLowerCase();
  const normalizedCountry = (data.country || "US").trim().slice(0, 2).toUpperCase();

  try {
    // Check if user already exists
    const existingUser = await db.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: "insensitive" } },
      include: { sellerProfile: true },
    });

    if (existingUser?.sellerProfile) {
      return Response.json(
        {
          error: "A jeweler profile already exists for this email address.",
          jewelerId: existingUser.sellerProfile.id,
          slug: existingUser.sellerProfile.slug,
          profileUrl: `/jewelers/${existingUser.sellerProfile.slug}`,
        },
        { status: 409, headers: securityHeaders }
      );
    }

    const generatedPassword = data.password ? null : `Jewel_${randomToken(8)}`;
    const plainPassword = data.password || generatedPassword!;
    const passwordHash = await bcrypt.hash(plainPassword, 12);

    const result = await db.$transaction(async (tx) => {
      // 1. Get or create User
      let userId: string;
      if (existingUser) {
        userId = existingUser.id;
        await tx.user.update({
          where: { id: existingUser.id },
          data: {
            role: "SELLER",
            country: normalizedCountry,
            phone: data.phone || existingUser.phone,
            ...(existingUser.passwordHash ? {} : { passwordHash }),
          },
        });
      } else {
        const newUser = await tx.user.create({
          data: {
            name: data.storeName,
            email: normalizedEmail,
            passwordHash,
            role: "SELLER",
            country: normalizedCountry,
            phone: data.phone || null,
            status: "ACTIVE",
          },
        });
        userId = newUser.id;
      }

      // 2. Generate unique slug
      const slug = await uniqueSlug(data.storeName);

      // 3. Create SellerProfile marked as APPROVED for instant public listing
      const seller = await tx.sellerProfile.create({
        data: {
          userId,
          storeName: data.storeName,
          slug,
          tagline: data.tagline || null,
          bio: data.bio || null,
          logoUrl: data.logoUrl || null,
          bannerUrl: data.bannerUrl || null,
          country: normalizedCountry,
          city: data.city || null,
          defaultCurrency: data.defaultCurrency.toUpperCase(),
          foundedYear: data.foundedYear ?? null,
          specialties: data.specialties.slice(0, 6),
          onboardingStep: 4,
          verificationStatus: "APPROVED",
          approvedAt: new Date(),
          submittedAt: new Date(),
          acceptsCustomOrders: true,
          acceptsOffers: true,
        },
      });

      // 4. Create directory settings (socials, contacts)
      const socials = data.socials;
      const cleanPhone = (data.whatsapp || data.phone || "").replace(/\D/g, "");
      await tx.$executeRaw`
        INSERT INTO "JewelerDirectorySettings" 
          ("sellerId", "instagram", "facebook", "youtube", "whatsapp", "publicEmail", "maps", "isPaused", "updatedAt") 
        VALUES 
          (${seller.id}, ${socials?.instagram || ""}, ${socials?.facebook || ""}, ${socials?.youtube || ""}, ${cleanPhone}, ${data.publicEmail || normalizedEmail}, ${socials?.maps || ""}, false, CURRENT_TIMESTAMP)
        ON CONFLICT ("sellerId") DO UPDATE SET 
          "instagram" = EXCLUDED."instagram", 
          "facebook" = EXCLUDED."facebook", 
          "youtube" = EXCLUDED."youtube", 
          "whatsapp" = EXCLUDED."whatsapp", 
          "publicEmail" = EXCLUDED."publicEmail", 
          "maps" = EXCLUDED."maps", 
          "isPaused" = false,
          "updatedAt" = CURRENT_TIMESTAMP
      `;

      // 5. Create default store location
      const addr = data.address;
      await tx.storeLocation.create({
        data: {
          sellerId: seller.id,
          name: data.storeName,
          line1: addr?.line1 || "Main Studio",
          line2: addr?.line2 || null,
          city: addr?.city || data.city || "Headquarters",
          region: addr?.region || null,
          postalCode: addr?.postalCode || "00000",
          country: addr?.country ? addr.country.trim().slice(0, 2).toUpperCase() : normalizedCountry,
          phone: data.phone || null,
        },
      });

      // 6. Create default domestic shipping rate
      await tx.shippingRate.create({
        data: {
          sellerId: seller.id,
          zone: "DOMESTIC",
          method: "STANDARD_INSURED",
          carrier: "USPS",
          priceMinor: 0,
          currency: data.defaultCurrency.toUpperCase().slice(0, 3),
          minDays: 2,
          maxDays: 5,
          insuranceRateBps: 0,
          isActive: true,
        },
      });

      return { seller, userId };
    });

    // Revalidate public catalog paths so the jeweler immediately appears
    try {
      revalidatePath("/jewelers");
      revalidatePath(`/jewelers/${result.seller.slug}`);
      revalidatePath("/shop");
      revalidatePath("/");
    } catch {
      // Revalidation may fail outside request context in certain test runners, safe to ignore
    }

    return Response.json(
      {
        ok: true,
        message: "Jeweler profile created, approved, and listed successfully.",
        jeweler: {
          id: result.seller.id,
          userId: result.userId,
          storeName: result.seller.storeName,
          slug: result.seller.slug,
          email: normalizedEmail,
          verificationStatus: "APPROVED",
          profileUrl: `/jewelers/${result.seller.slug}`,
          dashboardUrl: "/seller",
        },
        credentials: {
          email: normalizedEmail,
          password: data.password ? "(as provided in request)" : generatedPassword,
          loginUrl: "/jeweler/login",
        },
      },
      { status: 201, headers: securityHeaders }
    );
  } catch (error) {
    console.error("POST /api/v1/jewelers error:", error);
    return Response.json(
      { error: "Failed to create jeweler profile", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: securityHeaders }
    );
  }
}
