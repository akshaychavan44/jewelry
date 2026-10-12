import { PageHeader } from "@/components/account/page-header";
import { PasswordForm } from "@/components/account/settings-forms";
import { requireSeller } from "@/server/auth/session";
import { db } from "@/server/db";
import { signOutAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";

export default async function JewelerAccount() {
  const { user } = await requireSeller();
  const account = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
  return <><PageHeader title="Account" description="Manage your sign-in details." /><section className="space-y-6 rounded-[3px] border border-line bg-porcelain p-6"><div><p className="caps text-xs text-muted">Sign-in email</p><p className="mt-2 break-all text-ink">{user.email}</p><p className="mt-1 text-sm text-muted">Contact support if you need to change this address.</p></div><hr className="border-line" /><h2 className="font-display text-2xl">Password</h2><PasswordForm hasPassword={!!account.passwordHash} /></section><form action={signOutAction} className="mt-6"><Button variant="outline">Sign out</Button></form></>;
}
