export type CustomerTicket = {
	id: string; bookingId: string; customerName: string;
	details: { movie: string | { title: string }; cinema: string | { name: string }; seats: string[]; price: number; currency: string };
	startsAt: string; checkInOpensAt: string; checkInClosesAt: string;
	seatCount: number; admittedCount: number; remainingAdmissions: number;
	status: "VALID" | "PARTIALLY_USED" | "USED" | "EXPIRED";
	qrToken: string | null;
};
export type TicketResult = { serverTime: string; tickets: CustomerTicket[] };

export async function getMyTickets(signal?: AbortSignal): Promise<TicketResult> {
	const response = await fetch("/api/v1/tickets/mine", { credentials: "include", cache: "no-store", signal });
	if (response.status === 401) throw new Error("Your session has expired. Sign in again to see your tickets.");
	if (!response.ok) throw new Error("Tickets could not be loaded. Please try again.");
	const result: TicketResult = await response.json();
	if (!Array.isArray(result.tickets) || !Number.isFinite(Date.parse(result.serverTime))) throw new Error("The ticket service returned an unexpected response.");
	return result;
}
