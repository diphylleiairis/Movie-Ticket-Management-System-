# Admin dashboard

The `/admin` page (also available at `/admin/dashboard`) is the ADMIN-only workspace
for ID-04. Its original sidebar brand, WORKSPACE/PLATFORM groups, Back to cinema,
access card and account footer are preserved. Overview is the default at `/admin`
and `/admin/dashboard`; Movie, User and Booking are child routes at `/admin/movies`,
`/admin/users` and `/admin/bookings`. The earlier Movie/Revenue section anchors
are replaced by real section navigation. See [Movie creation](admin-movies.md).

The authorized parent route owns the sidebar and header; children use `<Outlet />`.
React Router links replace content without reloading the document, remounting the
sidebar or checking the session again. Pagination fetches the next data page inside
that layout. Direct URLs and Back/Forward work. Legacy `?tab=users|bookings` URLs
redirect to the matching child route.

## Background data loading

After Identity confirms ADMIN access, the shared layout owns an in-memory data
store scoped to that mounted account. The visible page starts first; a deferred
task preloads the 30-day Overview and the first 25 Movie/User/Booking records. Hover or
keyboard focus on a sidebar section also warms its default data. It never loads
all Booking pages or sends a mutation speculatively.

Tab/page/search/period keys share pending requests and retain successful results.
Opening a cached view renders it immediately while checking the backend again;
window focus also refreshes the active view. Background prefetch reuses results
younger than 30 seconds. Each list keeps a working set of 20 page/search entries,
retaining any actively observed entry during eviction. Each report period has its
own entry. A temporary refresh failure keeps the previous result with an explicit
retry notice; initial failures still show the normal error state.

Successful Movie creation invalidates catalog pages/searches and Overview counts.
Successful user status writes update every cached occurrence and cancel older
reads so a late response cannot restore the old status. An API 401/403 clears the
entire store and removes Admin content. Leaving the Admin layout or signing out
aborts pending reads and clears stored results. The store is recreated on each
Admin visit and keyed to the authenticated account; it uses no localStorage,
sessionStorage or persistent HTTP cache. API responses retain `no-store` headers.

Prefetch hides latency only once the request has finished; the first request and
a backend cold start can still require waiting. This change does not reduce query
execution time or replace server authorization.

## Account and Booking management

- `GET /api/v1/admin/users?page=0&size=25&q=` returns accounts across all roles,
  including inactive accounts. Search matches name/email on the server. The response
  contains `items`, `total`, `page`, `size`; passwords and provider credentials are excluded.
- `POST /api/v1/admin/users/{id}/status` accepts `{status: "ACTIVE" | "SUSPENSE"}`.
  Server-side ADMIN authorization and a fresh CSRF token are required. Identity
  locks the target account for the transaction. Self-updates and pending-verification
  accounts are rejected; an unverified Customer cannot be activated. Repeating the
  current status is a no-op. No role, password, email, Booking or Ticket is changed.
- `SUSPENSE` blocks password and Google login. Existing sessions are rejected on
  their next request through the existing active-account/version check. Reactivation
  preserves identity and requires a new sign-in; it cannot revive an old session.
  Existing `DISABLED` values remain supported.
- `GET /api/v1/admin/bookings?page=0&size=25` returns every Booking state and date,
  sorted newest first, with original currency, total, seat count, customer and movie.
  It is separate from the historical eight-row overview subset. There is no
  30-day history filter for Admin. Movie/customer references are resolved through
  module application contracts. Both lists use bounded pages of 1–100 records.
- All management responses use `Cache-Control: no-store`. Anonymous callers receive
  401 and other roles 403. The frontend removes list content on either response.
- Apply [V2](../../backend/src/main/resources/db/migration/V2__account_suspense_status.sql)
  after V1 before using status updates. It extends the existing account status CHECK
  without rewriting existing rows. Backend startup does not apply migrations.

Booking cancellation and cancellation emails are deferred for consideration by the
owner. No cancellation button, Booking mutation or cancellation mail is implemented.
The deferred work is recorded in [planning considerations](../planning/admin-booking-cancellation-considerations.md).
Before implementation, decide paid-booking eligibility, provider refund/cancellation,
Ticket/QR invalidation, atomic seat release, notification delivery and audit behavior.

## Overview

The Overview tab displays the existing report, metric cards, revenue chart, genre
breakdown, recent Bookings and top Movies. Its report definitions follow.

## Access and navigation

The page checks `/api/v1/identity/me` before mounting the dashboard. Anonymous
visitors go to `/login?returnTo=%2Fadmin`; Customers and Cinema Staff see 403.
An unavailable Identity service displays a retry state without rendering reports.
Only ADMIN accounts see the dashboard entry in the site header. Password login
with ADMIN and the default home destination opens `/admin`; an explicit return
destination is preserved. Admin accounts remain provisioned, never publicly
registered.

`GET /api/v1/admin/dashboard?days=30` independently requires ADMIN through the
existing Spring Security URL policy and controller method authorization. It
returns `Cache-Control: no-store`. An expired session returns 401; other roles
receive 403. Client state cannot authorize this endpoint. Both errors remove
report content on the frontend. No schema or account provisioning is changed.

## Read contracts and metric definitions

Booking owns the dashboard composition and its booking queries. It calls public
application contracts from Identity (`AdminAccounts`), Catalog (`AdminCatalog`)
and Scheduling (`AdminScreenings`). Each repository reads only tables owned by
its business module. The overview runs in a read-only repeatable-read transaction
and does not change Booking, Seat, Payment Attempt or Ticket states.

- Total users: all provisioned/registered accounts, including inactive accounts,
  across all roles, all time. Active movies: current `ACTIVE` movie count.
- Periods: 7, 30 or 90 calendar days, including today, in `Asia/Ho_Chi_Minh`.
  Queries use inclusive start and exclusive end; previous period is the same
  number of calendar days immediately before the selected period. Today's totals
  are partial and compared with the complete preceding period.
- Total bookings: every booking created in the period, regardless of status.
- Revenue: original VND totals of currently `CONFIRMED` Bookings whose
  `confirmed_at` falls in the period. Payment Attempts are never summed. Other
  currencies are excluded from revenue and retain their own currency in the
  recent bookings table; provider conversion quotes do not affect these totals.
- Chart: revenue grouped by Vietnam calendar date; missing dates are zero.
  Weekly mode groups consecutive seven-day buckets starting at the period start.
- Recent bookings: latest eight created in the period, with original status,
  customer name, movie, seat count, amount and currency. Search filters this
  displayed subset, not the entire booking database.
- Top movies: purchased seats of confirmed Bookings in the period, aggregated
  across Showtimes, including historical/archived movie references.
- Genre shares: same purchased seats attributed once to each movie's
  alphabetically first genre, or Other if no genre is configured. The chart
  combines genres beyond the first four into Other genres. This is a booking
  report; it does not measure streaming or actual attendance.

The browser provides Daily/Weekly chart selection, period selection, recent
booking search, responsive sidebar navigation and CSV export of the loaded
summary, nonzero revenue dates and latest eight bookings. CSV fields are escaped
and leading spreadsheet formula characters are prefixed. No management actions
or ticket cancellation actions are introduced. Empty databases show zero values
and empty states; API failures never substitute sample metrics.

## Verification

`AdminAccountStatusTests`, `AdminManagementSecurityTests` and `AdminBookingsTests`
cover suspension/reactivation, registration guards, password/Google/session denial,
bounded lists, original currency/status preservation, roles and CSRF.
TestCafe `admin-dashboard.test.js` covers the Overview/User/Booking workspace,
status editing, pagination/search, denied access, empty/error states and mobile tabs.
It also asserts the sidebar node and browser document survive navigation, with
no additional session check during section changes. Its responses are fixtures; it sends no real mail
or live account updates.

`AdminDashboardSecurityTests` exercises the overview's Spring Security configuration
with mocked reporting dependencies, without a database. `AdminDashboardTests`
checks Vietnam period boundaries, booking aggregation and original currency/
status preservation. These checks are not a substitute for data-backed integration tests.

`node --test tests/test-data/check-admin-prefetch.mjs` verifies shared pending reads,
cached refreshes, mutation/read races, scope cleanup, retries and 401/403 invalidation
against the actual frontend store without a database. TestCafe also verifies a
prefetched User list is visible while a simulated 2.5-second refresh is pending,
and a later access denial removes that cached content.

```powershell
$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot'
cd backend
.\mvnw.cmd -B -ntp '-Dtest=AdminAccountStatusTests,AdminManagementSecurityTests,AdminBookingsTests,AdminDashboardTests,AdminDashboardSecurityTests' test
cd ..
$env:PAGE_TEST_SUITES = 'admin-dashboard'
npm.cmd run test:e2e:pages
Remove-Item Env:PAGE_TEST_SUITES
```

Frontend build and lint remain `npm.cmd run build:frontend` and
`npm.cmd run lint:frontend`. Data-backed reporting requires the existing V1 schema
and backend database read privileges. No live database is modified by these
focused checks.
