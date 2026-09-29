# Movie Ticket Management System

University project for an online movie-ticket booking system.

## Install dependencies

From the repository root, set `JAVA_HOME` to a Java 21 JDK and run `npm install` (`npm.cmd install` in PowerShell if needed). This installs the frontend and TestCafe npm workspaces and downloads backend Maven dependencies through the Maven Wrapper. See [frameworks and setup](docs/setup/frameworks.md) for the full requirements and dependency list.

See [how to run tests](docs/setup/running-tests.md) for backend, frontend, and TestCafe commands.

## Repository map

- `frontend/`: React and TypeScript client application.
- `backend/`: Spring Boot server application and configuration.
- `tests/`: test cases, TestCafe E2E tests, unit/integration tests, fixtures, and traceability.
- `docs/`: requirements, planning files, design documents, reports, and ADRs.
- `scripts/`: repeatable project and test automation scripts.
- `artifacts/`: local generated test evidence; ignored by Git.

## Working conventions

Keep requirements, test cases, and automated tests in Git. Put generated screenshots, videos, and reports under `artifacts/`. Do not commit credentials or other secrets.
