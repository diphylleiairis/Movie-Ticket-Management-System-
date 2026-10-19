# Use one Booking QR with cumulative group check-in

Status: accepted by the project owner on 2026-10-08.

Each confirmed Booking has one Ticket and one QR covering all purchased seats, so groups arriving together or separately can use the same code. Each staff-confirmed check-in consumes only the actual admitted count; the QR becomes fully used and locked when the cumulative count equals the purchased-seat count. This replaces the previous first-successful-scan rule and avoids requiring separate QR codes for each seat.

Tickets enforces the remaining allowance atomically through its application contract. Check-in requests are idempotent, accepted admissions are auditable, and excess counts are rejected without consuming admissions; staff can confirm a smaller group within the remaining allowance. QR regeneration remains a separate open decision in DB.md.
