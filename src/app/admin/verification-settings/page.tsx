import type { Metadata } from "next";
import { PageHeader } from "@/components/account/page-header";
import { VerificationSettingsForm } from "@/components/admin/verification-settings-form";
import { Card, CardHeader } from "@/components/ui/display";
import { formatDate } from "@/lib/format";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db";

export const metadata: Metadata = { title: "Verification settings" };

export default async function VerificationSettingsPage() {
  await requireAdmin();
  const settings = await db.platformSettings.findUniqueOrThrow({ where: { id: "platform" }, select: { requiredKycDocuments: true, updatedAt: true } });
  return (
    <>
      <PageHeader eyebrow="Verification" title="Verification settings" description="Document requirements for jeweler onboarding and application review." />
      <Card>
        <CardHeader title="Required documents" description={`Last changed ${formatDate(settings.updatedAt, "dateTime")}`} />
        <div className="p-5"><VerificationSettingsForm initial={settings.requiredKycDocuments} /></div>
      </Card>
    </>
  );
}
