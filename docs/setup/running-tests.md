# Running tests

Run these commands in PowerShell. The backend requires JDK 21. If `java -version` does not use Java 21, select that JDK before installing dependencies or running Maven:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot'
```

This path is an example from the current development machine. Replace it with the path to your JDK 21 installation. If `JAVA_HOME` is already configured correctly, you do not need to set it again.

Install dependencies from the repository root as described in the [framework setup guide](frameworks.md):

```powershell
npm.cmd install
```

## Backend: JUnit and Spring Boot Test

From the repository root:

```powershell
cd backend
.\mvnw.cmd test
```

Backend tests include the startup/database smoke test, isolated Identity integration
tests and the Resend adapter tests. Identity integration tests are enabled only
when `TEST_DB_URL` points to the dedicated loopback `identity_tests` database.
See [Identity setup](../design/identity.md) for the full database preparation.

Spring Boot reads the root `.env` file automatically. The `test` profile prefers `TEST_DB_URL`, `TEST_DB_USER`, and `TEST_DB_PASSWORD`. If those variables are absent, the current startup smoke test uses the existing `POSTGRES_*` values from `.env`; you do not need to enter database variables in the terminal. Before adding tests that write or delete data, configure `TEST_DB_*` for a separate test database.

## Frontend: lint and build checks

Return to the repository root and run:

```powershell
cd ..
npm.cmd run lint:frontend
npm.cmd run build:frontend
```

These commands check lint, TypeScript, and the production build. They are not unit tests. Vitest and React Testing Library are not installed yet, and the repository has no frontend unit tests or `npm test` script.

## TestCafe: browser E2E tests

Run all commands below from the repository root. Chrome must be installed.
The project runners give each invocation a separate temporary/profile directory
under ignored `artifacts/testcafe-runtime/` before importing TestCafe.

### Browser connection check

This checks browser startup and access to a local HTML page without starting the
application or using a database:

```powershell
npm.cmd run test:e2e:browser
```

### Identity: five workflows

Start Docker Desktop and prepare the test PostgreSQL container and backend JAR
as described in [Identity setup](../design/identity.md). If the container already
exists:

```powershell
docker start movie-ticket-identity-tests
cd backend
.\mvnw.cmd -B -ntp -DskipTests package
cd ..
npm.cmd run test:e2e:identity
```

The runner starts its own backend, Vite and fake Google/Resend services. It uses a
separate browser-test database, never live Google or email credentials. The five
workflows cover email registration/verification/session/logout, invalid login,
verified Google registration, unverified Google rejection and explicit Google linking.

Default browser: `chrome:headless`. To see the browser, set this before running
the browser check or Identity runner:

```powershell
$env:IDENTITY_TEST_BROWSER = 'chrome'
npm.cmd run test:e2e:identity
```

Use `Remove-Item Env:IDENTITY_TEST_BROWSER -ErrorAction SilentlyContinue` to return
to the default. Logs and failure screenshots are in `artifacts/identity-e2e/`.

### Page recovery, account and admin dashboard: twenty workflows

Run directly, without starting Vite separately:

```powershell
npm.cmd run test:e2e:pages
```

These tests cover 404, 4xx/5xx backgrounds, missing booking steps, preserved Movie
selection, invalid checkout seats and mobile recovery. No database is required.
The runner also checks customer account workflows and the ADMIN-only dashboard,
including direct-URL denial for other roles, session recovery, charts, search,
period changes, CSV export and mobile navigation. These UI suites mock their APIs;
dashboard server authorization is tested separately as described in
[Admin dashboard](../design/admin-dashboard.md). Set `PAGE_TEST_SUITES` to a
comma-separated subset of `page-recovery,account,admin-dashboard` to select suites.
The runner starts its own Vite server on an available loopback port, sets the
test target to that server, and closes it after the tests. It does not use a
frontend URL inherited from another terminal or depend on port 5173 being free.
Failure screenshots are saved under `artifacts/page-recovery-e2e/`.
The page fixture mocks the header's session lookup as an anonymous 401 response;
it does not call the Identity backend. Session/authentication tests remain in
the separate Identity suite.

To see the browser:

```powershell
$env:PAGE_TEST_BROWSER = 'chrome'
npm.cmd run test:e2e:pages
```

Return to headless:

```powershell
Remove-Item Env:PAGE_TEST_BROWSER -ErrorAction SilentlyContinue
npm.cmd run test:e2e:pages
```

`PAGE_TEST_BROWSER` only controls page recovery. `IDENTITY_TEST_BROWSER` controls
Identity and the browser connection check. These PowerShell environment changes
apply to the current terminal session.

To target a frontend you have already started and pass other TestCafe CLI options,
use the project wrapper. Set `FRONTEND_URL` if its URL differs from the default
`http://127.0.0.1:5173`:

```powershell
node tests/test-data/run-testcafe.mjs chrome tests/e2e/testcafe/page-recovery.test.js --hostname 127.0.0.1 --disable-native-automation
```

### BrowserConnectionError / E1063

On this Windows setup, an interrupted TestCafe run left Chrome holding a temporary
profile. TestCafe reused that unlocked directory, and Chrome forwarded the new
launch to the old process instead of connecting to the current test server.
The project runners isolate temporary directories per invocation to prevent this.
Increasing the initialization timeout alone does not fix a reused profile.

Prefer the commands above over invoking `testcafe.cmd` directly. They do not close
personal Chrome windows or delete existing browser profiles. If startup still
fails, run `npm.cmd run test:e2e:browser` first to isolate the browser problem from
backend/database setup.
