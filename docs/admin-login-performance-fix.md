# Admin login and responsiveness

Implemented on 2026-10-14, preserving the existing admin layout and mobile design.

## Findings and changes

- The development log contained repeated database WebSocket `ErrorEvent` failures matching the reported error screen. Local checks also observed `ENOTFOUND` and connection timeouts for HTTPS/database requests. Connectivity later recovered intermittently.
- The root 404 fallback fetched account and catalog data while constructing the route tree, so a database failure could also break the login page. That fallback now uses database-independent header/footer navigation.
- Admin login reports connection failures within the form. After successful authentication, it redirects without an extra account lookup or legacy cart merge. Password, role and suspension checks remain enforced. The login timestamp update avoids an additional account read.
- Independent database queries use the Neon HTTP driver with a ten-second deadline. Explicitly read-only delegate lookups can retry once inside that same deadline. Mutations, raw SQL, and interactive transactions are not retried. Transactions retain their checked-out client and rollback behavior. Next rendering-control exceptions are rethrown correctly, including in the homepage review fallback.
- Authenticated account lookup and password-reset revocation checks run together. Every protected request still checks the current account in the database; there is no cross-request authentication cache.
- Sidebar badges stream independently of the navigation, and queue queries are memoized within a request. Added admin loading/error states and a link loading indicator without widening navigation rows. This Next version uses the `retry` error-boundary prop.
- Related verification queries run in parallel. Filtered showcase counts now honor active/nondeleted conditions.
- Document access loads only the ownership relations needed for the viewer. Audit writes and authorized storage reads run together, but the response is withheld unless the required audit succeeds. Private local previews support byte ranges; private responses remain uncached. Connection outages return a clear 503 response instead of a generic document error.
- Malformed generated development type files were backed up outside the repository and regenerated. The dev server was stopped while rebuilding. The optimized production app is served on the existing local port 3000, avoiding first-click development compilation delays.

The transport selection follows the [Neon driver configuration](https://github.com/neondatabase/serverless/blob/main/CONFIG.md).

## Relevant files

- Authentication: `src/components/auth/admin-login-page.tsx`, `src/server/actions/auth.ts`, `src/server/auth/index.ts`, `src/server/auth/session.ts`, `src/lib/database-errors.ts`.
- Database: `src/server/db/neon-client.ts`, `src/server/db/model-delegate.ts`, `src/server/services/admin.ts`.
- Navigation: `src/app/admin/layout.tsx`, `loading.tsx`, `error.tsx`, `src/components/layout/dashboard-nav.tsx`.
- Documents: `src/app/api/files/[id]/route.ts`, `src/server/services/document-access.ts`, `src/lib/document-response.ts`.
- Recovery rendering: `src/app/not-found.tsx`, `src/components/layout/site-header.tsx`, `site-footer.tsx`, `src/server/services/testimonials.ts`.
- Regression fixtures: `scripts/check-admin-responsiveness.ts`, `scripts/check-admin-login-http.mjs`, `scripts/check-free-directory-http.mjs`, database/error/document-response unit tests.

## Executed checks

- `npx tsx --test src/lib/auth-routing.test.ts src/lib/jeweler-contact.test.ts src/lib/review-rating.test.ts src/lib/database-errors.test.ts src/lib/document-response.test.ts src/server/db/model-delegate.test.ts src/server/db/query-builder.test.ts src/server/db/neon-client.test.ts`: 32 passed, 0 failed.
- `node --experimental-test-module-mocks --conditions=react-server --import tsx scripts/check-admin-responsiveness.ts`: passed isolated action/session, document authorization, audit failure, byte-range route and database-outage checks. No live business records are written by this fixture.
- `node --conditions=react-server --import tsx scripts/check-free-directory.ts`: passed publishing, verification, onboarding, badges and account-control regression checks in memory.
- `npm run typecheck` and `npm run lint`: passed. The repository's lint script is TypeScript checking.
- `npm run build`: passed. Final build status is checked before handoff.
- `git diff --check`: passed.
- `node scripts/check-admin-login-http.mjs http://localhost:3000`: the actual bound admin login form signed in and opened the overview in 4.348 seconds during a successful run. A later network failure returned HTTP 200 with the login form and a connection message in 10.046 seconds, instead of the global error screen. The isolated document-route checks pass; live document verification is checked separately.
- `node scripts/check-free-directory-http.mjs http://localhost:3000`: authenticated overview, verification settings, verification queue, Users, reviews, certificates, business-name changes, audit, verification details, and the old billing redirect passed during a successful run. Measured page response times were 487–1409 ms. Later fresh sign-in attempts also encountered intermittent external connection failures.

Normal sign-in updates the demo account's last-login timestamp. Document viewing records its required audit entry. Moderation, verification decisions, account status changes and business settings were not submitted against existing records.

## Limits

No connected browser/app surface was available for visual, browser-console, click-animation, or responsive inspection. HTTP response timings measure server rendering, not browser paint or perceived click latency. The host's intermittent internet/DNS/database connectivity remains an external limitation and can still prevent authentication or data loading. The application now handles those failures explicitly and does not bypass authentication or serve cached private documents.

Status: Partially Verified (browser inspection unavailable; live connectivity intermittent).
