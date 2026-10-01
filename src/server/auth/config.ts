import type { NextAuthConfig } from "next-auth";

// Edge-safe base configuration shared by the proxy (route protection) and the
// full server config. No database access here — the proxy only decodes the JWT.

const PROTECTED_PREFIXES = ["/account", "/checkout", "/seller", "/admin"];

const matches = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);

export const authConfig = {
  pages: { signIn: "/login", error: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  trustHost: true,
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const path = nextUrl.pathname;
      if (!PROTECTED_PREFIXES.some((p) => matches(path, p))) return true;
      const user = auth?.user;
      if (!user) return false; // → /login?callbackUrl=…

      if (matches(path, "/admin") && user.role !== "ADMIN") {
        return Response.redirect(new URL("/", nextUrl));
      }
      if (matches(path, "/seller") && user.role !== "SELLER") {
        return Response.redirect(new URL("/sell", nextUrl));
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = user.role ?? "BUYER";
      }
      return token;
    },
    session({ session, token }) {
      if (token.uid) session.user.id = token.uid;
      session.user.role = token.role ?? "BUYER";
      return session;
    },
  },
} satisfies NextAuthConfig;
