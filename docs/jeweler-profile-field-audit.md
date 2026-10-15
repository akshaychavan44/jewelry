# Jeweler profile field audit

Audit date: 2026-10-14. Scope: shop onboarding, My Business, private preview, and public profile/about pages. This is an audit; no application code or shop records were changed.

## Result

Existing populated public fields matched the saved data for all three approved, unpaused profiles in the configured database. However, the complete onboarding/edit/display flow is not fully verified and has the gaps below. Matching current data does not prove that future edits, uploads, or clearing fields work correctly.

## Field map

| Field | Onboarding | My Business | Saved destination | Public behavior / result |
| --- | --- | --- | --- | --- |
| Shop name | Editable | Read-only; separate approval request | SellerProfile.storeName | Displayed; existing values matched. Approval service preserves slug. Approval flow inspected, not submitted. |
| Short introduction | Editable | Editable | SellerProfile.tagline | Displayed; existing values matched. Empty input saves null. |
| Story / description | Editable | Editable | SellerProfile.bio | Displayed; existing values matched. Public paragraphs collapse line breaks; private preview preserves them. |
| Logo | Upload | Upload replacement | SellerProfile.logoUrl + FileAsset | Rendered through Monogram; upload path inspected. Existing profiles had no populated logo for the comparison; replacement/removal not tested. No removal control. |
| Banner | Upload | Missing | SellerProfile.bannerUrl + FileAsset | All three stored banners appeared in rendered image markup. Cannot replace through My Business. |
| Operating country | Editable | Missing | SellerProfile.country; address/location country | Displayed with countryName. Cannot edit through My Business. |
| City | Editable | Editable | SellerProfile.city; StoreLocation.city | Existing values matched. Onboarding also has a separate address city; dashboard uses one city for both fields. |
| Default currency | Editable | Missing | SellerProfile.defaultCurrency | Operational setting, not a public biography field. Used for newly created showcase prices; cannot edit here. |
| Founded year | Editable | Missing | SellerProfile.foundedYear | Existing values matched; cannot edit through My Business. |
| Specialties | Editable | Editable | SellerProfile.specialties | All nine current tags matched. Both save paths silently retain only the first six. |
| Street address | Editable | Editable | Address.line1; StoreLocation.line1 | Existing values matched. Dashboard only updates StoreLocation. |
| Suite / floor | Editable | Missing | Address.line2 | Not copied to StoreLocation or rendered on public address. |
| Address city | Editable separately | Shared with shop city | Address.city; StoreLocation.city | Existing public values matched; dashboard updates do not synchronize Address.city. |
| State / region | Editable | Missing | Address.region | Not copied to StoreLocation or rendered on public address. |
| Postal code | Editable | Missing | Address.postalCode; StoreLocation.postalCode | Existing public values matched; cannot update in My Business. Private preview omits it. |
| Business phone | Editable | Editable | Address.phone; StoreLocation.phone | Existing display values matched; browser call URL verified. Validation/render mismatch described below. |
| Opening hours | Missing | Editable | StoreLocation.hours | Existing values matched; empty input saves null. |
| Latitude / longitude | Missing | Editable | StoreLocation.latitude/longitude | Used by nearby-distance calculations; not exposed as profile text. Pair/range validation inspected, not submitted. |
| WhatsApp | Editable | Editable | JewelerDirectorySettings.whatsapp | Social link builds wa.me correctly. Prominent DirectContact button fails for normalized stored values. |
| Public email | Editable | Editable | JewelerDirectorySettings.publicEmail | Mailto link present in renderer. Current live data did not populate this field; save/clear not submitted. |
| Maps link | Editable | Editable | JewelerDirectorySettings.maps | Directions link present in renderer; current live data did not populate it. |
| Instagram / Facebook / YouTube | Editable | Editable | JewelerDirectorySettings respective fields | Conditional links present in renderer; current live data did not populate them. |
| Website | Business verification step | Editable | SellerProfile.website | All three stored website links matched. |
| Accept custom requests | No explicit control | Checkbox | SellerProfile.acceptsCustomOrders | Selection list respects it, but public Commission piece buttons do not. |
| Pause / resume | Not present | Toggle | JewelerDirectorySettings.isPaused | Public lookup and directory filter paused shops. Code inspected; toggle not submitted. |
| Registered business name, business type, registration number | Verification step | Not editable here | SellerProfile verification fields | Intentionally private verification data; excluded from profile JSX. |
| Tax ID | Verification step | Not editable here | Encrypted value and last four digits | Intentionally private; not profile content. |
| Verification documents | Upload | Not editable here | Private FileAsset and KycDocument | Intentionally private; private storage rules inspected. No verification files uploaded/accessed for this audit. |
| Submission agreement | Checkbox | Not present | Submission snapshot/status | Controls approval submission; not public profile text. No application submitted. |

Bank/Stripe actions exist in older code, but are not fields in the current three-step onboarding form and were not treated as active shop-listing inputs.

## Confirmed gaps and fixes

1. **WhatsApp contact button:** onboarding and dashboard strip all non-digits before storing WhatsApp. DirectContact passes that stored string into contactLinks, which only produces WhatsApp links for numbers starting with `+`. A valid input such as `+91 9876543210` therefore produces no prominent WhatsApp button. The standalone social link still works. Reproduced with the actual schema, normalization, and helper. Fix by using one consistent international-number contract for storage and rendering.
2. **Incomplete public address:** onboarding saves line2 and region on Address, but never copies them into the displayed location. My Business cannot edit line2, region, postal code, or a distinct showroom city. Fix the field model and public address rendering, and define whether the onboarding address and public location must stay synchronized.
3. **Missing dashboard controls:** banner, country, founded year, and default currency cannot be maintained after approval through My Business. Add the intended edit controls with validation, saving, and reload defaults.
4. **Unstable main location selection:** dashboard saves and preview use `ORDER BY id ASC`; getStorefront includes locations without explicit ordering, and public pages take the first returned record. Current data matched, but ordering is not guaranteed. Explicitly order the public relation using the same rule.
5. **Custom-request opt-out ignored by profile CTA:** both public implementations render Commission piece unconditionally. The destination only lists eligible sellers, so opting out can leave a misleading button. Hide it when acceptsCustomOrders is false. All three current profiles accept requests, so this branch was established by code inspection rather than a live disabled profile.
6. **Phone validation differs from rendering:** directoryProfileSchema accepts a 20-digit phone, while contactLinks rejects it, making the Call button disappear after a nominally valid save. Reproduced with the actual functions. Apply a shared phone parser to onboarding, dashboard, preview, and public links.
7. **Preview differs from public profile:** private preview omits banner, country, founded year, and postal code; it also preserves story line breaks when public pages do not. Align the preview with the public renderer or clearly state its narrower scope.
8. **Onboarding drafts can cross accounts in the same browser:** draft keys are not scoped by user, and restored nonempty draft values override server-loaded defaults. An unfinished draft can appear for a later account on the same browser. Scope drafts to the current user and define when saved server data wins.

## Save/load and ownership inspection

- Dashboard save obtains seller/user via assertSeller, requires approval, and derives seller ID from that session. Location queries include sellerId; social upserts use that seller ID.
- Onboarding derives user ID from the signed-in user, rather than a posted seller ID. Reviewed applications are locked as described by verification status.
- Dashboard profile and location updates plus social settings upsert occur in one transaction. Empty optional text/social fields clear stored values; skipping a logo upload preserves the old logo.
- Dashboard save refreshes the seller layout, main public profile, directory, and custom-orders page. Live update freshness after submitting edits was not tested.
- Dashboard location saves leave Address unchanged, so it can retain older address/phone/city data.
- These are code-inspection findings, not a live cross-account edit test.

## Verification performed

- Read-only saved-data versus rendered-HTML comparison: three approved, unpaused profiles; all populated compared fields passed (name, tagline, biography, city, founded year, street, location city, postal code, hours, phone, specialties, banner, website).
- Demo seller sign-in in a separate HTTP cookie jar; GET /seller/settings and /seller/preview returned 200 with no application-error marker. Settings field names matched the current form. No settings or approval forms were submitted.
- Actual Chrome profile DOM: name, first location, website URL, phone URL, and Commission piece presence verified. No captured console errors. Desktop/mobile visual inspection was performed for the preceding first-location change; this audit added no visual changes.
- npm run lint (tsc --noEmit): passed.
- npx tsx --test src/lib/jeweler-contact.test.ts src/lib/auth-routing.test.ts: 10 passed.
- npx tsx --test src/server/db/model-delegate.test.ts src/server/db/query-builder.test.ts: 11 passed.
- Runtime schema/contact-helper probes reproduced WhatsApp normalization and accepted-phone/rendering mismatches.

## Remaining verification

Fresh onboarding, actual dashboard saves, clearing fields, image replacement, approval/name-review transitions, pause/resume, and live ownership isolation need an isolated test shop/environment. Populated email/social/maps/logo fields were absent in the three current live profiles, so their end-to-end data comparisons remain unverified. No production build was run because this audit changed no application code.

Initial audit status: **Partially verified; fixes required before calling the entire field flow correct.**

## Follow-up implementation

The audited gaps have now been addressed in code:

- Directory WhatsApp links support both stored country-code digits and formatted input; phone validation matches the call-link parser.
- Onboarding copies suite/floor and region to the public location. Dashboard saves synchronize its complete address and phone with the onboarding Address record in the same transaction; shop city and showroom city remain separate.
- My Business now includes banner replacement, country, currency, founded year, suite/floor, showroom city, region, and postal code.
- Public location queries use the same ascending ID order as dashboard and preview. Both public profile implementations respect custom-request opt-out.
- Existing public locations can display missing suite/region from the saved onboarding address. Newly saved values are synchronized without a migration.
- Preview includes banner, country, founded year, complete address, and the shared contact controls. Public biographies preserve line breaks.
- Onboarding draft storage is scoped to the signed-in user's ID. More than six specialties is reported as validation feedback instead of silently truncated.
- Dashboard saves refresh both profile and About routes.

Validation: 25 contact, authentication-routing, relation, and query tests passed; TypeScript/lint passed; production build passed. An isolated runtime test executed the actual profile server action against in-memory persistence and upload substitutes, checking address synchronization, optional clears, separate cities, logo/banner preservation and replacement, WhatsApp normalization, custom-request opt-out, session ownership, invalid-save rejection, and route refreshes. This validates action behavior without changing live shop records or uploading files. Public profile address layout was inspected on desktop and mobile; no captured browser console errors.

Remaining verification: a real browser form save and actual file-storage upload against a dedicated test shop have not been performed. The initial audit findings above remain as historical context, not a list of unfixed implementation defects.
