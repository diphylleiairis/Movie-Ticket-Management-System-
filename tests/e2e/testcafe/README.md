# TestCafe E2E tests

Store browser-level workflows here. Keep setup data in `tests/test-data/` and generated screenshots, videos, and reports in the ignored `artifacts/` directory.

TestCafe is declared in this directory's `package.json` and installed by `npm install` from the repository root.

Identity browser workflows run against the real backend and local OIDC/Resend fixtures
with `node tests/test-data/run-identity-e2e.mjs` from the repository root. Follow
[Identity setup](../../../docs/design/identity.md) to prepare its isolated Docker
PostgreSQL container and backend JAR. Google credentials and external email are not used.

This directory contains nine Identity tests and six page-recovery tests. Run
`npm.cmd run test:e2e:identity` for Identity. Run `npm.cmd run test:e2e:pages`
directly for page recovery; its runner starts Vite on an available local port
and closes it afterwards. Set `PAGE_TEST_BROWSER=chrome` for a visible browser.

Use `npm.cmd run test:e2e:browser` to check browser connection without the app.
All project runners isolate TestCafe's temporary root before importing it, so a
Chrome profile left by a previous run cannot intercept the next browser launch.
For custom CLI arguments, use `node tests/test-data/run-testcafe.mjs` instead of
calling `testcafe.cmd` directly. Full commands and troubleshooting are in
[Running tests](../../../docs/setup/running-tests.md).

The page runner also includes account and Admin Movie/User/Booking UI suites with mocked
APIs. To run only Admin management, set `$env:PAGE_TEST_SUITES = 'admin-dashboard'`
before `npm.cmd run test:e2e:pages`, then remove the variable afterwards. See
[Admin dashboard](../../../docs/design/admin-dashboard.md) for the separate
backend authorization checks, suspension rules and required V2 migration.

For Movie creation and catalog validation, set `PAGE_TEST_SUITES=admin-movies`;
see [Admin Movie design](../../../docs/design/admin-movies.md). This suite mocks
API writes, verifies role protection and does not create movies in Supabase.
