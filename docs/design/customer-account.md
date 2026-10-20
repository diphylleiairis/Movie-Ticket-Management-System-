# Customer account and My Tickets

The header's signed-in user icon opens `/account`; anonymous visitors go to login
with `/account` preserved as their return destination. The page reuses the existing
SiteHeader, cream background, brown/gold accents, serif headings, Tailwind utilities
and responsive layout. Account and ticket errors are shown independently.

## Profile (ID-05)

Identity exposes authenticated `GET /api/v1/identity/profile` and CSRF-protected
`POST /api/v1/identity/profile` with `{fullName, phone}`. Only Customers may update.
The principal determines the account ID; clients cannot select another account or
change its role, status, email or password through this endpoint. Names are trimmed,
required, and limited to 150 characters; phone is optional and validated server-side.
The current session is refreshed to the updated account version after saving;
other sessions follow the existing account-version invalidation rule.

Email is displayed read-only. Verified email change remains a separate ID-05
workflow and is not implemented by this form. Updates preserve identity, provider
links and historical Booking/Ticket snapshots.

## Tickets (TCK-01/02)

`GET /api/v1/tickets/mine` requires CUSTOMER and returns `{serverTime, tickets}`
with `Cache-Control: no-store`. It takes no Customer ID from the browser.
Tickets obtains confirmed Booking IDs and seat counts from `CustomerBookings`,
screening start/Hall from `TicketScreenings`, and each Cinema's configured check-in
offsets from `TicketVenues`. Each application contract reads only its own module's
tables. Tickets reads its own immutable details/customer-name snapshots.

Each ticket includes its ID, Booking ID, details, start, opening/closing instants,
purchased/admitted/remaining counts, status and recovered original `qrToken`.
Details use `movie` (title string or `{title}`), `cinema` (name string or `{name}`),
`seats` (string array), numeric `price`, and ISO `currency`; V1's required
`showtime` and `booking_id` snapshot fields remain present in stored records.

`USED` means all admissions are consumed. `EXPIRED` means server time is strictly
after that Cinema's closing instant. `PARTIALLY_USED` retains admissions and the
same QR; other eligible tickets are `VALID`. Used/expired QR panels are gray and
muted, with explicit text labels. Both check-in boundaries remain inclusive.
The page polls every 30 seconds and on focus; expiry uses server time plus elapsed
monotonic browser time between refreshes. These visual states do not authorize
admission; the Ticket Validation backend remains authoritative.

All upcoming tickets are retained regardless of purchase age. Past tickets within
30 days of issuance remain in normal history; older past records are omitted,
never deleted. The API includes the open check-in window after start even for an
old purchase so a customer can still retrieve their code at the entrance.

QR recovery uses the V1 ciphertext fields, never the lookup hash as a QR value.
`TICKET_QR_KEYS` is a backend-only JSON map of key version to Base64-encoded
32-byte AES key. Ciphertext is a 12-byte random IV followed by AES-256-GCM encrypted
token and 128-bit tag; key-version UTF-8 bytes are authenticated additional data.
The recovered token's SHA-256 must match `qr_token_hash`. Keep old versions during
key rotation and keep keys out of Git, database and frontend variables. The ticket
issuer must use this same format and a fresh random IV per encryption. Missing,
wrong or corrupt keys leave ticket details visible with `QR unavailable`; the
reader does not generate replacement credentials or issue new tickets.

Checkout remains a payment preview and does not issue tickets. Real ticket issuance
and staff check-in endpoints are outside this read/profile change. Empty accounts
show an empty state rather than fabricated purchased tickets.

## Verification

Backend: `IdentityProfileTests`, `MyTicketsTests`, `TicketQrTokensTests`; opt-in
`IdentityIntegrationTests` covers persistence, CSRF and session refresh. TestCafe
`account.test.js` uses deterministic mocked API responses for profile editing,
QR states, filters, mobile width and anonymous redirects. Run the UI suite with
`npm run test:e2e:pages`; it also retains the existing page-recovery scenarios.
Real PostgreSQL Identity tests use only the documented isolated `identity_tests`
database. No test sends real mail or purchases tickets.
