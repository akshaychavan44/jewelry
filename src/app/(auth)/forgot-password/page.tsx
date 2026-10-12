import { PasswordResetForm } from "@/components/auth/password-reset-form";
export default function ForgotPassword() {
  return <><p className="eyebrow">Account access</p><h1 className="mb-4 font-display text-4xl">Forgot your password?</h1><p className="mb-6 text-sm leading-relaxed text-muted">Enter the email used for your customer or jeweler account.</p><PasswordResetForm /></>;
}
