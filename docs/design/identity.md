# Identity backend

Identity implements ID-01, ID-02, ID-04 and the backend password-reset flow in ID-03.
It uses the existing `movie_app.users`, `user_identities`, `email_verifications`
and `password_reset_tokens` tables. No schema migration is applied by startup.
Profile/email-change endpoints and Apple login are outside this implementation.

## Google activation and linking

Spring Security validates Google's OIDC signature, issuer, audience, expiration,
nonce and OAuth state. Identity reads `email_verified` from the validated ID token,
not request parameters or an unsigned browser response. Verified Google registration
creates an ACTIVE Customer, records `email_verified_at` and links the stable `sub`
in one transaction. It sends no code. False/missing verification rejects Google
login and offers email/password registration.

An existing Google link resolves the same Customer ID without replacing their
active email, name, Bookings or Tickets. Disabled accounts and non-Customers cannot
use public Google login. A matching email alone does not merge an unlinked account.
On `ACCOUNT_LINK_REQUIRED`, the frontend explicitly offers `SIGN IN AND LINK GOOGLE`;
password sign-in precedes a new OAuth request with `intent=link`. Link intent is
bound to the saved authorization request/state and the same active Customer session.
The verified Google email must equal that Customer's current email. Identity links
are immutable; concurrent callbacks cannot create duplicate Customers or links.

## Render and Vercel

The database must already have V1 applied, with the trusted backend role's required
privileges/RLS policies. Follow the [migration README](../../backend/src/main/resources/db/migration/README.md).
This change does not apply SQL to Supabase or enable Flyway automatically.

Render environment:

```dotenv
SPRING_PROFILES_ACTIVE=prod
FRONTEND_URL=https://movie-ticket-management-system-azure.vercel.app
GOOGLE_CLIENT_ID=<Google OAuth client_id>
GOOGLE_CLIENT_SECRET=<Google OAuth client_secret>
GOOGLE_REDIRECT_URI=https://movie-ticket-management-system-azure.vercel.app/login/oauth2/code/google
```

Keep existing `POSTGRES_*` settings. Register `GOOGLE_REDIRECT_URI` exactly as an
authorized redirect URI in Google Cloud. Vercel must proxy `/api/:path*`,
`/oauth2/:path*` and `/login/oauth2/code/:path*` to the same Render backend, before
the SPA fallback. The checked-in callback rewrite fixes a missing `.onrender.com`.

Vercel build environment:

```dotenv
VITE_IDENTITY_API_URL=/api/v1/identity
VITE_GOOGLE_AUTH_URL=/oauth2/authorization/google
```

The frontend defaults to these same-origin API and Google entry paths when the
variables are absent or empty. Both login and registration use the backend OIDC
flow; registration requires accepting terms before starting Google.

For local Google login, set `SPRING_PROFILES_ACTIVE=dev,google`,
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
`GOOGLE_REDIRECT_URI=http://localhost:5173/login/oauth2/code/google` and
`FRONTEND_URL=http://localhost:5173` in the ignored root `.env`. Register that exact
callback in Google Cloud and open Vite at `http://localhost:5173`. Docker Compose
forwards these settings. The optional `google` profile enables local OIDC; `dev`
alone still supports email/password without Google credentials. Production
continues to use `prod` with the deployed callback above.

Rebuild Vercel after changing these values. Cookies are host-only, HttpOnly, Path=/,
SameSite=Lax and Secure in production. Keep OAuth entry, callback and subsequent
API requests on that same public frontend origin. Redirect destinations are a fixed
frontend origin plus an allowed local page path; arbitrary `returnTo` URLs are rejected.
Use `/api/v1/health` for Render health checks (HTTP startup only).

## Email/password accounts

Passwords use BCrypt, with at least eight characters including a number and at most
72 UTF-8 bytes. Registration creates only a pending Customer and sends a six-digit
code through Resend's HTTPS email API. Code hashes are salted, expire after ten minutes and allow five
incorrect attempts. Resend waits sixty seconds and supersedes the previous challenge.
Email delivery failure rolls back registration/challenge creation.

Configure the backend locally in the ignored root `.env`, or in Render's environment:

```dotenv
RESEND_API_KEY=<Resend API key>
IDENTITY_MAIL_FROM=The Lumiere <noreply@your-verified-domain.example>
IDENTITY_MAIL_PROVIDER=resend
```

Local Docker Compose forwards these three mail settings from the root `.env`
to the backend container. For Render, set them in the service environment;
the local ignored `.env` is not part of the Docker image or Git deployment.
The frontend continues to call `/api/v1/identity` through the Vercel proxy,
so the Resend key and sender do not need frontend build variables.

`resend` is the default provider. The sender must belong to a verified Resend domain;
`onboarding@resend.dev` can only send to the Resend account owner's email while testing.
The API key alone does not configure a sender. No live email is sent by automated tests.
See [Resend's send email contract](https://resend.com/docs/api-reference/emails/send-email).

Identity sends verification and password-reset emails through its `IdentityMail`
application contract. The Resend adapter has bounded connection/read timeouts,
checks the returned email ID and converts provider/network errors into a sanitized
`503 EMAIL_UNAVAILABLE`. Registration and resend transactions roll back if sending
fails; resend does not invalidate the previous code when delivery fails.
The adapter does not automatically retry ambiguous delivery failures.

SMTP remains available for existing environments: explicitly set
`IDENTITY_MAIL_PROVIDER=smtp`, `SPRING_MAIL_HOST`, `SPRING_MAIL_PORT`,
`SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD` and `IDENTITY_MAIL_FROM`.
STARTTLS is required for SMTP. Google verified-email login works without email delivery. Never log
codes/reset tokens or expose mail/provider credentials through `VITE_*` variables.

## REST contract

All paths below are under `/api/v1/identity`. Mutation endpoints require the
`X-CSRF-TOKEN` returned by GET `/csrf`, with the same session cookie. Fetch a fresh
CSRF token after login/logout. Security responses are JSON 401/403 rather than
redirecting API calls to a generated login form.

| Method/path | Request / response |
|---|---|
| GET `/csrf` | `{token, headerName}`; no-store |
| POST `/register` | `{fullName,email,password,acceptedTerms:true}` -> `VERIFICATION_REQUIRED`, `challengeId` |
| POST `/email-verification/confirm` | `{challengeId,code}` -> `EMAIL_VERIFIED` |
| POST `/email-verification/resend` | `{challengeId}` -> `VERIFICATION_REQUIRED`, new `challengeId` |
| POST `/login` | `{email,password,rememberMe}` -> `AUTHENTICATED`, public `user` |
| GET `/me` | `AUTHENTICATED`, `{id,email,fullName,role}`; no-store |
| POST `/logout` | Invalidates session/cookie -> `SIGNED_OUT` |
| POST `/password-reset` | `{email}` -> uniform `REQUEST_ACCEPTED`; sends instructions only to an eligible current verified Customer email |
| POST `/password-reset/confirm` | `{token,password}` -> `PASSWORD_RESET`; token expires after thirty minutes and is one-time |

Both Resend and SMTP reset emails contain a clickable link built from the backend's
trusted `identity.frontend-url`: `/reset-password#token=<opaque-token>`.
The fragment keeps the token out of HTTP request URLs and referrer headers.
The frontend reads it automatically, asks for a new password and confirmation,
then submits the token to the CSRF-protected confirm API. Opening the link alone
does not consume it. Success clears passwords and removes the token from the
current browser history entry, then offers sign-in. Missing, invalid, expired or
used tokens offer a new reset-link request. Tokens remain hashed in storage,
expire after thirty minutes and are single-use; password reset revokes older sessions.
Set `FRONTEND_URL` to the origin where the user should open the password form.
Login and reset requests are throttled
in the current backend instance. Registration always creates CUSTOMER; seeded Admin
and Cinema Staff can use password login with their existing database role.
`/api/v1/admin/**` requires ADMIN and `/api/v1/ticket-validation/**` requires
CINEMA_STAFF. New protected controllers must also declare their role rules.

Session IDs rotate on authentication. Password login normally lasts thirty idle
minutes; remember-me gives a seven-day idle session and persistent session cookie.
Password changes, account disabling or account updates invalidate older sessions
on their next request. Sessions and local rate-limit counters are in memory and
reset on deployment. Do not scale this implementation to multiple backend instances
without shared session/rate-limit storage.

## Verification

Create the isolated PostgreSQL test container from the repository root:

```powershell
docker run -d --name movie-ticket-identity-tests -p 127.0.0.1:15432:5432 -e POSTGRES_DB=identity_tests -e POSTGRES_USER=identity_tests -e POSTGRES_PASSWORD=identity_tests_local_only postgres:17
```

Run from `backend/`:

```powershell
$env:TEST_DB_URL = 'jdbc:postgresql://127.0.0.1:15432/identity_tests'
$env:TEST_DB_USER = 'identity_tests'
$env:TEST_DB_PASSWORD = 'identity_tests_local_only'
.\mvnw.cmd -B -ntp '-DargLine=-Duser.timezone=UTC' test
.\mvnw.cmd -B -ntp -DskipTests package
```

The Identity integration class is opt-in for that exact loopback database. It applies
V1 there if absent, resets test data and validates real PostgreSQL transactions.
A loopback OIDC provider signs tokens to test the complete Spring OAuth callback,
including invalid signature, issuer, audience, nonce/state, account collisions,
authenticated linking, concurrency, CSRF, email code limits and session revocation.
UTC avoids the host JVM's legacy `Asia/Saigon` alias on PostgreSQL images without it.

From the repository root, run browser acceptance tests:

```powershell
node tests/test-data/run-identity-e2e.mjs
```

The equivalent npm command is `npm.cmd run test:e2e:identity`. The runner creates
a unique temporary root before importing TestCafe to avoid reusing a profile
still held by an earlier Chrome process. To check browser startup independently
of Identity/database setup, run `npm.cmd run test:e2e:browser`.

The runner requires that named test container and the packaged JAR. It creates a
separate `identity_browser_tests` database/schema in that container if absent, so
backend integration resets cannot affect browser tests. It starts
the backend on 18080, Vite on 15173 and fake OIDC/Resend on 19090, all
on loopback, then runs TestCafe in headless Chrome. Set `IDENTITY_TEST_BROWSER` to use
another installed TestCafe browser. Test artifacts go to ignored `artifacts/identity-e2e`.
It does not use live Google credentials or mail. Stop the test database when done
with `docker stop movie-ticket-identity-tests`; retain it with `docker start` for later runs.

`ResendIdentityMailTests` runs without a database using a loopback HTTP server.
It covers mail content/authentication, missing configuration, rejected provider
requests, invalid success responses, connection failures and provider selection:

```powershell
.\mvnw.cmd -B -ntp '-Dtest=ResendIdentityMailTests' test
```
