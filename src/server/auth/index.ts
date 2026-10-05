import "server-only";

import bcrypt from "bcryptjs";
import NextAuth, { CredentialsSignin } from "next-auth";
import type { Provider } from "next-auth/providers";
import Apple from "next-auth/providers/apple";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { z } from "zod";
import { db } from "@/server/db";
import { authConfig } from "./config";

class SuspendedAccount extends CredentialsSignin {
  code = "suspended";
}

const credentialsSchema = z.object({
  email: z.email().transform((v) => v.trim().toLowerCase()),
  password: z.string().min(1),
});

/** OAuth providers are enabled only when their credentials are configured. */
export const oauthProviders = {
  google: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
  apple: Boolean(process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET),
};

const providers: Provider[] = [
  Credentials({
    name: "Email",
    credentials: { email: {}, password: {} },
    async authorize(raw) {
      const parsed = credentialsSchema.safeParse(raw);
      if (!parsed.success) return null;
      const user = await db.user.findFirst({
        where: { email: { equals: parsed.data.email, mode: "insensitive" } },
      });
      if (!user?.passwordHash) return null;
      const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
      if (!valid) return null;
      if (user.status !== "ACTIVE") throw new SuspendedAccount();
      await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
      return { id: user.id, email: user.email, name: user.name, image: user.image, role: user.role };
    },
  }),
];
if (oauthProviders.google) providers.push(Google({ allowDangerousEmailAccountLinking: true }));
if (oauthProviders.apple) providers.push(Apple);

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  ...authConfig,
  providers,
  callbacks: {
    ...authConfig.callbacks,

    /** OAuth sign-ins are linked to (or create) a local user record. */
    async signIn({ user, account, profile }) {
      if (!account || account.type === "credentials") return true;
      const email = (user.email ?? profile?.email)?.toLowerCase();
      if (!email) return false;

      const existing = await db.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
      if (existing && existing.status !== "ACTIVE") return "/login?error=suspended";

      const local =
        existing ??
        (await db.user.create({
          data: { email, name: user.name, image: user.image, emailVerified: new Date(), role: "BUYER" },
        }));

      await db.account.upsert({
        where: { provider_providerAccountId: { provider: account.provider, providerAccountId: account.providerAccountId } },
        update: { access_token: account.access_token, refresh_token: account.refresh_token, expires_at: account.expires_at, id_token: account.id_token },
        create: {
          userId: local.id,
          type: account.type,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          access_token: account.access_token,
          refresh_token: account.refresh_token,
          expires_at: account.expires_at,
          token_type: account.token_type,
          scope: account.scope,
          id_token: account.id_token,
        },
      });
      await db.user.update({ where: { id: local.id }, data: { lastLoginAt: new Date() } });
      user.id = local.id;
      user.role = local.role;
      return true;
    },

    /** Role is re-read from the database on sign-in and on explicit refresh. */
    async jwt({ token, user, trigger }) {
      if (user?.id) {
        token.uid = user.id;
        token.role = user.role ?? "BUYER";
      }
      if (trigger === "update" && token.uid) {
        const fresh = await db.user.findUnique({ where: { id: token.uid as string }, select: { role: true, name: true, image: true } });
        if (fresh) {
          token.role = fresh.role;
          token.name = fresh.name;
          token.picture = fresh.image;
        }
      }
      return token;
    },
  },
});
