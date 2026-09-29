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
| Venue | Locations, cinemas, halls, layouts, and seats |
| Scheduling | Showtimes, overlap validation, buffer validation, and showtime removal rules |
| Booking | Seat selection, atomic seat holds, expiration, and booking state |
| Payment | Payment attempts, retries, provider adapters, idempotency, and reconciliation |
| Tickets | Confirmed tickets, QR codes, upcoming tickets, and recent history |
| Ticket Validation | Staff scanning, showtime checks, and used-ticket state |

## Dependency and data rules

1. A module may call another module only through a public application interface.
2. A module must not directly access another module's repositories or tables.
3. The `shared/` area is limited to cross-cutting concerns such as security, errors, time, and identifiers. It must not contain business rules.
4. The system uses one PostgreSQL database, with logical table ownership assigned to modules.
5. Database changes are versioned through Flyway migrations.
6. REST endpoints are versioned under `/api/v1/`.
7. Spring Boot owns the OpenAPI contract consumed by the React frontend and test clients.

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
