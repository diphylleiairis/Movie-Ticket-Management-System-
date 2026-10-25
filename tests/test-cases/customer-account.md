# Customer account acceptance cases

| Case | Requirement | Expected behavior | Automation |
|---|---|---|---|
| ACC-01 | ID-02/05 | User icon opens `/account`; anonymous access returns to login | TestCafe |
| ACC-02 | ID-05 | Customer edits name/phone; trimmed fields persist; verified email remains read-only | Unit + Integration + TestCafe |
| ACC-03 | ID-04/05 | Customer/Admin/Staff edit only their own name/phone; invalid fields, suspended accounts, missing CSRF and unauthenticated requests cannot change profile; role/email stay unchanged | Unit + Integration |
| ACC-04 | ID-02/05 | Saving refreshes current session version; same Customer ID/email/provider links preserved | Integration |
| ACC-05 | TCK-01/02 | Only principal's confirmed Booking tickets returned; no ID selection from client | Unit + Integration |
| ACC-06 | TCK-01/03 | Partial QR stays usable with remaining count; used and expired QR are gray with labels | Unit + TestCafe |
| ACC-07 | TCK-02 | Old upcoming purchase stays visible; past purchase older than 30 days hidden without deletion | Unit |
| ACC-08 | TCK-03 | Closing instant inclusive; after closing expired using Cinema-specific configuration/server time | Unit |
| ACC-09 | TCK-01 | QR recovery preserves original token; missing/wrong key, changed ciphertext or hash do not expose a QR | Unit |
| ACC-10 | ID-05/TCK-02 | Profile/ticket layout fits mobile; All/Upcoming/Used & expired filters select matching cards | TestCafe |
| ACC-11 | ID-02/04/05 | Admin icon opens dropdown with Edit profile and Admin dashboard; Staff has Edit profile and disabled Staff dashboard (Coming soon). Customer retains direct account navigation | TestCafe |
| ACC-12 | ID-02/05 | Admin/Staff save their own profile; no Customer tickets requested/displayed. Dropdown closes after navigation, outside click, leaving focus and Escape; mobile dropdown stays within viewport | TestCafe |
| ACC-13 | ID-02/04 | Clicking profile while the session lookup is pending cannot open login; after a valid Identity response, Admin/Staff get the role dropdown | TestCafe |
| ACC-14 | ID-02 | Identity errors or malformed responses offer retry without login navigation; confirmed 401 makes the icon a sign-in link; successful logout clears the role menu and opens login | TestCafe |

UI tests use mock responses only; real Identity persistence/security tests are opt-in
and require the isolated PostgreSQL database. Ticket issuance and actual staff
admission are not exercised by the account page suite.
