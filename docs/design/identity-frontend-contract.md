# Identity frontend integration

Status: frontend and backend implemented for email/password and Google authentication.

The account pages are `/login`, `/register`, and `/forgot-password`. The header links to sign-in and carries a same-origin return path so the customer can return to their movie or checkout after successful authentication.

These pages are nested React Router routes under a shared `AuthLayout`. The layout owns the header, featured film, footer, and information dialog; `<Outlet />` renders the current account form. Internal account navigation uses `<Link>` and successful login uses `useNavigate`, so switching forms does not reload the document. Each account route mounts a fresh form to clear passwords, verification challenges, and completion/error state from the previous form. An in-flight request from a form that has been left cannot navigate the customer away from their current page. The validated `returnTo` query is preserved between account routes. Browser Back/Forward and direct URLs select the matching form.

Google and Apple authentication continue to redirect to the configured backend/provider flow because those flows leave the application.

Apple ID is temporarily hidden on the login and registration forms. Google is the only visible social provider and its button spans the full form width; Apple configuration and redirect support are retained.

Email authentication defaults to `/api/v1/identity` through the Vite/Vercel proxy.
The header retrieves `/me` to display the signed-in Customer after navigation/reload
and offers a CSRF-protected Sign out action. Sessions use backend HttpOnly cookies;
the frontend never stores passwords or session tokens in local storage.
Unconfigured social providers display an unavailable-service message.

## Configuration

Email authentication works through the default same-origin API path without a frontend env file. Copy `frontend/.env.example` to `frontend/.env.local` to override public endpoints or enable social providers. Restart Vite after changing configuration.

| Variable | Expected value |
|---|---|
| `VITE_IDENTITY_API_URL` | API base ending in `/api/v1/identity` |
| `VITE_GOOGLE_AUTH_URL` | Backend URL that starts Google authentication |
| `VITE_APPLE_AUTH_URL` | Backend URL that starts Apple authentication |

Deployed endpoints use HTTPS. HTTP endpoints on localhost are accepted for development. Provider secrets stay on the backend and must not use the `VITE_` prefix.

## Email API contract

The frontend includes cookies on requests. It first fetches `GET /csrf`, expecting JSON `{ "token": "..." }`, and sends that value as `X-CSRF-TOKEN` on subsequent POST requests. The backend issues HTTP-only session cookies and enforces the existing email verification and authorization rules.

| POST endpoint | Request fields | Expected successful JSON status |
|---|---|---|
| `/login` | `email`, `password`, `rememberMe` | `AUTHENTICATED` |
| `/register` | `fullName`, `email`, `password`, `acceptedTerms` | `VERIFICATION_REQUIRED` |
| `/email-verification/resend` | `challengeId` | `VERIFICATION_REQUIRED` |
| `/email-verification/confirm` | `challengeId`, `code` (six numeric characters) | `EMAIL_VERIFIED` |
| `/password-reset` | `email` | `REQUEST_ACCEPTED` |
| `/logout` | none | `SIGNED_OUT` |

Endpoint paths are relative to the configured API base. Responses must be JSON. Registration and resend responses must include a nonempty opaque `challengeId` identifying the server's pending registration verification. They send a six-digit code to the registration email. The frontend retains the challenge only in memory and clears passwords after registration succeeds.

Registration success opens six numeric input boxes with automatic focus advancement, Backspace/arrow navigation, full-code paste/autofill, a Verify Email action, and Resend Code. Verify is enabled only when all six digits are entered. Sending and verifying cannot run concurrently. A successful resend replaces the in-memory challenge and clears the old code entry. Only an `EMAIL_VERIFIED` response shows verified-account confirmation and a link to sign in; the frontend never signs the customer in automatically or activates an account from a local code comparison.

Error responses may include `code: "EMAIL_NOT_VERIFIED"`, `INVALID_VERIFICATION_CODE`, or `EXPIRED_VERIFICATION_CODE`; 401, 409, and 429 map to credential, duplicate-email, and retry-limit messages. The backend owns delivery, code expiration, request limits, challenge-to-account binding, and activation. Reset responses must avoid revealing whether an account exists.

Registration UI validates email, nonblank name, password confirmation, acceptance of terms, and password guidance (at least eight characters including a number). The backend validates these rules independently. Login does not apply new-password rules to existing credentials. Legal-policy panels are placeholders until the project publishes its policies.

## Social authentication

The frontend redirects to the configured backend start URL with `intent=login` or `intent=register` and a `returnTo` path. For registration, the customer first checks the agreement box; the backend remains responsible for enforcing its registration policy.

The backend validates Google provider responses, state and nonce, permitted return paths, Customer-only public registration, email uniqueness, and the project email-verification rules. Explicit authenticated linking preserves Customer identity and Booking/Ticket ownership. Resend sends verification codes from the backend; SMTP remains an explicit alternative. See [Identity backend](identity.md) for configuration and limits. Apple login remains unimplemented. The frontend never consumes provider tokens or assumes a provider button click has authenticated the customer.

Google requires OAuth credentials and a registered redirect URI, and its documented server flow validates the returned identity before authentication. See [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect).

Apple web sign-in requires configured Services ID and website/return URL registration. See [Apple web sign-in configuration](https://developer.apple.com/help/account/capabilities/configure-sign-in-with-apple-for-the-web/).
