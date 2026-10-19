# Configure SePay, PayPal Sandbox and Cinema check-in windows

Status: provider selection and per-Cinema start-relative check-in configuration accepted by the project owner on 2026-10-08. The USD quote mechanism is a proposed V1 implementation choice for review.

SePay handles bank transfers and PayPal Sandbox handles Visa/Mastercard tests, while a fake adapter remains available for deterministic automated scenarios. Every Payment Attempt records provider, method and environment; current card testing cannot select PayPal LIVE. Store the Booking price separately from the provider amount/currency so the VND Booking model can coexist with a proposed USD Sandbox payment. Currency quote values, including their source and time, are immutable per attempt; callback verification uses the quoted provider values.

Admin enters each Cinema's opening minutes before Showtime start and closing minutes after Showtime start, both nonnegative and required without a shared default. Check-in accepts both time boundaries using server time, rejects early/late arrivals without consuming admissions, and checks every newly arriving group against the current Cinema configuration. Retrying a processed request returns its original result without consuming more admissions.

The initial migration remains unapplied, so these changes amend V1. Configuring actual provider credentials, a USD test quote and reversal capabilities is part of future backend integration; choosing a provider does not implement its API or authorize a live charge.
