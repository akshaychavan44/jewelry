import { AlertTriangle, Check, Clock, ShieldOff } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BusinessForm, StoreProfileForm, SubmitApplicationForm } from "@/components/seller/onboarding-forms";
import { formatDate } from "@/lib/format";
import { countryName } from "@/lib/regions";
import { cn, firstParam, humanize, type SearchParams } from "@/lib/utils";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db";
import type { KycDocumentType } from "@/generated/prisma/enums";

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
  if (seller?.verificationStatus === "APPROVED") redirect("/seller");

  if (seller?.verificationStatus === "PENDING") {
    return (
      <div className="text-center">
        <Clock className="mx-auto size-11 text-gold" strokeWidth={1.2} />
        <p className="eyebrow mt-6">Application received</p>
        <h1 className="display-lg mt-3 text-ink">We&rsquo;re reviewing {seller.storeName}</h1>
        <p className="mx-auto mt-4 max-w-lg text-[15.5px] text-ink-soft">
          Submitted {formatDate(seller.submittedAt, "long")}. Our verification team checks your registration against business registers and validates your atelier credentials — usually within two working days.
        </p>
        <ol className="mx-auto mt-10 max-w-md space-y-3 text-left">
          {["Application submitted", "Business registry checks", "Identity & atelier verification", "Listing profile goes live"].map((s, i) => (
            <li key={s} className="flex items-center gap-3 rounded-[3px] border border-line bg-porcelain px-4 py-3 text-[14px]">
              <span className={cn("grid size-6 place-items-center rounded-full", i === 0 ? "bg-sage text-white" : "border border-line-strong text-muted")}>{i === 0 ? <Check className="size-3.5" /> : <span className="text-[11px]">{i + 1}</span>}</span>
              <span className={i === 0 ? "text-ink" : "text-ink-soft"}>{s}</span>
            </li>
          ))}
        </ol>
        <p className="mt-8 text-[13.5px] text-muted">Your jeweler dashboard unlocks as soon as you&rsquo;re approved. We&rsquo;ll email you and notify you here.</p>
      </div>
    );
  }

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
          <StoreProfileForm
            store={
              seller
                ? { ...seller, returnAddress: seller.returnAddress }
                : { storeName: "", country: user.country ?? "US", defaultCurrency: user.preferredCurrency ?? "USD" }
            }
          />
        )}
        {step === 2 && seller && <BusinessForm values={seller} uploaded={uploaded} />}
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
                ["Return address", seller.returnAddress ? `${seller.returnAddress.line1}, ${seller.returnAddress.city}` : "—"],
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
