# Ticket Validation test cases

These specifications cover TCK-01/TCK-03 and the group check-in rules in AGENTS.md section 17 and ADR 0003. Browser automation remains pending implementation of the Ticket Validation workflow.

Common preconditions: a confirmed Booking has five purchased seats, exactly one Ticket/QR, and an initial admitted count of zero. Cinema Staff is authenticated and validating the Ticket's current Showtime within its Cinema's Admin-configured check-in window unless stated otherwise. Each new check-in action has a new request ID.

| ID | Scenario and steps | Expected result |
|---|---|---|
| VAL-01 | Scan the QR without confirming admission. | Display five purchased seats, zero admitted, five remaining; the scan alone consumes nothing. |
| VAL-02 | Confirm three people; later confirm two people with the same QR. | First result: three admitted, two remaining, QR usable. Second result: five admitted, zero remaining, Ticket USED and QR locked. |
| VAL-03 | Confirm all five people in one action. | Five admitted, zero remaining; Ticket USED and QR locked. |
| VAL-04 | After three people enter, request three more admissions. Then staff confirms only two. | Count three is rejected with no change. Count two succeeds; the extra person is refused entry. |
| VAL-05 | Scan a fully used QR and attempt to confirm one more person. | Report fully used; reject entry without changing the count. |
| VAL-06 | Scan an invalid or unknown QR. | Reject; no Ticket count changes. |
| VAL-07 | Scan a valid QR while validating another Showtime. | Reject wrong Showtime; no admissions consumed. |
| VAL-08 | Request zero, negative, fractional, missing, or nonnumeric admission counts. | Reject each request without consuming admissions. |
| VAL-09 | With two admissions remaining, two staff concurrently confirm two people each. | Exactly one succeeds, the other is rejected; final admitted count is five, with one accepted check-in record. |
| VAL-10 | Retry an accepted three-person check-in using the same request ID and payload, including after a lost response. | Return the original result; count remains three and only one accepted check-in is recorded. |
| VAL-11 | Reuse an accepted request ID with a different count, Ticket, or Showtime. | Reject without changing admissions or the original record. |
| VAL-12 | Customer or unauthenticated caller attempts check-in. | Server denies access without consuming admissions. |
| VAL-13 | Inspect records after three-person and two-person check-ins by different staff. | Each accepted check-in records its own staff, count, time, and request ID. `used_at`/`used_by` identify the final check-in; they are empty after the first partial check-in. |
| VAL-14 | Configure opening 30 minutes before start and closing 15 minutes after start. Use a 19:00 Showtime and attempt check-in just before 18:30, exactly 18:30, exactly 19:15, and just after 19:15 with isolated Tickets. | Before opening/after closing are rejected without consuming admissions; both boundaries are accepted. Values are test data, not application defaults. |
| VAL-15 | Two Cinemas use different opening/closing offsets for Showtimes with the same start time; attempt check-in at a time valid for only one Cinema. | Only that Cinema's Ticket is accepted. |
| VAL-16 | A group partially checks in before closing; a second group arrives after closing with the same QR and a new request ID. | Reject late arrival; preserve the previously admitted count and unused allowance. |
| VAL-17 | Retry a previously accepted request after the window closes using the same ID and payload. | Return the original accepted result without admitting additional people or adding a log. |
| VAL-18 | Admin submits missing or negative opening/closing offsets for a Cinema. | Reject configuration; no implicit global values are supplied. |

Seat state remains BOOKED throughout check-in; consuming an admission does not release the purchased seat.
