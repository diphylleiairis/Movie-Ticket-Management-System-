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

The backend currently has one test, `DemoApplicationTests.contextLoads`. It checks that Spring Boot starts and connects to PostgreSQL with the `test` profile. A successful run reports `Tests run: 1, Failures: 0, Errors: 0` and `BUILD SUCCESS`.

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

Once a test file with `fixture` and `test` declarations exists, start the application in two separate terminals:

```powershell
# Terminal 1: from the repository root
cd backend
$env:SPRING_PROFILES_ACTIVE = 'dev'
.\mvnw.cmd spring-boot:run
```

```powershell
# Terminal 2: from the repository root
npm.cmd run dev --workspace frontend
```

Then run TestCafe from the repository root in a third terminal:

```powershell
.\node_modules\.bin\testcafe.cmd chrome tests/e2e/testcafe
```

Chrome must be installed. At present, `tests/e2e/testcafe/` contains only `README.md` and `package.json`; it has no automated test cases. The message `Source files do not contain valid 'fixture' and 'test' declarations` means TestCafe found no runnable tests. It is not an application test result. When adding E2E tests, use a separate test environment and test data so development data is not changed.
