import type { Metadata } from "next";
import { LoginPageContent } from "@/components/auth/login-page";
import type { SearchParams } from "@/lib/utils";

export const metadata: Metadata = { title: "Customer login" };

export default function LoginPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return <LoginPageContent intent="buyer" searchParams={searchParams} />;
}
