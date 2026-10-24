# Customer account acceptance cases

| Case | Requirement | Expected behavior | Automation |
|---|---|---|---|
| ACC-01 | ID-02/05 | User icon opens `/account`; anonymous access returns to login | TestCafe |
| ACC-02 | ID-05 | Customer edits name/phone; trimmed fields persist; verified email remains read-only | Unit + Integration + TestCafe |
| ACC-03 | ID-04/05 | Invalid fields, missing CSRF, unauthenticated requests and non-Customer updates cannot change profile | Unit + Integration |
| ACC-04 | ID-02/05 | Saving refreshes current session version; same Customer ID/email/provider links preserved | Integration |
| ACC-05 | TCK-01/02 | Only principal's confirmed Booking tickets returned; no ID selection from client | Unit + Integration |
| ACC-06 | TCK-01/03 | Partial QR stays usable with remaining count; used and expired QR are gray with labels | Unit + TestCafe |
| ACC-07 | TCK-02 | Old upcoming purchase stays visible; past purchase older than 30 days hidden without deletion | Unit |
| ACC-08 | TCK-03 | Closing instant inclusive; after closing expired using Cinema-specific configuration/server time | Unit |
| ACC-09 | TCK-01 | QR recovery preserves original token; missing/wrong key, changed ciphertext or hash do not expose a QR | Unit |
| ACC-10 | ID-05/TCK-02 | Profile/ticket layout fits mobile; All/Upcoming/Used & expired filters select matching cards | TestCafe |

UI tests use mock responses only; real Identity persistence/security tests are opt-in
and require the isolated PostgreSQL database. Ticket issuance and actual staff
admission are not exercised by the account page suite.
