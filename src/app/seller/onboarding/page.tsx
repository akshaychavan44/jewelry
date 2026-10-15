import { isListedJeweler } from "@/lib/jeweler-listing";
import { AlertTriangle, ShieldOff } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BusinessForm, StoreProfileForm, SubmitApplicationForm } from "@/components/seller/onboarding-forms";
import { countryName } from "@/lib/regions";
import { cn, firstParam, humanize, type SearchParams } from "@/lib/utils";
import { requireUser } from "@/server/auth/session";
import { getDirectorySettings } from "@/server/services/jeweler-directory";
import { db } from "@/server/db";
import type { KycDocumentType } from "@/lib/domain-enums";

export const metadata: Metadata = { title: "Open your store" };

const STEPS = ["Store profile", "Business verification", "Review & submit"];

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser("/seller/onboarding");
  if (user.role === "BUYER") {
    await db.user.update({ where: { id: user.id }, data: { role: "SELLER" } });
  }
  const seller = await db.sellerProfile.findUnique({
    where: { userId: user.id },
    include: {
      returnAddress: true,
      kycDocuments: { where: { submissionId: null }, include: { file: { select: { fileName: true } } } },
      kycSubmissions: { orderBy: { submittedAt: "desc" }, take: 1 },
    },
  });
  if (seller && isListedJeweler(seller.verificationStatus)) redirect("/seller");

  if (seller?.verificationStatus === "SUSPENDED") {
    return (
      <div className="text-center">
        <ShieldOff className="mx-auto size-11 text-rosewood" strokeWidth={1.2} />
        <h1 className="display-lg mt-6 text-ink">{seller.storeName} is suspended</h1>
        <p className="mx-auto mt-4 max-w-lg text-[15px] text-ink-soft">{seller.suspensionReason ?? "Your store has been suspended pending a review."}</p>
        <p className="mt-6 text-[14px] text-ink-soft">
          Contact <a className="underline" href="mailto:trust@loupe.example">trust@loupe.example</a> to discuss reinstatement.
        </p>
      </div>
    );
  }

  const socials = seller ? await getDirectorySettings(seller.id) : undefined;
  const requested = Number(firstParam((await searchParams).step));
  const maxStep = seller?.onboardingStep ?? 1;
  const step = Number.isFinite(requested) && requested >= 1 && requested <= Math.min(3, maxStep) ? requested : Math.min(3, maxStep);
  const uploaded = Object.fromEntries(
    (seller?.kycDocuments ?? [])
      .filter((d) => d.file?.fileName)
      .map((d) => [d.type, d.file.fileName])
  ) as Partial<Record<KycDocumentType, string>>;

  return (
    <>
      <p className="eyebrow mb-3">Open your store</p>
      <h1 className="display-lg text-ink">{seller?.storeName ?? "Tell us about your atelier"}</h1>

      {seller?.verificationStatus === "REJECTED" && seller.kycSubmissions[0]?.reviewerNotes && (
        <div className="mt-6 flex gap-3 rounded-[3px] border border-rosewood/25 bg-rosewood-mist px-5 py-4 text-[14px] text-rosewood">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">Changes needed before we can approve your store</p>
            <p className="mt-1">{seller.kycSubmissions[0].reviewerNotes}</p>
          </div>
        </div>
      )}

      <ol className="mt-10 mb-10 grid grid-cols-3 gap-2" aria-label="Application steps">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const reachable = n <= maxStep;
          const inner = (
            <>
              <span className={cn("block h-1 rounded-full", n <= step ? "bg-sage" : n <= maxStep ? "bg-sage/40" : "bg-line")} />
              <span className={cn("mt-2 block text-[12px] tracking-[0.04em]", n === step ? "text-ink" : "text-muted")}>
                <span className="font-mono">{n}</span> · {label}
              </span>
            </>
          );
          return (
            <li key={label} aria-current={n === step ? "step" : undefined}>
              {reachable ? <Link href={`/seller/onboarding?step=${n}`}>{inner}</Link> : inner}
            </li>
          );
        })}
      </ol>

      <section className="rounded-[3px] border border-line bg-porcelain p-6 md:p-8">
        {step === 1 && (
          <StoreProfileForm userId={user.id}
            store={
              seller
                ? { ...seller, returnAddress: seller.returnAddress, socials: socials ? { instagram: socials.instagram, facebook: socials.facebook, youtube: socials.youtube, whatsapp: socials.whatsapp, publicEmail: socials.publicEmail, maps: socials.maps } : undefined }
                : { storeName: "", country: user.country ?? "US", defaultCurrency: user.preferredCurrency ?? "USD" }
            }
          />
        )}
        {step === 2 && seller && <BusinessForm userId={user.id} values={seller} uploaded={uploaded} />}
        {step === 3 && seller && (
          <div className="space-y-8">
            <dl className="grid gap-x-8 gap-y-4 text-[14px] sm:grid-cols-2">
              {[
                ["Store", `${seller.storeName}${seller.city ? ` · ${seller.city}` : ""}${seller.country ? `, ${countryName(seller.country)}` : ""}`],
                ["Currency", seller.defaultCurrency],
                ["Business", `${seller.legalBusinessName ?? "—"} (${seller.businessType ? humanize(seller.businessType) : "—"})`],
                ["Registration", seller.registrationNumber ?? "—"],
                ["Tax ID", seller.taxIdLast4 ? `••••${seller.taxIdLast4}` : "—"],
                ["Documents", Object.keys(uploaded).map((t) => humanize(t)).join(", ") || "None uploaded"],
                ["Business address", seller.returnAddress ? `${seller.returnAddress.line1}, ${seller.returnAddress.city}` : "—"],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[11.5px] tracking-[0.1em] text-muted uppercase">{label}</dt>
                  <dd className="mt-0.5 text-ink">{value}</dd>
                </div>
              ))}
            </dl>
            <SubmitApplicationForm />
          </div>
        )}
      </section>
    </>
  );
}
