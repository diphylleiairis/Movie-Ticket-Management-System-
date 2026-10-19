# Traceability

Map requirements to acceptance criteria, test cases, automated tests, and execution results here.

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
