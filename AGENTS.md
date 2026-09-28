# AGENTS.md
# Project: Online Movie Ticket Booking Web Application

## 1. Purpose

This file is the authoritative project context for coding agents working on this repository.

Agents MUST preserve the business rules in this document when designing, implementing, refactoring, testing, or reviewing the system. Do not silently invent behavior that conflicts with these rules.

When a requested implementation conflicts with a rule below, stop and identify the conflict before changing the business rule.

The project is a WEB APPLICATION. It is NOT an Android application.

TestCafe is used for browser-based end-to-end (E2E) testing. Do not treat TestCafe itself as a product feature; TestCafe tests the product behavior described here.

## 1.1 Documentation-first workflow for every session

Agents MUST read the project documentation before planning, implementing, refactoring, testing, or reviewing work. This rule exists so that decisions and business context remain consistent across sessions.

### Required reading order

1. Read this `AGENTS.md` completely. It is the authoritative source for business rules and project constraints.
2. Read [`CONTEXT.md`](CONTEXT.md) for the canonical domain vocabulary.
3. Read [`docs/design/software-structure.md`](docs/design/software-structure.md) for the approved architecture, module boundaries, dependency rules, runtime environments, and testing strategy.
4. Read the relevant files under `docs/requirements/` and `docs/planning/` for the feature or change being considered.
5. Read relevant records under `docs/adr/` before changing an architectural or data decision.
6. Read relevant test specifications under `tests/test-cases/`, `tests/traceability/`, and `tests/e2e/testcafe/` before changing behavior or tests.

### Documentation rules

- Do not rely on conversation history alone; reload the files above when starting a new session.
- Before changing a feature, identify its business module, relevant requirement, acceptance criteria, state transitions, and existing tests.
- If two documents appear to conflict, stop and report the conflict. Do not silently choose a behavior.
- Use this precedence when resolving project documentation: explicit project-owner decision, this `AGENTS.md`, approved ADRs and the approved software-structure plan, `CONTEXT.md`, then requirements/planning material.
- When an approved architectural or business decision changes, update the relevant documentation in the same change. Do not leave the code and project documents describing different systems.
- When a new domain term is agreed, add it to `CONTEXT.md`. When a hard-to-reverse architectural decision is agreed, add an ADR under `docs/adr/`.
- Before implementation, state which project documents were consulted and which module boundaries are affected.

---

## 2. Actors and Responsibilities

### Customer

Customers:
- Must have a registered account.
- Must verify the registration email before the account becomes active for normal use.
- Must authenticate before purchasing tickets.
- Can browse active movies.
- Can search/filter movies.
- Can view movie details.
- Can choose a Location, Cinema, and Showtime.
- Can view the Hall's seat layout.
- Can select available seats.
- Can confirm selected seats and receive a temporary 10-minute seat hold.
- Can pay through the configured external Payment Provider.
- Can retry payment after a failed attempt while the seat hold is still active.
- Can update permitted profile information.
- Can change their email address only after the new email has been verified.
- Can view confirmed upcoming tickets.
- Can view past booking history for the previous 30 days.
- CANNOT cancel a successfully purchased/confirmed ticket.

## Email Verification Rules

Email verification is required both during initial customer registration and when changing an existing customer's email address.

### Registration
- A customer must provide a valid email address.
- The email must be unique among customer accounts.
- The system must start an email-verification process.
- The account must not be treated as fully active until the registration email is successfully verified.
- An invalid or expired verification token must not activate the account.

### Email Change
- An authenticated customer may request a change to their email address.
- The new email must be unique among customer accounts.
- The new email must be verified before it replaces the current active/verified email.
- Until verification succeeds, the existing verified email remains the active email.
- After successful verification, the new email becomes the active email while preserving the same Customer identity, Bookings, and Tickets.
- Password-reset operations must use the current verified email.

### Admin

Admins:
- Use seeded/provisioned Admin accounts; public registration does not create Admin accounts.
- Can create and edit movie information.
- Can configure the available Locations, Cinemas, and Halls used by the project.
- Can assign a predefined Seat Layout to a Hall.
- Can create and manage showtimes.
- Can remove a showtime only when it has no confirmed bookings.
- CANNOT remove a showtime that already has confirmed bookings.
- Can archive a movie only when it has no future showtimes.
- Cannot create new showtimes for an archived movie.

### Cinema Staff

Cinema Staff:
- Use seeded/provisioned staff accounts.
- Authenticate using the normal application login mechanism.
- Can validate customer tickets at the cinema entrance using QR codes.
- Can see whether a scanned ticket is valid, invalid, already used, or for the wrong showtime.
- Must not gain unrelated Admin permissions.

### External Payment Provider

The Payment Provider is an external system responsible for processing the actual payment.

The application:
- Creates and manages payment attempts.
- Sends payment requests to the provider.
- Receives payment status/results.
- Verifies provider results.
- Confirms the booking after valid successful payment.
- Requests provider-side cancellation/refund when required.

The application is NOT a bank, card network, or direct money-processing institution.

---

## 3. Domain Glossary

- **Location**: A geographical area in Vietnam used for browsing cinemas, such as a district or ward.
- **Cinema**: A specific movie theater belonging to a Location.
- **Hall**: A screening room belonging to a Cinema.
- **Seat Layout**: A predefined template describing the seats in a Hall.
- **Seat**: A physical seat in a Hall, such as E5.
- **Movie**: A film with details such as title, description, duration, poster, genre, age rating, and release information.
- **Showtime**: A scheduled screening of a Movie in a specific Cinema/Hall at a specific date and time.
- **Booking**: A customer's booking transaction for selected seats.
- **Seat Hold**: A temporary reservation of seats for up to 10 minutes while payment is being completed.
- **Payment Attempt**: One payment attempt associated with a Booking.
- **Ticket**: A confirmed proof of purchase containing booking information and a QR code.
- **Active Movie**: A movie available in the active catalog and eligible for future showtimes.
- **Archived Movie**: A movie with no future showtimes that is retained for historical ticket references.

Important distinction:
- A Booking may have MULTIPLE Payment Attempts over its lifetime.
- Only ONE Payment Attempt may be ACTIVE at a time.
- A Payment Attempt and a Booking are not the same concept.

---

## 4. Core Product Flow

### Customer booking flow

```text
Register/Login
    -> Browse active movies
    -> View movie details
    -> Choose Location
    -> Choose Cinema
    -> Choose Showtime
    -> View Seat Layout
    -> Select seats
    -> Confirm seat selection
    -> Seat Hold (10 minutes)
    -> Payment Attempt
    -> Payment Provider
    -> Verify payment result
    -> Booking CONFIRMED
    -> Seats BOOKED
    -> Ticket generated
    -> Ticket available in My Tickets
```

### Admin flow

```text
Login as Admin
    -> Create/Edit Movie
    -> Manage configured Venue data
    -> Assign Seat Layout to Hall
    -> Create Showtime
    -> Validate schedule
    -> Publish/manage Showtime
    -> Archive Movie only when no future Showtime exists
```

### Ticket validation flow

```text
Cinema Staff Login
    -> Scan QR code
    -> Verify Ticket
    -> Check showtime/current validity
    -> Accept or reject
    -> Mark ticket as used when successfully validated
```

---

## 5. Movie and Catalog Rules

1. Movie availability at a Location is DERIVED from its configured showtimes.
2. Do not create a separate independent "movie available in location" state unless explicitly requested later.
3. If a Movie has a Showtime in a Cinema belonging to a Location, that Movie is available for that Location.
4. Archived Movies must not appear in the normal active catalog.
5. Archived Movies remain available as references for historical tickets/bookings.
6. A Movie may only be archived when it has NO future Showtimes.
7. Once archived, no new Showtime may be created for that Movie.
8. Movie information can be edited by Admin.
9. Do not delete historical Movie records in a way that breaks old tickets/bookings.

---

## 6. Venue Rules

The hierarchy is:

```text
Location
  -> Cinema
      -> Hall
          -> Seat Layout
              -> Seat
```

Rules:
1. Locations are limited to the configured Vietnamese locations for this project.
2. A Location may contain multiple Cinemas.
3. A Cinema may contain multiple Halls.
4. A Hall has a predefined Seat Layout.
5. Seat Layouts are reused as predefined templates.
6. A Hall's Seat Layout MUST become immutable once that Hall has been used by a Showtime.
7. Never change a historical Hall layout in a way that changes the meaning of an existing Booking or Ticket.
8. The application may display the Hall/Seat Layout to the customer, but the cinema side is responsible for its physical hall arrangement.
9. Do not invent dynamic hall assignment if the current business rules do not require it. The Admin enters the complete Showtime information including the selected Cinema/Hall.

---

## 7. Showtime Rules

A Showtime contains at least:
- Movie
- Location
- Cinema
- Hall
- Date
- Start time

Rules:
1. A Hall MUST NOT have overlapping Showtimes.
2. Different Halls in the same Cinema MAY host different Movies at the same time.
3. Consecutive Showtimes in the same Hall require a 15-minute buffer in the current project rules.
4. Example:
   - Movie duration = 120 minutes
   - Showtime starts at 19:00
   - Earliest next Showtime in the same Hall = 21:15
5. The system must reject invalid Showtimes and explain the conflict.
6. A Showtime with NO confirmed bookings may be removed.
7. A Showtime with ONE OR MORE confirmed bookings may NOT be removed.
8. Archived Movies cannot receive new Showtimes.
9. Do not create a second standalone story/rule for schedule overlap or buffer validation; these are acceptance rules of Showtime management.

---

## 8. Seat State Model

Seat states:

```text
AVAILABLE
   |
   | customer successfully confirms selection
   v
HELD
   |
   +-- SUCCESSFUL PAYMENT --> BOOKED
   |
   +-- HOLD TIMEOUT --------> AVAILABLE
   |
   +-- BOOKING/SESSION END -> AVAILABLE
   |
   +-- CANCELLED PAYMENT --> AVAILABLE
```

### AVAILABLE

The customer can select the seat.

### HELD

- The seat is temporarily unavailable to other customers.
- The hold duration is 10 minutes.
- The timer starts when the system successfully creates the hold.
- Payment may still be in progress.
- A failed payment does NOT immediately release the seat; the seat remains HELD until the original hold expires.
- If the customer explicitly terminates the booking/session, the application may release the hold.
- The 10-minute timeout is the ultimate safety mechanism because browser-close detection is not perfectly reliable.

### BOOKED

- Payment has been validly confirmed.
- The seat is permanently associated with the confirmed Booking/Ticket.
- Another customer cannot select it.
- The customer cannot cancel the successful purchase under the current business rules.

### Browser close

Do not rely only on browser-close detection.

If a booking/session is explicitly detected as ended, release the hold. If not detected, the 10-minute timeout MUST still release the seat.

---

## 9. Concurrent Seat Reservation

This is a critical consistency requirement.

Scenario:

```text
Customer A selects E5
Customer B selects E5
Both confirm at approximately the same time
```

Rules:
1. The browser's displayed state is NOT authoritative.
2. The server/system MUST check current seat availability when the confirmation request is processed.
3. The first valid request received by the system obtains the seat.
4. The later conflicting request is rejected.
5. Exactly one customer can successfully acquire the seat.
6. Seat acquisition must be atomic.
7. The losing customer must be informed that the seat is no longer available and returned to seat selection.
8. Never implement concurrency by trusting only client-side disabled buttons.

This behavior is a HIGH-PRIORITY E2E testing scenario.

---

## 10. Sold Out vs Temporarily Held

These states must not be conflated.

### SOLD OUT

A Showtime is SOLD OUT only when:

```text
All seats = BOOKED
```

Behavior:
- Showtime remains visible.
- Showtime is visually disabled.
- Customer cannot select it.
- Display a clear Sold Out state.

### TEMPORARILY UNAVAILABLE

A Showtime may have seats temporarily unavailable because they are HELD.

That does NOT mean the Showtime is sold out.

Held seats may return to AVAILABLE when:
- the hold expires,
- payment is cancelled,
- the booking/session ends.

---

## 11. Payment Architecture

The application integrates with an external Payment Provider.

Do not design the application as if it directly moves money through banks/card networks.

```text
Customer
   -> Application
      -> Payment Attempt
         -> External Payment Provider
            -> Bank/Card/E-wallet infrastructure
         <- Payment Result
      <- Verified Result
```

The application owns:
- Booking state.
- Seat state.
- Payment Attempt state.
- Payment result handling.
- Ticket generation.

The Payment Provider owns:
- Actual payment processing.
- Provider-side payment status.
- Provider-side cancellation/refund operations.

---

## 12. Payment Attempt Rules

A Booking MAY have multiple Payment Attempts.

Rules:
1. Only one Payment Attempt can be ACTIVE at a time for a Booking.
2. Repeated clicks on Pay for the SAME active attempt must NOT create a second active attempt.
3. A failed Payment Attempt may be retried while the seat hold is still active.
4. When retrying:
   - Previous failed attempt becomes inactive/failed.
   - New attempt is associated with the same Booking.
   - New attempt becomes the single active attempt.
5. Payment idempotency applies PER PAYMENT ATTEMPT.
6. Never create duplicate charges or duplicate ticket confirmation from repeated requests for the same payment attempt.

---

## 13. Payment Result Rules

### SUCCESS

If:
- payment is valid,
- callback/status is authenticated,
- amount/reference/state checks pass,
- seats are still valid under the late-result rules,

then:
1. Confirm Booking.
2. Change required seats to BOOKED.
3. Generate Ticket.

### FAILED

If provider returns FAILED:
1. Mark Payment Attempt as failed.
2. Keep seats HELD until the original 10-minute hold expires.
3. Customer may retry payment while the hold remains active.
4. Do not immediately release seats merely because payment failed.

### CANCELLED

If provider returns CANCELLED:
1. Stop that Payment Attempt.
2. Release the seats immediately, unless a separate authoritative provider status proves otherwise.

### UNKNOWN

UNKNOWN must NOT automatically be treated as failure.

Rules:
1. Do not immediately release seats solely because the result is UNKNOWN.
2. Query the Payment Provider for authoritative transaction status.
3. Decide the final booking/payment state from the authoritative provider result.
4. Treat this as a high-risk integration case.

### PENDING

If payment is PENDING:
1. Keep seats HELD.
2. Continue monitoring/checking payment status while the hold is valid.
3. When the hold/payment timeout is reached:
   - perform an appropriate status check and/or provider-side cancellation according to provider capabilities,
   - release held seats if the payment is not successfully confirmed.
4. Do NOT issue a refund for a payment that never succeeded; first determine whether money was actually captured.
5. If money was captured and the transaction must be reversed, request the appropriate provider-side refund/cancellation.

### Late SUCCESS

A successful payment result can arrive AFTER the seat hold expired.

Rules:
1. Never assume the late SUCCESS can simply confirm the old Booking.
2. Check whether all requested seats are still AVAILABLE.
3. If ALL required seats are still AVAILABLE:
   - confirm the Booking,
   - change seats to BOOKED,
   - generate the Ticket.
4. If ANY required seat has already been BOOKED by another customer:
   - do NOT issue a Ticket for the original customer,
   - initiate the appropriate provider-side refund/cancellation,
   - preserve an auditable record of the payment and resolution.
5. Do not silently discard late payment results.

---

## 14. Payment Callback/Webhook Security

A payment callback/result must be treated as untrusted external input until verified.

The application MUST validate, as applicable:
- Provider signature/authentication.
- Payment transaction reference.
- Booking reference.
- Payment Attempt reference.
- Expected amount.
- Currency.
- Expected transaction state.
- Whether the callback/result is a duplicate or replay.

Never trust a client-provided "payment succeeded" flag.

Never confirm a Booking solely because the browser says payment succeeded.

---

## 15. Tickets

A Ticket is generated only after valid successful payment confirmation.

A Ticket MUST contain:
- Movie
- Cinema
- Showtime
- Seats
- Customer name
- Booking ID
- QR code
- Price

Rules:
1. Customer cannot cancel a successfully purchased Ticket.
2. Upcoming Tickets MUST remain visible even if they were purchased more than 30 days ago.
3. Past booking history is normally visible for the previous 30 days.
4. "30 days" is a DISPLAY/HISTORY rule, NOT a database deletion rule.
5. Historical records must remain internally consistent.
6. Archived Movies can still appear inside historical Tickets.

---

## 16. My Tickets / Booking History

The customer needs a way to recover a ticket after closing the browser.

MVP behavior:
- My Tickets includes ALL upcoming confirmed Tickets.
- Past confirmed Tickets are shown for the previous 30 days.
- Tickets older than 30 days are not shown in the normal recent-history view.
- Old records are NOT deleted merely because they are older than 30 days.
- Historical Tickets must still be able to refer to Archived Movies.

---

## 17. Ticket Validation

Cinema Staff validates Tickets using QR codes.

Rules:
1. A valid unused ticket for the current showtime is accepted.
2. Invalid/unknown QR codes are rejected.
3. A previously used Ticket is rejected as already used.
4. A Ticket for another showtime is rejected for the current showtime.
5. Successful validation should mark the Ticket as USED to prevent reuse.

---

## 18. Security and Authorization

Minimum role rules:
- Customer cannot call Admin functions.
- Customer cannot call Cinema Staff validation functions unless explicitly authorized.
- Cinema Staff cannot perform Admin management functions.
- Admin can manage Admin-authorized resources.
- All protected endpoints require authentication.
- Authorization must be enforced SERVER-SIDE, not only by hiding UI controls.

Password rules:
- Never store plaintext passwords.
- Use a secure password-hashing mechanism.

Payment rules:
- Do not store raw card/bank credentials unless there is an explicit, reviewed requirement and compliant architecture.
- Use secure transport for payment communication.
- Verify provider callbacks.

---

## 19. Non-Functional Requirements

Current project targets:

- Payment communication uses secure transport.
- Payment callbacks/results use provider authentication/signature verification.
- Payment data is validated against expected references, amount, currency, and state.
- Passwords use secure password hashing.
- Seat reservation is atomic.
- Target seat-availability response: <= 2 seconds at the 95th percentile under planned test load.
- MVP demonstration target: at least 50 concurrent customer booking sessions.
- Payment attempts are idempotent.
- Historical booking/ticket relationships remain valid after Movie archival.
- Hall Seat Layout is immutable after being used by a Showtime.

The numeric targets above are project test targets, not universal industry standards.

---

## 20. Testing Rules

Testing is a first-class project concern.

For every important business rule, think in:

```text
Requirement
   -> Acceptance Criteria
      -> Test Scenario
         -> Automated E2E Test (where appropriate)
```

High-value E2E scenarios include:

1. Successful registration.
2. Duplicate registration.
3. Invalid login.
4. Unauthorized Customer access to Admin functionality.
5. Valid movie creation.
6. Invalid movie input.
7. Movie search/filter.
8. Valid showtime creation.
9. Overlapping showtime rejection.
10. Buffer violation rejection.
11. Seat layout display.
12. Successful 10-minute seat hold.
13. Seat-hold expiration.
14. Payment failure while hold remains active.
15. Successful payment and ticket generation.
16. Duplicate Pay action.
17. Multiple payment attempts with only one active attempt.
18. UNKNOWN payment followed by provider status query.
19. PENDING payment reaching timeout.
20. Late SUCCESS after seat expiration.
21. Two customers competing for the same seat.
22. Sold Out showtime display.
23. Upcoming ticket retrieval after browser/session closure.
24. QR validation.
25. Already-used ticket rejection.
26. Wrong-showtime ticket rejection.

Use TestCafe for browser-level workflows. Do not limit testing to happy paths.

---

## 21. Project Backlog Structure

Use these epics:

1. Identity
2. Catalog
3. Venue
4. Scheduling
5. Booking
6. Payment
7. Tickets
8. Ticket Validation

Current backlog:

| ID | Epic | Story | Release | Dependencies | Estimate |
|---|---|---|---|---|---:|
| ID-01 | Identity | Customer registration | MVP | None | 3 |
| ID-02 | Identity | User login/logout | MVP | ID-01 | 3 |
| ID-03 | Identity | Password reset | R2 | ID-01 | 3 |
| ID-04 | Identity | Role-based access | MVP | ID-02 | 5 |
| ID-05 | Identity | Customer updates personal profile information, including email change with verification | MVP | ID-02 | 3 |
| CAT-01 | Catalog | Admin creates/edits movie information | MVP | ID-04 | 5 |
| CAT-02 | Catalog | Customer browses/searches/filters/views movie details | MVP | CAT-01 | 5 |
| CAT-03 | Catalog | Admin archives movie with no future showtimes | R2 | CAT-01, SCH-01 | 3 |
| VEN-01 | Venue | Admin manages configured Locations/Cinemas/Halls | MVP | ID-04 | 5 |
| VEN-02 | Venue | Admin assigns predefined Seat Layout to Hall | MVP | VEN-01 | 3 |
| SCH-01 | Scheduling | Admin creates/manages showtimes | MVP | CAT-01, VEN-01, VEN-02 | 5 |
| BKG-01 | Booking | Customer views showtimes by Location/Cinema | MVP | SCH-01 | 3 |
| BKG-02 | Booking | Customer views seat layout/current seat status | MVP | SCH-01, VEN-02 | 3 |
| BKG-03 | Booking | Customer holds selected seats for 10 minutes | MVP | BKG-02, ID-02 | 5 |
| BKG-04 | Booking | System resolves concurrent seat reservations | MVP | BKG-03 | 5 |
| PAY-01 | Payment | Customer creates/retries Payment Attempts | MVP | BKG-03 | 5 |
| PAY-02 | Payment | System processes/reconciles payment outcomes | MVP | PAY-01 | 8 |
| TCK-01 | Tickets | Generate/display confirmed Ticket with QR | MVP | PAY-02 | 5 |
| TCK-02 | Tickets | Customer views upcoming Tickets and recent history | MVP | TCK-01 | 3 |
| TCK-03 | Ticket Validation | Cinema Staff validates Tickets using QR | MVP | TCK-01, ID-04 | 5 |

---

## 22. Implementation Guidance for Agents

Before implementing a feature:
1. Identify the relevant business rule(s) in this file.
2. Identify the affected domain entities and state transitions.
3. Identify edge cases and acceptance criteria.
4. Check whether the change affects Booking, Seat, Payment Attempt, or Ticket consistency.
5. Do not change business semantics simply to make implementation easier.

When changing data models:
- Preserve historical Ticket/Booking meaning.
- Preserve the original Hall/Seat Layout relationship for existing Showtimes.
- Do not introduce nullable/optional states that contradict required workflow rules without discussion.
- Avoid duplicate sources of truth for Movie availability, seat state, or payment state.

When implementing seat booking:
- Treat server-side state as authoritative.
- Make seat acquisition atomic.
- Do not rely on browser UI state for concurrency correctness.

When implementing payment:
- Model Booking and Payment Attempt separately.
- Allow multiple attempts per Booking.
- Allow only one active attempt at a time.
- Make each Payment Attempt idempotent.
- Never trust client-side payment success.
- Verify provider callbacks.
- Handle UNKNOWN, PENDING, FAILED, CANCELLED, SUCCESS, and late SUCCESS explicitly.

When implementing Ticket history:
- Do not delete Movies merely because they are archived.
- Do not delete old booking data merely because the 30-day history window has passed.
- Keep upcoming Tickets visible.

When implementing Identity/Profile features:
- Treat email as a unique customer login identifier.
- Do not activate a newly registered email until it has been verified.
- Do not replace an existing verified email until the new email has been verified.
- Email changes must preserve the same Customer identity and must not break existing Bookings/Tickets.
- Password reset must target the current verified email.

When implementing Admin features:
- Enforce Admin authorization server-side.
- Do not allow deleting showtimes with confirmed bookings.
- Do not allow archiving Movies with future showtimes.
- Do not allow changing a Hall's Seat Layout after it has been used by a Showtime.

When writing tests:
- Prefer tests derived from acceptance criteria.
- Include both happy paths and failure/edge/concurrency scenarios.
- Add TestCafe E2E tests for browser-visible workflows.
- Do not weaken requirements merely to make a test pass.

---

## 23. Conflict Resolution Rule

When a new request appears to conflict with this file:

1. Identify the exact existing rule.
2. Explain the conflict.
3. Do not silently overwrite the old rule.
4. Treat explicit future decisions from the project owner/team as an intentional business-rule change.
5. After a business-rule change is confirmed, update this AGENTS.md so future agents use the new rule.

This file should remain the single, maintained source of business context for the project.
