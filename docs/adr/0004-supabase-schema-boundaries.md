# Keep Supabase data behind the Spring Boot application

Status: proposed for schema review; the project owner requested a Supabase schema and confirmed that supplementary tables should become regular tables.

The initial migration puts the application's data in the private `movie_app` PostgreSQL schema while Spring Boot retains Identity, authorization and module application contracts. This preserves ADR 0002 and avoids introducing a second account system through Supabase Auth. The schema includes payment reversals, password reset tokens and provider identity links; it has no session table.

Ticket QR tokens are proposed as random backend-generated values with a lookup hash and encrypted recoverable ciphertext. Encryption keys remain outside the database, so My Tickets can display the same QR without storing a plaintext credential. Other V1 choices are a fixed Showtime seat price, immutable purchase snapshots, explicit state CHECK constraints and composite keys that enforce the Hall/Seat/Showtime relationship. These choices are documented for review in DB.md and the migration README; no hosted database has been migrated.
