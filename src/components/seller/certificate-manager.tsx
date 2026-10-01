"use client";

import { FileText, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { LabMark } from "@/components/brand/hallmark";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/display";
import { Field } from "@/components/ui/field";
import { Input, NativeSelect } from "@/components/ui/input";
import type { CertificateLab, CertificateStatus } from "@/generated/prisma/enums";
import { CLARITY_SCALE, CUT_GRADES, GEMSTONES, LABS, STONE_SHAPES } from "@/lib/jewelry";
import { cn } from "@/lib/utils";
import { addCertificateAction, removeCertificateAction } from "@/server/actions/seller";

type Cert = { id: string; lab: CertificateLab; reportNumber: string; status: CertificateStatus; variantSku: string | null; hasFile: boolean };

export function CertificateManager({ productId, certificates, variants }: { productId: string; certificates: Cert[]; variants: { id: string; sku: string; title: string }[] }) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [lab, setLab] = useState<CertificateLab>("GIA");
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const hallmark = lab === "BIS_HALLMARK" || lab === "ASSAY_OFFICE";

  return (
    <Card>
      <CardHeader title="Certificates & hallmarks" description="Attach the laboratory PDF to the exact SKU it grades. Loupe checks every report before it shows as verified." />
      {certificates.length > 0 && (
        <ul className="divide-y divide-line border-b border-line">
          {certificates.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-[13.5px]">
              <LabMark lab={c.lab} />
              <span className="font-mono text-ink">{c.reportNumber}</span>
              <span className="text-muted">{c.variantSku ? `SKU ${c.variantSku}` : "Whole listing"}</span>
              {c.hasFile && <FileText className="size-4 text-ink-soft" aria-label="PDF attached" />}
              <span className={cn("ml-auto rounded-full px-2.5 py-0.5 text-[11.5px]", c.status === "VERIFIED" ? "bg-moss-mist text-moss" : c.status === "REJECTED" ? "bg-rosewood-mist text-rosewood" : "bg-amber-mist text-amber")}>
                {c.status === "PENDING_REVIEW" ? "Awaiting Loupe check" : c.status.toLowerCase()}
              </span>
              <button
                type="button"
                className="text-[12.5px] text-ink-soft underline-offset-4 hover:underline"
                onClick={() =>
                  start(async () => {
                    const res = await removeCertificateAction(c.id);
                    if (res.ok) toast.success(res.message);
                    else toast.error(res.message);
                    router.refresh();
                  })
                }
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        ref={form}
        className="grid gap-4 p-5 md:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            const res = await addCertificateAction(productId, fd);
            if (res.ok) {
              toast.success(res.message);
              form.current?.reset();
              setFileName(null);
              router.refresh();
            } else toast.error(res.message);
          });
        }}
      >
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files[0];
            if (f && fileInput.current) {
              const dt = new DataTransfer();
              dt.items.add(f);
              fileInput.current.files = dt.files;
              setFileName(f.name);
            }
          }}
          className={cn("flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[3px] border border-dashed px-4 py-6 text-center text-[13px] md:col-span-4", dragging ? "border-sage bg-sage-mist" : "border-line-strong bg-ivory text-ink-soft")}
        >
          <UploadCloud className="size-6" strokeWidth={1.3} />
          {fileName ? <span className="text-ink">{fileName}</span> : <span>Drop the report PDF here, or click to choose</span>}
          <input ref={fileInput} type="file" name="file" accept="application/pdf,image/jpeg,image/png" className="sr-only" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)} />
        </label>
        <Field label="Laboratory" htmlFor="c-lab">
          <NativeSelect id="c-lab" name="lab" value={lab} onChange={(e) => setLab(e.target.value as CertificateLab)}>
            {(Object.keys(LABS) as CertificateLab[]).map((l) => (
              <option key={l} value={l}>{LABS[l].name}</option>
            ))}
          </NativeSelect>
        </Field>
        <Field label={hallmark ? "HUID / hallmark ref" : "Report number"} htmlFor="c-num">
          <Input id="c-num" name="reportNumber" required className="font-mono" />
        </Field>
        <Field label="Applies to" htmlFor="c-var">
          <NativeSelect id="c-var" name="variantId" defaultValue="">
            <option value="">Whole listing</option>
            {variants.map((v) => (
              <option key={v.id} value={v.id}>{v.sku} · {v.title}</option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Issued" htmlFor="c-date" optional>
          <Input id="c-date" name="issuedAt" type="date" />
        </Field>
        {hallmark ? (
          <Field label="Purity mark" htmlFor="c-pur" optional hint="e.g. 22K916 or 750">
            <Input id="c-pur" name="hallmarkPurity" />
          </Field>
        ) : (
          <>
            <Field label="Stone" htmlFor="c-gem" optional>
              <NativeSelect id="c-gem" name="gemstone" defaultValue="">
                <option value="">—</option>
                {(Object.keys(GEMSTONES) as (keyof typeof GEMSTONES)[]).filter((g) => g !== "NONE").map((g) => (
                  <option key={g} value={g}>{GEMSTONES[g]}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Shape" htmlFor="c-shape" optional>
              <NativeSelect id="c-shape" name="shape" defaultValue="">
                <option value="">—</option>
                {(Object.keys(STONE_SHAPES) as (keyof typeof STONE_SHAPES)[]).map((s) => (
                  <option key={s} value={s}>{STONE_SHAPES[s]}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Carat" htmlFor="c-ct" optional><Input id="c-ct" name="caratWeight" inputMode="decimal" /></Field>
            <Field label="Colour" htmlFor="c-col" optional><Input id="c-col" name="colorGrade" placeholder="E" /></Field>
            <Field label="Clarity" htmlFor="c-cla" optional>
              <NativeSelect id="c-cla" name="clarityGrade" defaultValue="">
                <option value="">—</option>
                {CLARITY_SCALE.map((c) => (
                  <option key={c.grade} value={c.grade}>{c.grade}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Cut" htmlFor="c-cut" optional>
              <NativeSelect id="c-cut" name="cutGrade" defaultValue="">
                <option value="">—</option>
                {(Object.keys(CUT_GRADES) as (keyof typeof CUT_GRADES)[]).map((c) => (
                  <option key={c} value={c}>{CUT_GRADES[c]}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Measurements" htmlFor="c-meas" optional><Input id="c-meas" name="measurements" placeholder="6.41 × 6.44 × 3.97 mm" /></Field>
            <Field label="Origin / treatment" htmlFor="c-orig" optional><Input id="c-orig" name="origin" placeholder="Natural · no indications of heating" /></Field>
          </>
        )}
        <div className="flex items-end md:col-span-4">
          <Button type="submit" pending={pending}>Attach report</Button>
        </div>
      </form>
    </Card>
  );
}
