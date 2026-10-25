# Admin dashboard acceptance cases

Overview remains the default Admin screen in the original sidebar layout.
User/Booking child routes and navigation continuity are specified in
[Admin management](admin-management.md).

| Case | Requirement | Scenario / expected result | Automation |
|---|---|---|---|
| ADM-01 | ID-02/04 | Only ADMIN sees header dashboard entry; following it opens the overview | TestCafe |
| ADM-02 | ID-04 | Anonymous direct visit redirects to login with safe admin return destination and does not request reports | TestCafe |
| ADM-03 | ID-04 | CUSTOMER and CINEMA_STAFF receive 403 at both admin URLs; report component never mounts | TestCafe |
| ADM-04 | ID-04 | Real report API returns 401 to anonymous and 403 to CUSTOMER/CINEMA_STAFF without invoking reporting | Spring MVC security |
| ADM-05 | ID-04 | ADMIN can read the uncached report; default period is 30 days; unsupported periods are rejected | Spring MVC security |
| ADM-06 | ID-04 | Report handles Vietnam midnight/month boundary and compares the immediately preceding equal-length period | Unit |
| ADM-07 | ID-04 | Confirmed purchased seats aggregate across Showtimes of the same Movie; recent status/currency are preserved | Unit |
| ADM-08 | ID-04 | Daily/Weekly selection, recent booking search, period request and mobile navigation work | TestCafe |
| ADM-09 | ID-04 | API 401/403 does not display report content; API unavailable offers working retry without sample data | TestCafe |
| ADM-10 | ID-04 | Empty database returns empty series/rankings, zero totals and clear empty states | Unit + TestCafe |

See [design and commands](../../docs/design/admin-dashboard.md). Browser fixtures
mock the API; server access checks run separately against the real security chain.
