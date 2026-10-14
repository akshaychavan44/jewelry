# Project functional audit — 13 October 2026

Status: Partially verified. This report distinguishes page-load coverage from interactions actually exercised. It does not claim every possible button state or external integration was tested.

## Scope

Preserved the existing design and features. The two responsive adjustments made during the initial audit were reverted at the user's request. No mobile layout improvements are included in the audit fixes. Earlier authorized work on the For Jewelers hero and favorites notification remains separate.

The automated route sweep covers 64 static page paths plus discovered internal page URLs: 122 paths in total. It follows redirects, checks internal anchor targets, and checks referenced local media files. It runs without a session, so a protected dashboard redirecting to its login is a passing access check, not proof that the dashboard's controls work. Query combinations, APIs, and external URLs are outside this sweep.

## Confirmed issues and fixes

| Issue | Root cause and correction | Evidence |
| --- | --- | --- |
| 11 product pages returned server errors | Review metadata named the relation `user` and foreign key `userId`, while the schema and interface use `author` / `authorId`. Corrected both directions and the `photoUrls` array mapping. | All 11 previously failing URLs pass the rerun. Pavé Dome Ring renders Sofia and Hannah's reviews. Regression tests cover author hydration and reverse user reviews. |
| Metal filtering returned no matching pieces | Unqualified parent IDs in relation subqueries resolved against the inner table. Qualified each correlation against its outer table or parent alias. | The 18k Gold filter now returns 11 matching pieces. Tests cover positive, negative, nested, and explicit-alias relation filters. |
| Filter counts and popularity counts were missing; aggregate sorting was ignored | The database adapter only returned `_count._all`, regardless of requested fields, and ignored nested aggregate order specifications. Added field-specific count results and aggregate order aliases. | Filter drawer shows numeric counts; seller analytics shows product view counts in descending order. Regression tests verify selected counts and generated ordering. |
| Review summary said there were no reviews above actual reviews | The summary used stale stored product counters. Derive count and weighted average from published rating distribution. | Pavé Dome Ring displays 4.5 stars and 2 reviews in both summary locations. Tests cover weighted totals and an empty distribution. |
| Favorites sign-in lost current collection filters | The return destination used only the pathname. Preserve the search string captured when the favorite button is clicked. | Guest flow checked on an 18k Gold filtered collection. |
| Admin category chart displayed millions of listings | The data source summed historic order amounts in USD cents. Count currently discoverable pieces under their parent categories instead. | Chart values are 9, 8, 5, 4, 4, totaling the 30 active listings. |
| Verification queue showed 0 listings for active jewelers | The queue displayed stale stored listing counters. Query current discoverable product counts per seller without changing stored data. | Approved queue shows Atelier Solène 11, Kanchan & Co. 8, Marlowe 11 listings. |
| Header could retain the previous account name after sign-out | The session ended but the shared layout remained stale. Explicitly invalidate the root layout after sign-out before redirecting home. | Final sign-out check recorded separately below. |

Relevant code: `src/server/db/schema-meta.ts`, `query-builder.ts`, `model-delegate.ts`; `src/server/services/product.ts`, `admin.ts`; `src/lib/review-rating.ts`; `src/components/catalog/save-buttons.tsx`; `src/server/actions/auth.ts`.

## Executed checks

- `npm.cmd run lint` — TypeScript check passed.
- `npm.cmd run build` — production build passed after the database and admin fixes; final authentication refresh build is checked before delivery.
- `npx.cmd tsx --test src/lib/auth-routing.test.ts src/lib/jeweler-contact.test.ts src/lib/review-rating.test.ts src/server/db/model-delegate.test.ts src/server/db/query-builder.test.ts` — 20 passed, 0 failed.
- `node scripts/audit-routes.mjs http://localhost:3002` — 122 paths passed after the product/filter fixes; 0 broken internal links, 0 broken fragment targets, 0 missing referenced local media files. The first successful baseline had 11 failures, not 122.
- `git diff --check` — passed. Windows line-ending notices are informational.

Browser inspection covered public pages, collection categories, guides and policies, all three public jeweler profiles, styling pages, authentication pages, customer pages, seller pages and all 11 seller product editors, and the eight main admin navigation pages. Verification detail pages were also inspected. The browser evidence file records exact routes and view observations.

Interactions exercised: desktop Jewelry menu and Escape dismissal; search submission; price sorting; filter drawer and metal selection; product variant selector, size reference radio buttons, accordion sections, image viewer/zoom/Escape; login and registration validation; password visibility; seeded buyer/seller/admin login; analytics periods; listing required-field validation and cancel navigation; favorites authentication notification and sign-in action. Initial mobile navigation and page rendering were checked before the user's desktop-only correction; subsequent work does not change mobile layouts.

Legacy cart, checkout, orders, payouts, integrations, messages and related pages intentionally redirect within the current directory model. They were not replaced with dummy commerce functionality.

## Limits and remaining observations

- No real enquiry, email, WhatsApp message, newsletter subscription, payment, refund, billing-plan update, publication, archive, account suspension, KYC decision, certificate approval, or review moderation was submitted.
- Successful account registration, password reset with a real token, password changes, uploads and persisted settings/address changes were not exercised against existing records. Invalid-form validation and rendering do not prove those success paths.
- External call/WhatsApp/email destinations were inspected and contact-link unit tests passed; recipient availability and message delivery were not tested.
- API integrations, webhooks, cron jobs, generated financial documents, and all possible filter combinations remain unverified. The local browser used Chromium; Safari, Firefox and physical devices were not tested.
- Mobile overflow observed in account tables and the seller jewelry list is left unchanged according to the latest instruction. Earlier screenshots that temporarily show responsive audit adjustments are historical evidence, not the final implementation.
- Browser automation/navigation timing failures were checked against settled page state and were not counted as application defects. One long verification-detail batch timed out after saving most of its results.
- Server startup prints the existing Next.js standalone-output warning. Production compilation succeeds; deployment using the standalone entry point was not tested here.
- Page views and normal demo-account sign-ins can produce ordinary analytics/sign-in records. No business records were deliberately altered by test submissions.

## Evidence

- `docs/project-route-audit-before.json` — baseline failures.
- `docs/project-route-audit.json` — latest route and link results.
- `scripts/audit-routes.mjs` — repeatable route audit.
- Browser observations and screenshots: `C:/Users/aksha/.codex/visualizations/2026/10/13/01a1346e-60a6-7a50-867b-8dfa15618b40/project-audit/`.

Final verification: the production build including the sign-out fix passed. The final route report again records 122 checked paths with no route failures, broken internal links, broken fragments, or missing local media. At desktop width, all eight admin navigation pages loaded without captured console errors. Signing out returned home with the guest “Sign in” header without a manual reload. The favorites sign-in URL retained `/shop?metal=gold-18k`.
