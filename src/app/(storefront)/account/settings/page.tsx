import { PageHeader } from "@/components/account/page-header";
import { PasswordForm, ProfileForm } from "@/components/account/settings-forms";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db";

export default async function SettingsPage() {
  const current = await requireUser("/account/settings");
  const user = await db.user.findUniqueOrThrow({ where: { id: current.id }, include: { accounts: { select: { provider: true } } } });
  return (
    <>
      <PageHeader title="Settings" />
      <section className="rounded-[3px] border border-line bg-porcelain p-6">
        <h2 className="caps mb-5 text-ink">Profile</h2>
        <ProfileForm initial={{ name: user.name ?? "", phone: user.phone ?? "", preferredCurrency: user.preferredCurrency, marketingOptIn: user.marketingOptIn, email: user.email }} />
      </section>
      <section className="mt-6 rounded-[3px] border border-line bg-porcelain p-6">
        <h2 className="caps mb-2 text-ink">Sign-in</h2>
        <p className="mb-5 text-[13.5px] text-muted">
          {user.accounts.length ? `Linked with ${user.accounts.map((a) => a.provider.charAt(0).toUpperCase() + a.provider.slice(1)).join(" and ")}.` : "Signing in with email and password."}
        </p>
        <PasswordForm hasPassword={!!user.passwordHash} />
      </section>
    </>
  );
}
