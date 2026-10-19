# Software Structure Plan

Status: approved

## Purpose

This document defines the software structure for the Online Movie Ticket Booking project before application implementation begins. The system is a web application designed for browser-based workflows and TestCafe acceptance tests.

## Architectural decision

The system uses a modular monolith:

```text
One React + TypeScript frontend
        ↓ REST/JSON API
One Spring Boot backend
        ↓
One PostgreSQL database
```

The backend is one deployable application. Its business behavior is divided into modules; the modules are not separate services or separate servers.

The existing `frontend/MainWindow.xaml` placeholder is not part of the target web application and will be replaced by the React frontend during implementation.

## Repository structure

```text
frontend/
├── src/
│   ├── app/
│   ├── api/
│   ├── routes/
│   ├── shared/
│   └── features/
│       ├── identity/
│       ├── catalog/
│       ├── venue/
│       ├── scheduling/
│       ├── booking/
│       ├── payment/
│       ├── tickets/
│       └── ticket-validation/
└── tests/

backend/
├── src/
│   ├── main/
│   │   ├── java/.../
│   │   │   ├── shared/
│   │   │   └── modules/
│   │   │       ├── identity/
│   │   │       ├── catalog/
│   │   │       ├── venue/
│   │   │       ├── scheduling/
│   │   │       ├── booking/
│   │   │       ├── payment/
│   │   │       ├── tickets/
│   │   │       └── ticketvalidation/
│   │   └── resources/
│   │       ├── db/migration/
│   │       ├── application-dev.yml
│   │       ├── application-test.yml
│   │       └── application-prod.yml
│   └── test/
└── pom.xml

tests/
├── test-cases/
├── e2e/testcafe/
├── test-data/
└── traceability/
```

## Frontend styling

The React frontend uses Tailwind CSS 4 with the `@tailwindcss/vite` plugin. Components declare presentation, responsive layouts, and interactive states with utility classes in TSX. `frontend/src/index.css` imports Tailwind's theme and utilities and retains only global browser defaults, accessibility rules, and shared animation keyframes. Preflight is omitted to preserve the existing browser defaults during the migration. Existing semantic class names remain as state and TestCafe selector hooks.

## Frontend routing

React Router provides browser routing. `frontend/src/routes/app-routes.tsx` defines page routes, and `frontend/src/main.tsx` mounts them inside `BrowserRouter`. Identity owns a shared account layout with nested login, registration, and password-reset routes rendered through `<Outlet />`. Internal account links use React Router `Link` to preserve the layout during navigation. Deployment must serve the frontend entry document for direct browser requests to frontend page routes while keeping `/api/v1/` requests routed to the backend.

Frontend recovery screens live in `frontend/src/shared/`. Unknown page URLs render a 404 screen; `/error/:status` supports 400–599 with the supplied cinema-stage background for 4xx and maintenance background for 5xx. `/404` and `/500` are direct preview routes. A route-scoped React error boundary renders the 500 screen for rendering failures and resets on navigation. These are frontend screens; they do not set the HTTP status returned by the hosting server or replace endpoint-specific form validation.

Opening showtimes without a Movie, seats without a valid Showtime, or checkout without a valid seat selection displays a booking recovery card with the required next step. It preserves a valid Movie and Showtime when linking back, removes invalid seat selections, and never creates a Seat Hold or Payment Attempt. An unknown Movie on the showtime page renders 404.

## Backend module structure

Each business module follows the same internal structure:

```text
module/
├── api/
├── application/
├── domain/
├── infrastructure/
└── tests/
```

- `api/` contains REST controllers and request/response models.
- `application/` contains use cases and transaction orchestration.
- `domain/` contains entities, value objects, and business rules.
- `infrastructure/` contains database repositories and external adapters.
- `tests/` contains module-focused unit and integration tests.

## Business modules

| Module | Owns |
|---|---|
| Identity | Accounts, authentication, email verification, roles, and profile changes |
| Catalog | Movies, search, filtering, active catalog, and archival rules |
| Venue | Locations, cinemas, halls, layouts, seats, and per-Cinema check-in window configuration |
| Scheduling | Showtimes, overlap validation, buffer validation, and showtime removal rules |
| Booking | Seat selection, atomic seat holds, expiration, and booking state |
| Payment | Payment attempts, retries, provider adapters, idempotency, and reconciliation |
| Tickets | One confirmed Ticket/QR per Booking, cumulative admitted count, upcoming tickets, and recent history |
| Ticket Validation | Staff scanning, showtime checks, group check-in requests, and validation audit records |

## Dependency and data rules

1. A module may call another module only through a public application interface.
2. A module must not directly access another module's repositories or tables.
3. The `shared/` area is limited to cross-cutting concerns such as security, errors, time, and identifiers. It must not contain business rules.
4. The system uses one PostgreSQL database, with logical table ownership assigned to modules.
5. Database changes are versioned through Flyway migrations.
   The initial Supabase/PostgreSQL schema is [V1](../../backend/src/main/resources/db/migration/V1__movie_ticket_schema.sql), with application tables in `movie_app`; see [migration instructions](../../backend/src/main/resources/db/migration/README.md). It is written for review and has not been applied. Supabase hosts PostgreSQL while Spring Boot continues to own authentication and authorization.
6. REST endpoints are versioned under `/api/v1/`.
7. Spring Boot owns the OpenAPI contract consumed by the React frontend and test clients.

Tickets owns the cumulative admitted count and enforces atomic, idempotent consumption through its public application interface. Ticket Validation confirms the actual group count and records each accepted check-in consistently with that update. The QR is locked only after all purchased admissions are consumed; see [ADR 0003](../adr/0003-booking-qr-group-check-in.md).

Check-in opening and closing offsets belong to each Cinema and are entered by Admin; both are relative to Showtime start. Ticket Validation obtains those settings through the Venue application contract and enforces them using server time. The SQL check-in function also enforces the same time window at the persistence boundary.

Browser authentication continues to use HTTP-only secure session cookies as approved in ADR 0002. The current database design excludes PostgreSQL session tables; the current backend stores sessions in its application instance. Login session lifetime and Booking seat-hold expiration are separate concerns.

Identity currently persists accounts, provider links, verification challenges and reset tokens through JDBC inside its own module. Application services own transaction boundaries; all other modules obtain identity through public application contracts. Security configuration and Google adapters live in Identity infrastructure. Sessions are held in the backend instance; restart/redeploy requires sign-in again. Vercel and local Vite proxy REST and OAuth routes through the frontend origin. See [Identity setup](identity.md) and [ADR 0006](../adr/0006-google-verified-customer-identity.md).

Identity owns an `IdentityMail` application contract with a default Resend HTTPS
adapter and an explicitly configured SMTP alternative. Credentials and sender
configuration stay in the backend. The frontend defaults to the same-origin
Identity API, restores account display from the server session and signs out
through the CSRF-protected backend endpoint.

## Runtime environments

Development, testing, and production use separate configuration profiles. Secrets and provider credentials are supplied through environment variables and are never committed.

For local development, the Spring Boot dotenv integration may read the ignored repository-root `.env` file. Deployed environments supply real environment variables, which take precedence over `.env` values.

Automated tests that change data use an isolated test database. During initial setup, the context-load smoke test may use the project database already configured in the local `.env`, as approved for the current empty database. `TEST_DB_*` values take precedence when a separate test database is configured. The fake payment provider is used for development and automated tests; a real provider is enabled only in a controlled environment.

## Testing strategy

TestCafe is the primary acceptance-testing tool.

| Test level | Tool | Purpose |
|---|---|---|
| Browser acceptance/E2E | TestCafe | Verify complete customer, admin, and staff workflows |
| Backend unit | JUnit 5 + Mockito | Verify individual domain rules and use cases |
| Backend integration | Spring Boot Test | Verify REST, application, persistence, and test-database behavior |
| Frontend focused tests | Vitest + React Testing Library | Verify complex reusable components and frontend behavior |

TestCafe setup data is created through deterministic seed/setup helpers rather than manual UI actions. High-value flows include registration, role authorization, schedule conflicts, seat holds, concurrent reservations, payment outcomes, ticket history, and QR validation.

## Parallel development

Team members may work on modules simultaneously after agreeing on API contracts, application interfaces, error formats, authentication behavior, and test data conventions. Incomplete dependencies are replaced by mocks or fakes during development.

Integration follows the business dependency path:

```text
Identity + Catalog + Venue
          ↓
      Scheduling
          ↓
       Booking
          ↓
       Payment
          ↓
       Tickets
          ↓
 Ticket Validation
```

This is a development and integration order, not a requirement that the team finish one module before starting another.
