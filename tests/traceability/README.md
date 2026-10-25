# Traceability

Admin Movie creation: [CAT-A01–12](../test-cases/admin-movies.md) maps CAT-01/ID-04
to `AdminMoviesTests`, `AdminMoviesSecurityTests`, the dedicated Movie creation
scenario in `IdentityIntegrationTests`, TestCafe `admin-movies.test.js` and
catalog/report cache invalidation in `check-admin-prefetch.mjs`.
CAT-A09–12 add `MoviePostersTests`, `SupabasePosterStorageTests`,
`AdminMoviePostersSecurityTests` and poster scenarios in `admin-movies.test.js`.

Admin account/Booking workspace: [management cases](../test-cases/admin-management.md)
maps the 2026-10-24 owner decision and ID-04 to `AdminAccountStatusTests`,
`AdminManagementSecurityTests`, `AdminBookingsTests`, the suspension scenario in
`IdentityIntegrationTests` and TestCafe `admin-dashboard.test.js`.
ADM-M09–11 map prefetch, cache ownership, background refresh and late-read protection
to `check-admin-prefetch.mjs` and the delayed-response/access-revocation TestCafe cases.

Map requirements to acceptance criteria, test cases, automated tests, and execution results here.

Admin dashboard: [ADM-01–10](../test-cases/admin-dashboard.md) maps ID-04 to
`AdminDashboardSecurityTests` and `AdminDashboardTests` for the overview API.
TestCafe also verifies Overview stays the default and User/Booking navigation
preserves the sidebar and browser document.
See [design and commands](../../docs/design/admin-dashboard.md).

Customer account: [ACC-01–14](../test-cases/customer-account.md) maps ID-02/04/05 and
TCK-01/02/03 to IdentityProfileTests, MyTicketsTests, TicketQrTokensTests,
IdentityIntegrationTests, `account.test.js` and `account-session.test.js`. See [design/run instructions](../../docs/design/customer-account.md).

Identity: [acceptance cases](../test-cases/identity.md) map ID-01/02/03/04 and
[ADR 0006](../../docs/adr/0006-google-verified-customer-identity.md) to
[backend integration tests](../../backend/src/test/java/com/se113/movie_ticket_ms/modules/identity/IdentityIntegrationTests.java)
and [TestCafe workflows](../e2e/testcafe/identity.test.js). Run instructions and
database isolation are in [Identity setup](../../docs/design/identity.md).

ID-T15 covers the Resend email boundary in
[Resend adapter tests](../../backend/src/test/java/com/se113/movie_ticket_ms/modules/identity/ResendIdentityMailTests.java).
ID-T13 also checks the `503 EMAIL_UNAVAILABLE` API response and rollback of a failed
resend without invalidating the previous challenge. ID-T16 exercises the default
frontend API path, restored header identity and Sign out through TestCafe.

ID-T17 maps ID-03 to the reset-email link assertion in the Resend adapter tests,
the existing one-time/session-revocation backend integration test and the TestCafe
reset-link workflow. ID-T18 covers Google registration and subsequent sign-in
using the default same-origin backend entry path without a frontend override.

ID-T19 maps the owner decision on 2026-10-19 to backend integration and TestCafe
coverage for Google Customers creating a first password using the reset email,
then signing in through both methods with the same Customer ID.

ID-T22 maps the 2026-10-25 Admin password-reset decision to
`IdentityPasswordResetTests` and the Customer/Admin cases of
`passwordResetIsOneTimeAndRevokesExistingSession` in `IdentityIntegrationTests`.
The shared Resend template remains covered by `ResendIdentityMailTests`.
