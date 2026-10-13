import "server-only";
import { siteConfig } from "@/config/site";

export type KycEmailDecision = "APPROVE" | "REJECT";

export type KycDecisionEmailInput = {
  toEmail: string;
  jewelerName: string;
  storeName: string;
  decision: KycEmailDecision;
  feedback?: string;
};

export async function sendKycDecisionEmail(input: KycDecisionEmailInput) {
  const isApproved = input.decision === "APPROVE";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || siteConfig.url || "http://localhost:3000";
  const targetUrl = isApproved
    ? new URL("/seller", baseUrl).href
    : new URL("/seller/onboarding", baseUrl).href;

  const subject = isApproved
    ? `Your Jeweler Application for ${input.storeName} is Approved · Loupe`
    : `Action Needed: Your Jeweler Application for ${input.storeName} · Loupe`;

  const html = isApproved
    ? `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Georgia, serif; line-height: 1.6; color: #231d17; max-width: 600px; margin: 0 auto; padding: 24px;">
  <div style="border-bottom: 2px solid #a8864f; padding-bottom: 16px; margin-bottom: 24px;">
    <h1 style="font-size: 26px; margin: 0; color: #231d17; font-weight: normal;">Loupe</h1>
    <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #73695e; margin: 4px 0 0;">Independent Jeweler Directory & Showcase</p>
  </div>
  
  <p style="font-size: 16px;">Hello ${input.jewelerName || input.storeName},</p>
  
  <p style="font-size: 16px;">We are pleased to inform you that your application for <strong>${input.storeName}</strong> has been approved by the Loupe administration team!</p>
  
  <p style="font-size: 15px; color: #554a3e;">Your jeweler studio and seller dashboard are now active. You can now access your account, list your fine jewelry pieces, manage client inquiries, and showcase your atelier to clients.</p>

  <div style="margin: 32px 0;">
    <a href="${targetUrl}" style="background-color: #231d17; color: #faf9f5; text-decoration: none; padding: 12px 24px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; display: inline-block; border-radius: 2px;">
      Open Your Jeweler Dashboard →
    </a>
  </div>

  <p style="font-size: 14px; color: #73695e; margin-top: 36px; border-top: 1px solid #e5d8c3; padding-top: 16px;">
    Welcome to Loupe.<br/>
    If you have any questions, you can reply directly to this email.
  </p>
</body>
</html>
    `
    : `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Georgia, serif; line-height: 1.6; color: #231d17; max-width: 600px; margin: 0 auto; padding: 24px;">
  <div style="border-bottom: 2px solid #a8864f; padding-bottom: 16px; margin-bottom: 24px;">
    <h1 style="font-size: 26px; margin: 0; color: #231d17; font-weight: normal;">Loupe</h1>
    <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #73695e; margin: 4px 0 0;">Independent Jeweler Directory & Showcase</p>
  </div>
  
  <p style="font-size: 16px;">Hello ${input.jewelerName || input.storeName},</p>
  
  <p style="font-size: 16px;">Thank you for your application to join Loupe. Our verification team has reviewed your application for <strong>${input.storeName}</strong>, and we require a few updates or document corrections before we can complete your verification.</p>

  ${
    input.feedback
      ? `
  <div style="background-color: #faf6ee; border-left: 3px solid #865d1b; padding: 16px; margin: 24px 0; border-radius: 2px;">
    <p style="margin: 0 0 6px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #865d1b; font-weight: bold;">Reviewer Feedback</p>
    <p style="margin: 0; font-size: 14.5px; color: #231d17;">${input.feedback}</p>
  </div>
      `
      : ""
  }

  <p style="font-size: 15px; color: #554a3e;">You can update your business information and re-upload the necessary documents directly by visiting your application page:</p>

  <div style="margin: 32px 0;">
    <a href="${targetUrl}" style="background-color: #231d17; color: #faf9f5; text-decoration: none; padding: 12px 24px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; display: inline-block; border-radius: 2px;">
      Update Your Application →
    </a>
  </div>

  <p style="font-size: 14px; color: #73695e; margin-top: 36px; border-top: 1px solid #e5d8c3; padding-top: 16px;">
    If you need any guidance regarding acceptable documentation, reply directly to this email or reach out to our verification team.
  </p>
</body>
</html>
    `;

  const text = isApproved
    ? `Hello ${input.jewelerName || input.storeName},\n\nCongratulations! Your jeweler application for ${input.storeName} has been approved by the Loupe administration team.\n\nYour jeweler studio is now active and unlocked.\nAccess your dashboard: ${targetUrl}\n\nWelcome to Loupe!`
    : `Hello ${input.jewelerName || input.storeName},\n\nThank you for your application for ${input.storeName}. Our verification team has reviewed your application and requested updates before your store can be approved.\n\nReviewer Feedback:\n${input.feedback || "Please review your documents and resubmit."}\n\nUpdate your application: ${targetUrl}`;

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.AUTH_EMAIL_FROM;

  if (!apiKey || !fromEmail) {
    console.log(`[KYC Email Mock] To: ${input.toEmail} | Subject: ${subject}`);
    console.log(`[KYC Email Mock] Content:\n${text}`);
    return { ok: true, mocked: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [input.toEmail],
        subject,
        text,
        html,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("KYC decision email delivery failed:", res.status, errText);
      return { ok: false, error: `Resend status ${res.status}` };
    }

    return { ok: true, mocked: false };
  } catch (err) {
    console.error("KYC decision email delivery error:", err);
    return { ok: false, error: String(err) };
  }
}
