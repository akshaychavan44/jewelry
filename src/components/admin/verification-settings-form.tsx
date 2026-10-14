"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/controls";
import type { KycDocumentType } from "@/generated/prisma/enums";
import { KYC_DOCUMENT_LABELS } from "@/lib/status";
import { updateVerificationSettingsAction } from "@/server/actions/admin";

export function VerificationSettingsForm({ initial }: { initial: KycDocumentType[] }) {
  const [documents, setDocuments] = useState(initial);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <form className="space-y-6" onSubmit={(event) => {
      event.preventDefault();
      start(async () => {
        const result = await updateVerificationSettingsAction({ requiredKycDocuments: documents });
        if (result.ok) {
          toast.success(result.message);
          router.refresh();
        } else toast.error(result.message);
      });
    }}>
      <fieldset disabled={pending}>
        <legend className="mb-3 text-[12px] tracking-[0.08em] text-muted uppercase">Required jeweler documents</legend>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(KYC_DOCUMENT_LABELS) as KycDocumentType[]).map((type) => (
            <label key={type} className="flex items-center gap-3 rounded-[3px] border border-line px-3.5 py-2.5 text-[14px] text-ink-soft">
              <Checkbox checked={documents.includes(type)} onCheckedChange={(checked) => setDocuments((current) => checked ? [...current, type] : current.filter((item) => item !== type))} />
              {KYC_DOCUMENT_LABELS[type]}
            </label>
          ))}
        </div>
        <p className="mt-3 text-[12.5px] text-muted">Require at least one document. These requirements are used by jeweler onboarding and application review.</p>
      </fieldset>
      <Button type="submit" pending={pending} disabled={documents.length === 0}>Save verification settings</Button>
    </form>
  );
}
