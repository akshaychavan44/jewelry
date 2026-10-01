"use client";

import { ExternalLink, FileText, ShieldCheck } from "lucide-react";
import { Hallmark, LabMark } from "@/components/brand/hallmark";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { MetalType } from "@/generated/prisma/enums";
import { formatDate } from "@/lib/format";
import { CLARITY_SCALE, CUT_GRADES, GEMSTONES, LABS, STONE_SHAPES } from "@/lib/jewelry";
import type { CertificateView } from "@/server/services/product";

export function CertificateList({ certificates, metal }: { certificates: CertificateView[]; metal: MetalType }) {
  return (
    <section aria-labelledby="authenticity-heading" className="rounded-[3px] border border-line bg-porcelain">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 id="authenticity-heading" className="caps text-ink">
            Authenticity &amp; certification
          </h2>
          <p className="mt-1 text-[13px] text-muted">Reports are checked against the listing before it goes live.</p>
        </div>
        <Hallmark metal={metal} />
      </div>
      {certificates.length === 0 ? (
        <p className="px-5 py-5 text-[14px] text-ink-soft">
          This piece is sold with the jeweler&rsquo;s own certificate of authenticity and metal hallmark. Ask the jeweler for photographs of the hallmark before you buy.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {certificates.map((c) => (
            <CertificateRow key={c.id} cert={c} />
          ))}
        </ul>
      )}
    </section>
  );
}

function CertificateRow({ cert }: { cert: CertificateView }) {
  const lab = LABS[cert.lab];
  const verify = lab.verify?.(cert.reportNumber);
  const clarity = CLARITY_SCALE.find((c) => c.grade === cert.clarityGrade);
  const facts: [string, string | null][] = [
    ["Stone", cert.gemstone ? GEMSTONES[cert.gemstone] : null],
    ["Shape", cert.shape ? STONE_SHAPES[cert.shape] : null],
    ["Carat", cert.caratWeight ? `${cert.caratWeight.toFixed(2)} ct` : null],
    ["Colour", cert.colorGrade],
    ["Clarity", clarity ? `${clarity.grade}` : null],
    ["Cut", cert.cutGrade ? CUT_GRADES[cert.cutGrade] : null],
    ["Polish / symmetry", cert.polish && cert.symmetry ? `${CUT_GRADES[cert.polish]} / ${CUT_GRADES[cert.symmetry]}` : null],
    ["Fluorescence", cert.fluorescence],
    ["Measurements", cert.measurements],
    ["Origin", cert.origin],
    ["Purity", cert.hallmarkPurity],
    ["Assay office", cert.assayOffice],
  ];
  const shown = facts.filter(([, v]) => v);
  return (
    <li className="px-5 py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <LabMark lab={cert.lab} />
          <div>
            <p className="text-[14px] text-ink">{lab.full}</p>
            <p className="data text-muted">
              {cert.lab === "BIS_HALLMARK" ? "HUID" : "Report"} {cert.reportNumber}
              {cert.issuedAt && ` · ${formatDate(cert.issuedAt)}`}
            </p>
          </div>
        </div>
        {cert.verified && (
          <span className="inline-flex items-center gap-1 text-[12px] text-sage-deep">
            <ShieldCheck className="size-3.5" /> Checked by Loupe
          </span>
        )}
      </div>

      {shown.length > 0 && (
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-3">
          {shown.map(([label, value]) => (
            <div key={label}>
              <dt className="text-[11px] tracking-[0.08em] text-muted uppercase">{label}</dt>
              <dd className="text-[13.5px] text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {cert.notes && <p className="mt-3 text-[13px] text-ink-soft">{cert.notes}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="subtle" size="sm">
              <FileText /> View report
            </Button>
          </DialogTrigger>
          <DialogContent size="xl" className="h-[calc(100dvh-2rem)]">
            <DialogHeader>
              <DialogTitle>
                {lab.name} {cert.reportNumber}
              </DialogTitle>
              <DialogDescription>{lab.full}</DialogDescription>
            </DialogHeader>
            <iframe src={`/api/certificates/${cert.id}`} title={`${lab.name} report ${cert.reportNumber}`} className="w-full flex-1 bg-white" />
          </DialogContent>
        </Dialog>
        {verify && (
          <Button asChild variant="ghost" size="sm">
            <a href={verify} target="_blank" rel="noreferrer">
              Verify with {lab.name} <ExternalLink />
            </a>
          </Button>
        )}
      </div>
    </li>
  );
}
