# Desktop customer and jeweler experience

Loupe is a discovery directory. Customers browse jewelry and jeweler profiles, save favorites, submit custom requests to one chosen jeweler, and review their own experiences. Conversations, quotes, purchases, payment and delivery happen separately.

## Customer account

- Overview, My Custom Requests, My Reviews, Saved Pieces, Saved Jewelers, Settings.
- Custom requests require an approved, available jeweler and a contact phone. WhatsApp and up to three private reference images are optional (JPEG/PNG/WebP, 3 MB each). Email comes from the signed-in account.
- The chosen jeweler alone receives the request. Customers can see New / Contacted / Closed and cancel an unfinished request.
- One experience review per customer per jeweler; customers can edit or remove it. Reviews are not labeled verified purchases. Legacy purchase reviews remain separate.
- Retired chat, offers, cart and checkout pages redirect to the directory. Existing records are preserved.

## Jeweler dashboard

- Overview, My Business, My Jewelry, Custom Requests, Reviews, Account.
- Add and edit jewelry with photos, category, description, metal, stone and guide price. New pieces use the business's currency; existing pieces retain their currency and variants.
- Two independent visibility controls: public profile, and shared website jewelry listings/directory previews. Drafts are private everywhere. Archived pieces can be restored by editing and saving.
- Visibility is enforced in search, filters, counts, recommendations, directory previews, profiles, saved jewelry and direct product URL eligibility. Paused businesses are omitted from discovery.
- Review replies are public. Jewelers can report a review; only admins can hide it. Hidden reviews stop contributing to the rating.
- Approved jewelers land on Overview. Unfinished and pending accounts continue through setup/approval. Public business-registration links become My Dashboard for signed-in jewelers.

## Migration and configuration

Run `node scripts/migrate-jeweler-dashboard.mjs` for the additive migration. It uses a direct connection, validates in a transaction and rolls back before applying. No seed/reset is required. The general migration runner includes the new migration too.

Password recovery uses Resend's [send email API](https://resend.com/docs/api-reference/emails/send-email). Set `RESEND_API_KEY`, `AUTH_EMAIL_FROM` (a verified sender), and `NEXT_PUBLIC_APP_URL` to activate delivery. Never put an API key in a public environment variable. Without a sender, recovery clearly reports unavailability. Reset tokens are hashed, expire after 30 minutes, are consumed once atomically and invalidate older sessions. Recovery requests are throttled per account for one minute.

Public demo contact details remain until configured. Set `NEXT_PUBLIC_SUPPORT_EMAIL`, `NEXT_PUBLIC_INSTAGRAM_URL`, `NEXT_PUBLIC_PINTEREST_URL`, and `NEXT_PUBLIC_TIKTOK_URL` when ready. Unconfigured brand social links are hidden.

## Validation

- `npm run build`
- `node node_modules/typescript/bin/tsc --noEmit`
- `node --conditions=react-server --import tsx scripts/check-discovery.ts`
- `node --conditions=react-server --import tsx scripts/check-jeweler-dashboard.ts`

The database checks always roll back fixtures. They cover surface visibility, drafts, paused businesses, request ownership, cancellation, private reference access, reviews without orders, rating changes after moderation and password-recovery token consumption. The core discovery checks and the existing dashboard regression checks passed. The recovery check exposed a transaction-time expiry edge case, corrected by using `clock_timestamp()`; its final rerun was interrupted by database WebSocket connection failures.

Desktop browser checks verified customer login/overview and the jeweler overview, jewelry list and editor. The final custom-request page check was blocked by the same database connection failures. Mobile refinements/testing are deferred.
