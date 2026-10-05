# Checkout frontend

Status: demo interface; Payment Provider integration is not implemented.

The Payment feature renders checkout for a valid demo screening and 1–10 selected seats. Concession selections update the booking summary and total. Checkout does not ask for Customer name; when integrated, ticket identity must come from the authenticated Customer rather than an editable checkout field.

Selecting Credit or debit card reveals Card Number, Expiration Date, and Security Code. Card number accepts 13–19 digits, expiration accepts a valid current/future month in `MM / YY` format, and security code accepts 3–4 digits. These are demo form checks, not provider authorization. Continue is enabled only after all card fields satisfy those checks. Inputs remain in the current DOM only; they are not copied into React state, URLs, browser storage, logs, or requests. Switching to E-wallet unmounts and clears the card inputs. Returning to Credit requires valid input again.

Selecting E-wallet does not display a QR. Continue to Payment first opens a confirmation dialog showing the Movie, Seats, Payment Method, and Total Bill. Cancel, Close, or Escape returns to checkout without showing a QR. Only Confirm & Continue reveals the QR banking panel in the dialog. Closing the QR dialog resets the confirmation step; continuing again requires confirmation of the current total. The same confirmation step precedes the card preview.

The SVG is rendered locally with [qrcode.react](https://github.com/zpao/qrcode.react). Its payload is explicitly marked `DEMO_ONLY_NOT_A_PAYMENT` and includes the displayed VND total, so it cannot initiate a bank transfer. No bank account or transfer destination is invented. An integrated version must display the configured Payment Provider's payment-attempt QR and amount, obtained from the backend.

Confirmation and preview do not create a seat hold, Payment Attempt, successful payment, Booking confirmation, or Ticket. Real card collection must use provider-hosted fields/tokenization; server-authoritative holds, payment attempts, idempotency, verified callbacks, and outcome reconciliation remain governed by `AGENTS.md` and PAY-01/PAY-02.
