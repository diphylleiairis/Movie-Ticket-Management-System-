# Identity acceptance cases

| Case | Requirement | Scenario / expected result | Automation |
|---|---|---|---|
| ID-T01 | ID-01 | Email registration creates pending Customer, sends six digits, correct code activates | Integration + TestCafe |
| ID-T02 | ID-01 | Duplicate/invalid input and missing terms do not create another account | Integration |
| ID-T03 | ID-01 | Invalid/expired code does not activate; five bad attempts lock challenge; resend supersedes old challenge after cooldown | Integration |
| ID-T04 | ID-02 | Valid password login rotates/persists session; reload retains identity; logout ends it | Integration + TestCafe |
| ID-T05 | ID-02 | Invalid password or unverified/disabled account does not authenticate | Integration + TestCafe |
| ID-T06 | ID-01/02, ADR 0006 | Verified Google creates active Customer without sending code; subsequent Google login preserves Customer ID and current email | Integration + TestCafe |
| ID-T07 | ID-01/02 | False/missing Google verification cannot activate; userinfo cannot override unverified ID token | Integration + TestCafe |
| ID-T08 | ID-02/04 | Forged token signature, wrong issuer/audience/nonce or invalid state does not create account/session | Integration |
| ID-T09 | ID-02 | Email collision requires password sign-in and explicit linking; mismatched email cannot link | Integration + TestCafe |
| ID-T10 | ID-02 | Concurrent callbacks for same subject create one Customer and one link | Integration |
| ID-T11 | ID-04 | Customer cannot use Admin/staff routes; unauthenticated protected request rejected; mutation needs CSRF | Integration |
| ID-T12 | ID-03 | Reset token is hashed, expires, is one-time and changes password; old sessions cease working | Integration |
| ID-T13 | ID-01 | Mail failure rolls back pending account/challenge | Integration |
| ID-T14 | ID-02 | External/encoded redirect destinations fall back to frontend home | Integration |
| ID-T15 | ID-01/03 | Resend sends server-authenticated email; missing key/sender, provider rejection, malformed response and connection errors fail safely without leaking provider details | Resend adapter tests |
| ID-T16 | ID-02 | Default same-origin frontend API signs in; header restores account after navigation and signs out using backend session/CSRF | TestCafe |
| ID-T17 | ID-03 | Reset email link opens password form with token supplied automatically; mismatched passwords are rejected; valid submission changes password; old password and reused/invalid/missing token are rejected; UI offers requesting a new link | Resend adapter + Integration + TestCafe |
| ID-T18 | ID-01/02 | Default Google endpoint works without frontend env override; registration requires terms, creates Customer and later sign-in restores same Customer | TestCafe |
| ID-T19 | ID-01/02/03 | Active Google Customer without password receives reset email; valid token creates first password; Google and password sign-in resolve the same Customer; token remains one-time and prior sessions are revoked | Integration + TestCafe |
| ID-T20 | ID-03 | Missing reset account returns `404 ACCOUNT_NOT_FOUND`; non-`ACTIVE` status returns `403 ACCOUNT_UNAVAILABLE` with administrator contact guidance; neither creates a token nor sends reset email | Unit |
| ID-T21 | ID-03 | Resend reset uses published alias `password-reset` with the trusted frontend reset link in `RESET_URL` and stored account name in `USER_NAME`, without inline text/HTML; template rejection reports delivery unavailable without retrying | Resend adapter + Unit |
| ID-T22 | ID-03 | ACTIVE Admin with verified email receives and redeems reset link; same ID/role retained and prior sessions revoked. Unverified/inactive Admin and Cinema Staff cannot reset. Expired, consumed and old-email tokens are rejected | Unit + Integration |

Automated integration tests use only the dedicated loopback `identity_tests` database.
Browser tests use deterministic local OIDC/Resend fixtures; real Google consent and
deployed proxy/cookie behavior still require a smoke check with configured test users.
