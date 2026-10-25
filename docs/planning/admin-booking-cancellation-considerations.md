# Admin Booking cancellation — deferred

Owner decision, 2026-10-24: display all Bookings in Admin now; defer cancellation
and cancellation email notifications for consideration. No Booking update action
is authorized in this change.

Before implementation, agree on:

- Eligible Booking states and whether a confirmed or partially checked-in Ticket
  can be cancelled, with a required Admin reason and audit record.
- External provider status checks and refund/cancellation responsibilities,
  including UNKNOWN/PENDING results, captured money and late SUCCESS.
- Atomic seat release and Ticket/QR invalidation, while preserving historical
  Booking, Ticket and Payment Attempt records and preventing duplicate actions.
- Customer email content, current verified recipient, delivery failures/retries
  and the point at which a cancellation may be reported as completed.

The existing prohibition on Customer cancellation of confirmed purchases remains.
An implementation that changes confirmed Booking/Seat behavior requires updating
the corresponding business rules and acceptance criteria first.
