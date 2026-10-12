import { Sparkles, Mail, Phone } from "lucide-react";
import { PageHeader } from "@/components/account/page-header";
import { EmptyState } from "@/components/ui/display";
import { InquiryStatusSelect } from "@/components/seller/inquiry-status";
import { formatDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { num } from "@/lib/utils";
import { requireSeller } from "@/server/auth/session";
import { db } from "@/server/db";
import { inquiryContacts, inquiryStatusesForSeller } from "@/server/services/jeweler-directory";

export default async function CustomRequests() {
  const { seller } = await requireSeller();
  const [requests, statuses, contacts] = await Promise.all([
    db.customRequest.findMany({ where: { sellerId: seller.id }, orderBy: { createdAt: "desc" }, include: { buyer: { select: { name: true, email: true, phone: true } }, category: { select: { name: true } } } }),
    inquiryStatusesForSeller(seller.id),
    inquiryContacts(seller.id),
  ]);
  const contactMap = new Map(contacts.map((r) => [r.id, r]));
  const statusMap = new Map(statuses.map((r) => [r.id, r.inquiryStatus]));
  return <><PageHeader title="Custom Requests" description="Private requests from customers who selected your business." /><p className="mb-6 text-sm text-muted">Contact the customer to discuss their idea. Closing a request finishes the inquiry; it does not record a sale.</p>{!requests.length ? <EmptyState icon={<Sparkles />} title="No custom requests yet">When a customer chooses your business and submits a request, it will appear here.</EmptyState> : <ul className="space-y-5">{requests.map((r) => <li key={r.id} className="rounded-[3px] border border-line bg-porcelain p-5 sm:p-7">
    <div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-xs text-muted">{r.reference} · {formatDate(r.createdAt)}</p><h2 className="mt-2 font-display text-2xl text-ink">{r.title}</h2><p className="mt-1 text-sm text-muted">{r.buyer.name}{r.category && ` · ${r.category.name}`}</p></div>{r.status === "CANCELLED" ? <span className="rounded-full bg-parchment px-3 py-1 text-sm">Cancelled by customer</span> : <InquiryStatusSelect id={r.id} status={statusMap.get(r.id) ?? "NEW"} />}</div>
    <p className="mt-5 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-soft">{r.description}</p><div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">{r.budgetMaxMinor !== null && <p>Budget: {r.budgetMinMinor !== null && `${formatMoney(num(r.budgetMinMinor), r.currency)} – `}{formatMoney(num(r.budgetMaxMinor), r.currency)}</p>}{r.neededBy && <p>Preferred date: {formatDate(r.neededBy)}</p>}{r.ringSize && <p>Ring size: US {r.ringSize}</p>}{r.metalPreference && <p>Metal: {r.metalPreference.replaceAll("_", " ").toLowerCase()}</p>}{r.gemstonePreference && <p>Stone: {r.gemstonePreference.toLowerCase()}</p>}</div>
    {r.referenceImageUrls?.length > 0 && <div className="mt-4 flex flex-wrap gap-3">{r.referenceImageUrls.filter((url) => /^(https?:\/\/|\/api\/files\/|\/uploads\/)/.test(url)).map((url, i) => <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="text-sm underline">Reference image {i + 1}</a>)}</div>}
    <div className="mt-5 flex flex-wrap gap-4 border-t border-line pt-4 text-sm"><a href={`mailto:${r.buyer.email}`} className="inline-flex items-center gap-2 text-ink underline"><Mail size={16} />Email customer</a>{contactMap.get(r.id)?.contactPhone && <a href={`tel:${(contactMap.get(r.id)?.contactPhone || "").replace(/[^+\d]/g, "")}`} className="inline-flex items-center gap-2 text-ink underline"><Phone size={16} />Call customer</a>}{contactMap.get(r.id)?.contactWhatsapp && <a href={`https://wa.me/${contactMap.get(r.id)!.contactWhatsapp}`} target="_blank" rel="noopener noreferrer" className="underline">WhatsApp customer</a>}</div>
  </li>)}</ul>}</>;
}
