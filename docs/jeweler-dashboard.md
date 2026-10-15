# Simplified jeweler dashboard

Open `/seller` with an approved jeweler account. It redirects to `/seller/settings` (My Business). Pending businesses continue through the existing registration and admin approval process.

## Screens and actions

- My Business: logo, introduction, city, specialties, address, opening hours, business phone, independent WhatsApp number, public email, Google Maps, Instagram, Facebook, YouTube and website. Empty links are omitted from the public profile. Business name stays fixed after approval; no silent identity changes.
- Profile preview: private, saved-data preview, available even when the listing is paused.
- Visibility: pause hides the business from the jeweler directory and disables its public profile and new custom requests; resume restores an approved listing. Existing requests remain accessible.
- Custom Requests: only requests addressed to the signed-in jeweler, customer contact details, existing reference-image links, and New / Contacted / Closed statuses. These are inquiry states, not purchase fulfillment states.
- Account: sign-in email, existing password-change form and sign-out.

Social links are public without customer sign-in. Custom requests still require customer authentication. Requests now require a selected approved, available jeweler. Unassigned historical requests remain in their buyer's history and are not broadcast to jewelers.

The public jewelry catalog, homepage and existing registration flow were not redesigned. No product, order, payment or account records were deleted. Retired dashboard URLs redirect to My Business.

## Main implementation files

- `src/app/seller/(dashboard)/layout.tsx`, `page.tsx`, `settings/page.tsx`, `custom-requests/page.tsx`, `account/page.tsx`, `preview/page.tsx`: simplified dashboard.
- Legacy seller routes under products, offers, pricing, integrations, payouts, orders, returns, reviews and messages: redirect to My Business.
- `src/components/seller/business-profile-form.tsx`, `inquiry-status.tsx`: profile and inquiry controls.
- `src/components/catalog/jeweler-social-links.tsx`, `src/components/brand/social-icons.tsx`: public social/contact buttons.
- `src/lib/jeweler-profile.ts`: validation and inquiry labels.
- `src/server/actions/jeweler-profile.ts`, `src/server/services/jeweler-directory.ts`: authenticated mutations and scoped persistence.
- `src/server/services/sellers.ts`, `src/app/(storefront)/jewelers/[slug]/page.tsx`: public profile integration and directory visibility.
- `src/server/actions/account.ts`, `src/components/account/custom-request-form.tsx`, custom-orders page/view and account/custom-requests page: selected-jeweler routing and customer status display.
- `src/server/services/after-sales.ts`: restrict legacy quote access to the addressed jeweler.
- `src/components/auth/login-page.tsx`: jeweler login wording.
- `database/migrations`, migration scripts, and app-owned database types: directory settings and inquiry status storage. New fields use typed parameterized SQL through the Neon database adapter.

## Migration and validation

The additive migration was applied to the configured project database. For another environment, run `node scripts/migrate-jeweler-dashboard.mjs` before deploying. It supports `DATABASE_URL_UNPOOLED` and performs a rollback validation before applying; it does not seed or reset existing data. The general migration runner also includes this idempotent migration.

- `npm run build`
- `npx tsc --noEmit`
- `node --conditions=react-server --import tsx scripts/check-jeweler-dashboard.ts`

The integration check creates temporary buyer/jeweler/request fixtures inside a transaction and rolls everything back. It verifies URL/phone validation, cross-jeweler update rejection, status updates, social-link removal and visibility persistence. Browser checks covered approved demo login, profile saving, navigation and narrow/desktop layouts.
