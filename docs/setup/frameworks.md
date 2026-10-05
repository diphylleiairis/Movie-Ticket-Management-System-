# Frameworks and dependency setup

This project has one React frontend, one Spring Boot backend, and browser E2E tests with TestCafe. Install dependencies from the repository root with one command:

```powershell
npm install
```

## Prerequisites

- Node.js and npm (verified locally with Node.js 24 and npm 11).
- A Java 21 or newer JDK. Set `JAVA_HOME` to that JDK before running `npm install`. The backend Maven project targets Java 21.
- Network access to the npm registry and Maven Central on the first install.

On Windows PowerShell, if Java 21 is installed but another Java version is first on `PATH`, set `JAVA_HOME` for the current terminal before installation:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot'
npm.cmd install
```

The JDK path above is an example from the local machine; use the path to your own Java 21 JDK. In PowerShell, `npm.cmd` also works when the `npm.ps1` execution policy blocks `npm`.

## What `npm install` installs

| Area | Declared dependencies | Manifest |
|---|---|---|
| Frontend runtime | React 19, React DOM 19, Lucide React icons, React Router 7, qrcode.react 4 | `frontend/package.json` |
| Frontend build and lint | TypeScript 6, Vite 8, React Vite plugin, ESLint and React lint plugins | `frontend/package.json` |
| Browser E2E | TestCafe 3 | `tests/e2e/testcafe/package.json` |
| Backend | Spring Boot 4.1.1, Web MVC, Data JPA, Security, Validation, PostgreSQL JDBC driver, Lombok, Spring Boot 4 dotenv integration, backend test starters | `backend/pom.xml` |

The root `package.json` uses npm workspaces for the frontend and TestCafe. Its `postinstall` script calls `backend/mvnw` (`mvnw.cmd` on Windows) with `dependency:go-offline` to download Maven-managed backend dependencies. npm does not manage Java packages itself. PostgreSQL is a database service, so `npm install` does not install or create a PostgreSQL server or Supabase project.

The root `package-lock.json` pins the installed JavaScript dependency versions. Maven resolves backend versions from `backend/pom.xml` and the Spring Boot parent. Run dependency installation from the repository root so npm includes both workspaces and the backend postinstall step.

When adding a frontend npm library, declare it in `frontend/package.json` and update the root `package-lock.json`. This keeps the one-command root installation complete and reproducible.

## After installation

Installation downloads dependencies but does not start the application, connect to the database, or run tests. The local backend `dev` profile reads the ignored root `.env` file. On a deployed server, supply real environment variables. The backend `test` profile also reads the root `.env`. Its current context-load smoke test uses `POSTGRES_*` if `TEST_DB_URL`, `TEST_DB_USER`, and `TEST_DB_PASSWORD` are absent, so `.\mvnw.cmd test` needs no manual database variables. Configure `TEST_DB_*` for a separate database before adding tests that change data.

The approved structure also calls for Flyway, OpenAPI, Vitest, and React Testing Library. They are planned, but are not declared as installed dependencies yet. Add them when their corresponding migrations, API contract, or focused frontend tests are implemented.
