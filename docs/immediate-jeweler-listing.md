# Immediate jeweler listing

A jeweler's completed final submission sets verificationStatus to PENDING and immediately makes the shop public. APPROVED adds the verified badge. NOT_SUBMITTED, REJECTED and SUSPENDED shops stay hidden; the existing directory pause also hides PENDING and APPROVED shops. Existing pending applications use the same behavior without a migration.

Submitted jewelers can use the business dashboard, profile editor, showcase jewelry, reviews and enquiries. Showcase visibility and contact tracking accept pending shops. Verification-specific actions retain their approval checks.

The shared policy is in src/lib/jeweler-listing.ts. Directory/profile queries are in src/server/services/sellers.ts. Submission and dashboard access are handled by src/server/actions/onboarding.ts and src/server/auth/session.ts. Verification badges on the directory, both public profile views, saved jewelers and product vendor cards check APPROVED explicitly. Approval messages describe adding verification to the existing listing.

Validation commands:

- npm run lint
- npm run typecheck
- npm run build
- node --import tsx --test scripts/check-immediate-listing.mjs
- node --conditions=react-server --import tsx --test src/lib/auth-routing.test.ts src/lib/jeweler-contact.test.ts src/server/db/query-builder.test.ts src/server/db/model-delegate.test.ts

The listing tests use isolated fixtures and exercise submission validation, duplicate submission, directory queries, public profile states, pause restrictions, jewelry visibility, and actual approval/rejection service decisions. They do not mutate a real database or send email. Browser verification requires a connected browser and running app.

Observed validation: lint and typecheck passed; the production build passed; all seven immediate-listing tests and 25 related regression tests passed. Read-only production HTTP checks returned the directory, custom orders, and an existing public profile, and confirmed guest dashboard sign-in redirects. Existing PENDING profiles rendered without a verified badge, while an APPROVED profile retained its badge. No browser was connected, so visual/responsive inspection and browser interaction testing remain unverified.
