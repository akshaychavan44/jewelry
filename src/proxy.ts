import NextAuth from "next-auth";
import { authConfig } from "@/server/auth/config";

// Coarse, JWT-only route protection. Fine-grained checks (store verification,
// resource ownership) happen server-side in every page and action.
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: ["/account/:path*", "/checkout/:path*", "/seller/:path*", "/admin/:path*"],
};
