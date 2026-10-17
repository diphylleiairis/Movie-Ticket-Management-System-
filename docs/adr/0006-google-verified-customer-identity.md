# Accept verified Google email for Customer registration

Status: approved by the project owner on 2026-10-17.

Spring Boot validates Google's OpenID Connect response before Identity accepts its
claims. A Google identity with `email_verified=true` satisfies initial registration
verification, so a new Customer is ACTIVE without a six-digit email challenge.
Missing/false verification rejects Google activation; email/password registration
retains the existing code workflow. Apple ID and email changes retain their rules.

Google identities are keyed by provider and stable subject, not email. An email
collision does not merge accounts. An active Customer may explicitly link Google
while authenticated, with that intent bound to the OAuth state/session. Linking
requires the same verified email and never provisions Admin or Cinema Staff.
An existing link preserves the Customer ID and active email even if Google's email
later changes. Disabled accounts remain disabled.

OAuth entry, callback and REST requests use the same public frontend origin through
Vercel rewrites. Sessions use host-only HttpOnly cookies (Secure in production),
CSRF protection and a validated local return path. Google tokens are not returned
to the browser as application credentials. Sessions are currently held in the one
backend instance and are lost on restart; persistent/shared sessions are deferred.
