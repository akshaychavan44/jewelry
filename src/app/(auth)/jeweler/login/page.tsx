import type { Metadata } from "next";
import { LoginPageContent } from "@/components/auth/login-page";
import type { SearchParams } from "@/lib/utils";

export const metadata: Metadata = { title: "Jeweler login" };

export default function JewelerLoginPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return <LoginPageContent intent="seller" searchParams={searchParams} />;
}
