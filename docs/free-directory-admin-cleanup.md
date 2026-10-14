# Free-directory admin cleanup

Implemented on 2026-10-14.

- Removed Listing Plans & Billing navigation, editors, subscription cards, commission controls, and associated billing mutations. `/admin/monetization` redirects to `/admin`.
- Added `/admin/verification-settings` using the existing persisted required-document settings. Updates validate the document types and require at least one document, check administrator access, and create an audit entry.
- Overview analytics now query directory traffic, showcases, verification, and custom enquiries without querying orders, revenue, subscriptions, or ledger entries.
- Removed payment-account details, plans, commissions, and order counts from jeweler details and Users. Featured and Top Rated controls, ratings, verification, and suspension remain.
- Removed the unused seller plan picker and subscription-switch action. Jewelry publication retains approval, photo, price, ownership, and idempotence gates without subscription or listing-fee dependencies.
- Suspension and reinstatement no longer alter historical payouts. No schema migration, financial-record deletion, or historical audit deletion was performed.
- Existing styling and responsive classes were retained. Pre-existing working-tree changes were preserved.

## Verification

- `npx tsx --test src/lib/auth-routing.test.ts src/lib/jeweler-contact.test.ts src/lib/review-rating.test.ts src/server/db/model-delegate.test.ts src/server/db/query-builder.test.ts`: 20 passed, 0 failed.
- `node --conditions=react-server --import tsx scripts/check-free-directory.ts`: passed isolated service checks for fee-free publishing, quality gates, idempotence, document settings, historical financial-field preservation, badges, suspension/reinstatement, account controls, KYC approval/rejection, onboarding requirements, and directory analytics. No live business records are changed by this fixture.
- `node scripts/check-free-directory-http.mjs http://localhost:3003`: passed authenticated production HTTP checks for overview, verification settings, verification queue, Users, review moderation, certificates, business-name changes, audit, a verification detail, and the legacy billing redirect. No forms were submitted. Normal demo sign-in updates its last-login timestamp.
- `npm run typecheck`: passed.
- `npm run lint`: TypeScript check passed (the repository uses `tsc --noEmit` for lint).
- `npm run build`: passed after the final application changes.
- `git diff --check`: passed.

The first HTTP run against the existing development server on port 3000 timed out after the overview check. The same suite passed against a separate production server on port 3003. Initial static-check failures during implementation were fixed before the final checks.

## Limits

No connected browser surface was available, so visual inspection, browser-console checks, responsive rendering, and real browser form interactions were not verified. Live verification, moderation, suspension, account changes, publishing, and document-setting mutations were not submitted against existing records. Their affected service paths were tested in memory; moderation-page rendering was checked over authenticated HTTP.

Status: Partially Verified (browser and live mutation verification unavailable).
