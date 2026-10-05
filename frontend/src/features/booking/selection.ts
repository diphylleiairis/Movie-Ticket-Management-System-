import { demoSeatLayout, readDemoScreening } from "../../demo-movie-data";
import { maxSeatsPerBooking } from "./booking-limits";

// Validates demo navigation data; live availability and holds belong to the server.
export function readDemoSeatSelection(params: URLSearchParams) {
	const screening = readDemoScreening(params);
	const seats = params.get("seats")?.split(",") ?? [];
	if (!screening || !seats.length || seats.length > maxSeatsPerBooking || new Set(seats).size !== seats.length) return null;
	const valid = seats.every((seat) => demoSeatLayout.rows.some((row) =>
		Array.from({ length: demoSeatLayout.columns }, (_, index) => `${row}${index + 1}`).includes(seat),
	) && !demoSeatLayout.bookedSeats.includes(seat));
	return valid ? { ...screening, seats: seats.sort((a, b) => a.localeCompare(b, "en", { numeric: true })) } : null;
}

export function ticketCheckoutPath(params: URLSearchParams, seats: string[]) {
	const checkoutParams = new URLSearchParams(params);
	checkoutParams.set("seats", seats.join(","));
	return `/ticket-checkout?${checkoutParams}`;
}
