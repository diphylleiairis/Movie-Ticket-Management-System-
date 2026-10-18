# Test data

Place reusable, non-secret fixtures and seed data here. Never commit passwords, payment credentials, provider secrets, or personal data.

`testcafe-runtime.mjs` prepares a fresh temporary root per process before TestCafe
is imported. Both `run-identity-e2e.mjs` and the generic `run-testcafe.mjs` CLI
wrapper use it. `check-testcafe-browser.mjs` runs the regression test in
`tests/e2e/browser-startup/` against a disposable loopback HTML server.

`run-page-recovery-e2e.mjs` starts Vite on an available loopback port and runs the
page-recovery suite against it, then closes both TestCafe and Vite. No separately
running frontend or backend is required.
