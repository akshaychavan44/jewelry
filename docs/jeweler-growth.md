# Location discovery, enquiry alerts and jeweler analytics

## Existing functionality found

- `/jewelers` already supported country filters and city text search.
- The dashboard already counted NEW, non-cancelled requests in its sidebar and overview.
- Creating an enquiry already stored a CUSTOM_REQUEST notification; updating status notified the customer.
- Profile and product views already wrote analytics events. The old commerce dashboard service was not surfaced in the discovery dashboard.

## Added functionality

- Dedicated city and specialty filters, preserved across search and sorting. Country changes reset the city filter.
- Optional browser location access through Near me; 10/25/50/100/250 km radii, nearest boutique first, approximate distance labels. Only approved, unpaused jewelers with valid boutique coordinates appear in nearby results. Manual city search works without location access.
- Optional boutique latitude/longitude in My Business, using existing StoreLocation fields. Both coordinates must be supplied together or cleared together. No geocoding service or schema migration is needed.
- `/seller/notifications` with a separate unread enquiry badge and a mark-all-read action scoped to the signed-in user, enquiry notification type, and the time the page was opened. Reading alerts does not change request status.
- Transactional Resend email alerts after enquiry creation commits and after an actual status change commits. Duplicate status submissions do not create another notification. Email failures do not undo the enquiry. Delivery is best effort; there is no retry queue. Mocked tests do not send email.
- `/seller/analytics` with 7/30/90 calendar-day periods (UTC), profile views, jewelry views, contact clicks, enquiries received, five most-viewed pieces, contact channels, and zero-filled daily activity. Counts use server-side aggregates and are scoped to the authenticated seller.
- Contact tracking for phone, WhatsApp, email, website, directions and social links on public profiles and product contact panels. Contact events use PAGE_VIEW with `metadata.event = contact_click`, preserving the existing enum. The endpoint checks same-origin requests, input, public seller/product visibility, and excludes the owner. View tracking skips owner visits and prefetches; known bot user agents are excluded.

## Configuration and limitations

Set `RESEND_API_KEY`, `AUTH_EMAIL_FROM` (verified sender), and `NEXT_PUBLIC_APP_URL` to enable email. These must remain server-side except the public app URL. See the [Resend send-email API](https://resend.com/docs/api-reference/emails/send-email) and [idempotency support](https://resend.com/changelog/idempotency-keys).

Contact clicks start accumulating after this change; historical views remain available. Views count visits, not unique visitors. Clicks do not prove a conversation or a sale. Enquiry totals include requests later cancelled. Precise nearby search requires coordinates entered by the jeweler; there is no automatic address geocoding.

## Checks

- `npm run lint` (the repository's TypeScript check)
- `npm run build`
- `node --conditions=react-server --import tsx scripts/check-jeweler-growth.ts` — coordinate validation, mocked email transport, analytics isolation and date boundaries, notification read scope. Database fixtures roll back.
- `node scripts/check-jeweler-growth-http.mjs` — directory filters/empty states, invalid coordinates, signed-out protection, contact endpoint validation, demo jeweler login, analytics ranges, notifications, enquiry page and coordinate fields.

HTTP checks inspect rendered HTML and API responses. Browser interactions, browser console and desktop/mobile visual checks need an available browser session; they are not covered by HTTP checks.
