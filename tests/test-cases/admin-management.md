# Admin account and Booking management

Scope: owner decision 2026-10-24, ID-04, Identity and Booking read contracts.
Booking cancellation and cancellation email are deferred.

| Case | Expected result | Automation |
|---|---|---|
| ADM-M01 | Original sidebar groups/brand/footer remain; Overview is default; Movie/User/Booking are child routes; old section anchors are removed; navigation preserves the sidebar node and document without additional session checks; a render failure still recovers through client navigation | TestCafe |
| ADM-M02 | User list shows all roles/statuses through server pages; search filters name/email, including beyond first page | Unit + TestCafe |
| ADM-M03 | Update to SUSPENSE is CSRF protected and persists on the same account; repeated status is a no-op | Unit + Security + Integration + TestCafe |
| ADM-M04 | Suspended accounts cannot use password or Google login, current sessions fail on next request; restoring ACTIVE requires a fresh login | Unit + Integration |
| ADM-M05 | Admin cannot update their own status or activate an unverified Customer; unknown account, invalid status and pending verification fail without writes | Unit + TestCafe |
| ADM-M06 | Anonymous and Customer/Staff cannot list or update; missing CSRF fails; 401/403 removes browser content | Security + TestCafe |
| ADM-M07 | Booking list includes old and unconfirmed/cancelled records, preserves original currency/amount, supports all pages; no cancellation control exists | Unit + TestCafe |
| ADM-M08 | Lists handle empty responses, errors/retry, status-write failure without fake success, and mobile navigation | TestCafe |
| ADM-M09 | Authorized Admin preloads default sections only; a cached User list renders while a simulated 2.5-second refresh is pending; prefetch and the visible reader share in-flight requests | Frontend store + TestCafe |
| ADM-M10 | Late reads cannot undo successful status changes; page/search keys are isolated; leaving Admin and 401/403 clear cached data, and another Admin visit starts with an empty store | Frontend store + TestCafe |
| ADM-M11 | A transient background refresh failure retains the last successful result with an explicit retry notice; retry can replace it with fresh data | Frontend store |

Apply V2 only to the dedicated integration database when running automated checks.
No test should update accounts or send email against the deployed project database.
