import type { Metadata } from "next";
import { AdminLoginPageContent } from "@/components/auth/admin-login-page";
import type { SearchParams } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Admin Login · Loupe Operations",
  robots: { index: false },
};

export default function AdminLoginPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return <AdminLoginPageContent searchParams={searchParams} />;
}
