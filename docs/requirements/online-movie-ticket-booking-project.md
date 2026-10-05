# Online Movie Ticket Booking Web Application
## Agent-Readable Project Requirements & Product Backlog

## 1. Project Overview

**Project name:** Online Movie Ticket Booking Web Application  
**Project type:** Web application  
**Testing focus:** End-to-end (E2E) and functional testing using TestCafe.

**Actors:** Customer, Admin, Cinema Staff, External Payment Provider.

**Customer flow:** Register/Login -> Browse Movies -> Movie Details -> Location -> Cinema -> Showtime -> Seat Layout -> Select Seats -> 10-minute Hold -> Payment -> Confirmed Booking -> Ticket with QR Code -> Ticket Validation.

## 2. Domain Glossary

| Term | Definition |
|---|---|
| Location | A geographical area in Vietnam used for browsing cinemas, such as a district or ward. |
| Cinema | A specific movie theater belonging to a Location. |
| Hall | A screening room belonging to a Cinema. |
| Seat Layout | A predefined template describing the physical seats in a Hall. |
| Seat | A physical seat in a Hall, e.g. E5. |
| Movie | A film shown in the system, with title, description, duration, poster, genre, age rating, etc. |
| Showtime | A scheduled screening of a Movie in a specific Cinema and Hall at a specific date/time. |
| Seat Hold | Temporary reservation of selected seats for up to 10 minutes while payment is completed. |
| Booking | A customer's purchase process for selected seats. |
| Payment Attempt | One attempt to pay for a Booking. A Booking may have multiple attempts, but only one active attempt at a time. |
| Ticket | Confirmed proof of purchase containing booking details and a QR code. |
| Customer | Registered user who browses movies and purchases tickets. |
| Admin | User who manages movies, venues, halls, and showtimes. |
| Cinema Staff | Authorized staff member who validates tickets at the cinema entrance. |
| Active Movie | Movie currently available for normal catalog/showtime management. |
| Archived Movie | Movie with no future showtimes; retained for historical ticket references. |

## 3. Core Business Rules

### Authentication and roles
- Only registered users can purchase tickets.
- Customer, Admin, and Cinema Staff are separate roles.
- Admin and Cinema Staff accounts are provisioned/seeded rather than publicly registered.
- Protected operations require authentication and role authorization.

### Movie and venue
- The project uses a fixed set of locations in Vietnam.
- A Location can contain multiple Cinemas.
- A Cinema can contain multiple Halls.
- Each Hall has a predefined Seat Layout.
- A Hall's Seat Layout is immutable once the Hall has been used by a Showtime.
- Admin enters complete movie and showtime information.
- Cinema does not need its own management account in the MVP.
- A movie's availability at a Location is derived from its showtimes.

### Showtimes
- A Hall cannot have overlapping showtimes.
- Different Halls in the same Cinema may host different movies at the same time.
- Consecutive showtimes in the same Hall require a 15-minute buffer.
- Example: movie duration 120 minutes, previous start 19:00 => next start >= 21:15.
- A showtime with no confirmed bookings can be removed.
- A showtime with confirmed bookings cannot be removed.
- A movie can only be archived when it has no future showtimes.
- Archived movies cannot receive new showtimes.

### Seat states
```text
AVAILABLE
    |
    | customer confirms seat selection
    v
HELD (10 minutes)
    |
    +-- payment SUCCESS --> BOOKED
    +-- payment FAILED --> remain HELD until timeout
    +-- payment CANCELLED --> AVAILABLE
    +-- hold timeout --> AVAILABLE
    +-- explicit booking/session termination --> AVAILABLE
```

### Concurrent seat booking
- UI seat availability is not authoritative.
- System re-checks seat state when customer confirms.
- First valid request received by the booking system obtains the seat.
- Later requests for the same seat are rejected.
- Seat acquisition must be atomic.

### Payment
- Actual payment is processed through an external Payment Provider.
- The application manages booking/payment workflow and does not act as the bank/card network.
- A Booking may have multiple Payment Attempts, but only one active attempt at a time.
- Retry is allowed after FAILED while the seat hold remains active.
- Duplicate Pay actions must not create duplicate active attempts, charges, or tickets.
- Provider results/callbacks must be authenticated and validated.
- Verify payment reference, booking reference, amount, currency, and expected state.

### Payment states
- **SUCCESS:** If seats are still held, confirm Booking, mark seats BOOKED, generate Ticket.
- **FAILED:** Keep seats HELD until original hold timeout; customer may retry while hold remains active.
- **CANCELLED:** Stop attempt and release seats.
- **UNKNOWN:** Query provider for authoritative status before releasing seats.
- **PENDING:** Keep seats HELD until timeout; then check/cancel provider transaction as appropriate and release seats.
- **Late SUCCESS after hold expiry:** Check whether all required seats are still AVAILABLE. If yes, booking may be confirmed; otherwise do not issue ticket and request appropriate refund/cancellation.

### Tickets
- Successful payment generates a Ticket.
- Ticket contains Movie, Cinema, Showtime, Seats, Customer Name, Booking ID, QR Code, Price.
- Customers cannot cancel successfully purchased tickets.
- Upcoming tickets remain visible regardless of purchase age.
- Past booking history is visible for the previous 30 days.
- 30 days is a visibility rule, not a deletion rule.
- Historical tickets remain valid references when a movie is archived.

## 4. Epics

1. Identity
2. Catalog
3. Venue
4. Scheduling
5. Booking
6. Payment
7. Tickets
8. Ticket Validation

## 5. Product Backlog

Priority: **M = Must have / MVP**, **S = Should have / Release 2**, **C = Could have**, **W = Won't have in current scope**.  
Story-point estimates are relative: 1, 2, 3, 5, 8.

| ID | Epic | Backlog Item | Priority | Release | Dependencies | Estimate |
|---|---|---|---|---|---|---:|
| ID-01 | Identity | Customer registration | M | MVP | None | 3 |
| ID-02 | Identity | User login and logout | M | MVP | ID-01 | 3 |
| ID-03 | Identity | Password reset | S | R2 | ID-01 | 3 |
| ID-04 | Identity | Role-based access for Customer/Admin/Cinema Staff | M | MVP | ID-02 | 5 |
| CAT-01 | Catalog | Admin creates and edits movie information | M | MVP | ID-04 | 5 |
| CAT-02 | Catalog | Customer browses, searches, filters, and views movie details | M | MVP | CAT-01 | 5 |
| CAT-03 | Catalog | Admin archives a movie with no future showtimes | S | R2 | CAT-01, SCH-01 | 3 |
| VEN-01 | Venue | Admin manages configured Locations, Cinemas, and Halls | M | MVP | ID-04 | 5 |
| VEN-02 | Venue | Admin assigns a predefined Seat Layout to a Hall | M | MVP | VEN-01 | 3 |
| SCH-01 | Scheduling | Admin creates and manages showtimes | M | MVP | CAT-01, VEN-01, VEN-02 | 5 |
| BKG-01 | Booking | Customer views showtimes by Location and Cinema | M | MVP | SCH-01 | 3 |
| BKG-02 | Booking | Customer views seat layout and current seat status | M | MVP | SCH-01, VEN-02 | 3 |
| BKG-03 | Booking | Customer holds selected seats for 10 minutes | M | MVP | BKG-02, ID-02 | 5 |
| BKG-04 | Booking | System resolves concurrent seat reservations | M | MVP | BKG-03 | 5 |
| PAY-01 | Payment | Customer creates and retries Payment Attempts for a Booking | M | MVP | BKG-03 | 5 |
| PAY-02 | Payment | System processes payment outcomes and reconciles uncertain/late results | M | MVP | PAY-01 | 8 |
| TCK-01 | Tickets | System generates and displays a confirmed Ticket with QR code | M | MVP | PAY-02 | 5 |
| TCK-02 | Tickets | Customer views upcoming Tickets and recent booking history | M | MVP | TCK-01 | 3 |
| TCK-03 | Ticket Validation | Cinema Staff validates customer Tickets using QR codes | M | MVP | TCK-01, ID-04 | 5 |

## 6. Acceptance Criteria

### ID-01 — Customer registration
- Given the customer is not registered, when valid required registration data is submitted, then the system creates an account.
- Given the submitted email already exists, when registration is submitted, then registration is rejected.
- Given required information is missing or invalid, when the form is submitted, then validation errors are shown and no account is created.
- Given email registration succeeds, the system sends a six-digit numeric code and displays six input boxes; the account becomes active only after successful server verification.
- Given a code is invalid or expired, verification is rejected; the customer can request a new code and try again.
- Given Google or Apple ID registration is configured, the customer may use that provider; account activation and role provisioning follow the Identity rules in `AGENTS.md`.

### ID-02 — Login and logout
- Given a registered user enters valid credentials, when login is submitted, then an authenticated session is created.
- Given invalid credentials are submitted, when login is attempted, then authentication is rejected.
- Given an authenticated user selects Logout, when logout succeeds, then the session is terminated.
- Given a seeded Admin or Cinema Staff account enters valid credentials, when login succeeds, then the user receives the correct role.
- Given Google or Apple ID sign-in is configured, provider authentication is validated by the backend before an application session is created.

### ID-03 — Password reset
- Given a registered customer requests password reset, when the request is accepted, then the reset process starts.
- Given a valid reset token and new password are supplied, when reset is submitted, then the password is updated.
- Given an invalid or expired reset token is supplied, when reset is attempted, then the system rejects the request.

### ID-04 — Role-based access
- Given a Customer is authenticated, when an Admin function is requested, then access is denied.
- Given an Admin is authenticated, when movie/venue/showtime management is requested, then access is permitted.
- Given Cinema Staff is authenticated, when ticket validation is requested, then access is permitted.
- Given an unauthenticated user requests a protected function, then access is denied.

### CAT-01 — Manage movie information
- Given an Admin submits valid movie data, then the movie is created.
- Given an active movie exists, when valid edits are submitted, then the movie is updated.
- Given movie data is invalid or incomplete, when submitted, then the operation is rejected with validation errors.
- Given an edit conflicts with scheduling constraints, when submitted, then the conflicting change is rejected.

### CAT-02 — Browse/search/filter/view movies
- Given active movies exist, when the catalog is opened, then active movies are displayed.
- Given a customer selects a movie, when the detail page opens, then stored movie details are displayed.
- Given multiple active movies exist, when a search/filter is used, then matching movies are displayed.
- Given a movie is archived, when the active catalog is opened, then the archived movie is not shown as active.

### CAT-03 — Archive movie
- Given a movie has no future showtimes, when Admin archives it, then its status becomes Archived.
- Given a movie has a future showtime, when Admin attempts to archive it, then the operation is rejected.
- Given a movie is Archived, when Admin attempts to create a new showtime for it, then the operation is rejected.
- Given historical tickets reference an archived movie, when viewed, then its historical movie information remains accessible.

### VEN-01 — Manage Locations/Cinemas/Halls
- Given configured Vietnam Locations/Cinemas/Halls exist, when Admin opens venue management, then those entities are available.
- Given a Cinema belongs to a Location, when that Location is selected, then only its Cinemas are available.
- Given a Hall belongs to a Cinema, when that Cinema is selected, then only its Halls are available.

### VEN-02 — Assign Seat Layout
- Given predefined layouts exist, when Admin configures a Hall, then a layout can be assigned.
- Given a Hall has no showtimes yet, when Admin changes its layout, then the new layout becomes active.
- Given a Hall has already been used by a Showtime, when Admin attempts to change its layout, then the change is rejected.

### SCH-01 — Create/manage showtimes
- Given an active Movie, valid Location, Cinema, and Hall exist, when a valid showtime is submitted, then the system creates it.
- Given a Hall already has a conflicting showtime, when an overlapping showtime is submitted, then it is rejected.
- Given the previous show starts at 19:00, duration is 120 minutes, and buffer is 15 minutes, when a new show starts before 21:15, then it is rejected with the scheduling reason.
- Given two different Halls in the same Cinema are available, when simultaneous showtimes are created in different Halls, then the system permits them.
- Given a showtime has no confirmed bookings, when Admin removes it, then it is removed.
- Given a showtime has confirmed bookings, when removal is attempted, then the operation is rejected.

### BKG-01 — View showtimes
- Given a Movie has showtimes, when a Customer selects a Location, then available Cinemas and showtimes are shown.
- Given all seats in a showtime are BOOKED, when viewed, then the showtime remains visible, is disabled, and is labeled Sold Out.
- Given all seats are HELD but none are BOOKED, when viewed, then the showtime is not labeled Sold Out and held seats are unavailable.
- Given a showtime has at least one AVAILABLE seat, when viewed, then it can be selected.

### BKG-02 — View seat layout/status
- Given a valid showtime exists, when seat selection opens, then the Hall's configured layout is shown.
- Given a seat is AVAILABLE, when displayed, then it is selectable.
- Given a seat is HELD or BOOKED by another customer, when displayed, then it is unavailable.
- Given the customer's booking has held seats, when they return to the seat page, then those seats remain associated with the active hold.
- Given 10 seats are selected, additional seats cannot be selected until a selected seat is removed; the selection count and limit are displayed.

### BKG-03 — Hold seats
- Given E5 is AVAILABLE, when the customer confirms E5, then E5 becomes HELD for 10 minutes.
- Given E5 is no longer AVAILABLE when confirmation is processed, then the request is rejected.
- Given a request contains more than 10 seats for one Booking, then the server rejects it without creating a hold.
- Given the 10-minute hold expires without successful confirmation, then seats return to AVAILABLE.
- Given payment FAILS while the hold is active, then seats remain HELD until the original timeout.
- Given the booking/session is explicitly terminated before payment succeeds, then held seats are released.

### BKG-04 — Concurrent seat reservation
- Given two customers request the same AVAILABLE seat at approximately the same time, when requests are processed, then exactly one obtains the hold.
- Given one request has acquired the seat, when the second request is processed, then the second is rejected.
- Given a request is rejected, then the customer is informed that the seat is unavailable and can return to seat selection.

### PAY-01 — Payment Attempts
- Given a Booking has active held seats and no active Payment Attempt, when Pay is selected, then one active Payment Attempt is created.
- Given a Booking already has an active Payment Attempt, when Pay is clicked again, then no second active attempt is created.
- Given an active attempt fails while the hold remains active, when the customer retries, then the failed attempt becomes inactive and a new active attempt is created.
- Given a new Payment Attempt is created, when it is sent to the provider, then it remains associated with the same Booking.

### PAY-02 — Payment outcomes/reconciliation
- Given payment returns SUCCESS before hold expiry, when the result is verified, then Booking becomes CONFIRMED, seats become BOOKED, and a Ticket is generated.
- Given payment returns FAILED, when verified, then seats remain HELD until the original hold timeout.
- Given payment returns CANCELLED, when verified, then the attempt stops and seats are released.
- Given payment status is UNKNOWN, when received, then the system queries the provider before releasing seats.
- Given payment remains PENDING until timeout, when timeout is reached, then the system checks or cancels the provider-side transaction as appropriate and releases seats.
- Given SUCCESS arrives after hold expiry, when seats are checked, then the booking is confirmed only if all requested seats are still AVAILABLE; otherwise no ticket is issued and the appropriate refund/cancellation is requested.

### TCK-01 — Generate/display Ticket
- Given payment is confirmed successful, when the Booking becomes CONFIRMED, then a Ticket is generated.
- Given a Ticket exists, when the customer opens it, then Movie, Cinema, Showtime, Seats, Customer Name, Booking ID, QR Code, and Price are shown.
- Given a confirmed Ticket exists, when the customer attempts cancellation, then cancellation is rejected.
- Given payment did not complete successfully, then no confirmed Ticket is issued.

### TCK-02 — My Tickets/history
- Given a customer has an upcoming confirmed Ticket, when My Tickets is opened, then it remains visible regardless of purchase age.
- Given a customer has a past Ticket purchased within the previous 30 days, when booking history is opened, then it is visible.
- Given a past Ticket is older than 30 days, when normal history is opened, then it is not shown in the 30-day history view.
- Given a Ticket references an archived Movie, when opened, then historical Movie information remains accessible.

### TCK-03 — Ticket validation
- Given Cinema Staff is authenticated and scans a valid unused QR code for the current showtime, when validation is performed, then the system reports the Ticket as valid.
- Given the QR code is invalid or unknown, when scanned, then the system rejects it.
- Given the Ticket has already been validated, when scanned again, then the system reports it as already used.
- Given the Ticket belongs to another showtime, when scanned for the current showtime, then the system rejects it.

## 7. Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-01 | Payment communication shall use secure transport. Provider callbacks shall use signature/authentication verification. The system shall validate payment reference, booking reference, amount, currency, and expected state before accepting a result. |
| NFR-02 | Passwords shall be stored using secure password hashing and never plaintext. |
| NFR-03 | Seat reservation must be atomic so a seat cannot be successfully HELD/BOOKED for two customers. |
| NFR-04 | Under planned test load, seat-availability requests should complete within 2 seconds at the 95th percentile. |
| NFR-05 | MVP should support at least 50 concurrent customer booking sessions during testing/demo. |
| NFR-06 | Each Payment Attempt must be idempotent: repeated requests for the same attempt must not cause duplicate charges or duplicate ticket confirmation. |
| NFR-07 | Historical Bookings/Tickets must preserve Movie, Showtime, Cinema, Hall, and Seat Layout relationships after Movie archival. |
| NFR-08 | A Hall's Seat Layout must remain immutable after it has been used by a Showtime. |

## 8. MVP Scope

MVP includes:
- Customer registration
- Login/logout
- Role-based authorization
- Admin movie management
- Movie browsing/details/search/filter
- Location/Cinema/Hall data
- Hall seat-layout configuration
- Showtime creation and validation
- Showtime browsing
- Seat availability and selection
- 10-minute seat holds
- Concurrent seat reservation handling
- Payment attempts/retries
- Payment failure/pending/unknown/late-result handling
- Ticket generation
- My Tickets
- Cinema Staff QR validation

Release 2:
- Password reset
- Movie archiving and related lifecycle management

## 9. Testing-Oriented Scenarios

These are candidate E2E/functional scenarios, not separate product stories:

1. Successful registration.
2. Duplicate-email registration.
3. Invalid login.
4. Customer attempts Admin function.
5. Admin creates valid movie.
6. Invalid movie data.
7. Customer searches/filters movies.
8. Customer views movie details.
9. Admin creates valid showtime.
10. Overlapping showtime.
11. Showtime violates duration + 15-minute buffer.
12. Simultaneous shows in different halls.
13. Customer views available showtime.
14. Customer views Sold Out showtime.
15. Customer holds seats for 10 minutes.
16. Seat hold expires.
17. Payment fails; seats remain HELD until timeout.
18. Payment succeeds; seats become BOOKED and Ticket is generated.
19. Two customers attempt the same seat concurrently.
20. Customer clicks Pay twice.
21. Payment returns CANCELLED.
22. Payment returns UNKNOWN and provider status is queried.
23. Payment remains PENDING until timeout.
24. Payment SUCCESS arrives after hold expiry.
25. Customer reopens upcoming Ticket.
26. Cinema Staff validates a valid QR code.
27. Cinema Staff scans an already-used QR code.
28. Cinema Staff scans a ticket for the wrong showtime.

## 10. Key Risks / Open Decisions

- Payment Provider behavior for UNKNOWN/PENDING/late SUCCESS must be verified against the actual API.
- Refund vs. cancellation semantics depend on provider capabilities.
- The 15-minute showtime buffer is a project rule.
- 50 concurrent sessions and 2-second p95 are project test targets, not universal requirements.
- Explicit browser-close detection can be unreliable; the 10-minute timeout is the ultimate safety mechanism.
- Real payment credentials/card data should not be stored by the application.

## 11. Project Boundary

The system is a **web application**, not an Android application.

TestCafe automates browser-based E2E tests. The product backlog describes movie-ticket system behavior. TestCafe work should be represented as testing/implementation tasks attached to backlog stories, not as product features.
