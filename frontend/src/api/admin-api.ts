export type RevenueDay = { date: string; revenue: number };
export type AdminOverview = {
	generatedAt: string; from: string; through: string; users: number; activeMovies: number;
	current: { bookings: number; revenue: number }; previous: { bookings: number; revenue: number };
	revenue: RevenueDay[]; previousRevenue: RevenueDay[];
	recentBookings: { id: string; customer: string; movie: string; createdAt: string; seats: number; amount: number; currency: string; status: string }[];
	topMovies: { id: string; title: string; poster: string; genre: string; seats: number }[];
	genres: { name: string; seats: number }[];
};

export class AdminAccessError extends Error {
	status: number;
	constructor(status: number) { super("Admin access is required."); this.status = status; }
}

export type AdminUser = { id: string; fullName: string; email: string; role: string; status: string; emailVerified: boolean; createdAt: string };
export type AdminBooking = AdminOverview["recentBookings"][number];
export type AdminMovie = { id: string; title: string; slug: string; description: string; durationMinutes: number; ageRating: string; posterUrl: string; releaseDate: string | null; status: string; createdAt: string; genres: string[] };
export type CreateAdminMovie = Pick<AdminMovie, "title" | "slug" | "description" | "durationMinutes" | "ageRating" | "posterUrl" | "releaseDate" | "genres">;
export type AdminPage<T> = { items: T[]; total: number; page: number; size: number };

async function adminResponse(response: Response) {
	if (response.status === 401 || response.status === 403) throw new AdminAccessError(response.status);
	if (!response.headers.get("content-type")?.includes("json")) throw new Error("The admin service is unavailable. Please try again.");
	const body = await response.json();
	if (!response.ok) throw new Error(typeof body?.message === "string" ? body.message : "The request could not be completed. Please try again.");
	return body;
}

async function adminPage<T>(path: string, signal: AbortSignal, valid: (row: T) => boolean): Promise<AdminPage<T>> {
	const body = await adminResponse(await fetch(path, { credentials: "include", cache: "no-store", signal }));
	if (!Array.isArray(body?.items) || !Number.isSafeInteger(body.total) || body.total < 0
		|| !Number.isInteger(body.page) || body.page < 0 || !Number.isInteger(body.size) || body.size < 1
		|| !body.items.every((row: T) => row && valid(row))) throw new Error("The admin service returned an unexpected response.");
	return body;
}

export const getAdminUsers = (page: number, q: string, signal: AbortSignal) =>
	adminPage<AdminUser>(`/api/v1/admin/users?${new URLSearchParams({ page: String(page), size: "25", q })}`, signal,
		row => [row.id, row.fullName, row.email, row.role, row.status, row.createdAt].every(value => typeof value === "string") && typeof row.emailVerified === "boolean");

export const getAdminBookings = (page: number, signal: AbortSignal) =>
	adminPage<AdminBooking>(`/api/v1/admin/bookings?page=${page}&size=25`, signal,
		row => [row.id, row.customer, row.movie, row.status, row.currency, row.createdAt].every(value => typeof value === "string")
			&& typeof row.seats === "number" && typeof row.amount === "number");

export const getAdminMovies = (page: number, q: string, signal: AbortSignal) =>
	adminPage<AdminMovie>(`/api/v1/admin/movies?${new URLSearchParams({ page: String(page), size: "25", q })}`, signal,
		row => [row.id, row.title, row.slug, row.description, row.ageRating, row.posterUrl, row.status, row.createdAt].every(value => typeof value === "string")
			&& Number.isInteger(row.durationMinutes) && row.durationMinutes > 0 && (row.releaseDate === null || typeof row.releaseDate === "string")
			&& Array.isArray(row.genres) && row.genres.every(value => typeof value === "string"));

export async function createAdminMovie(input: CreateAdminMovie): Promise<AdminMovie> {
	const csrf = await adminResponse(await fetch("/api/v1/identity/csrf", { credentials: "include", cache: "no-store", signal: AbortSignal.timeout(180_000) }));
	if (typeof csrf?.token !== "string" || !csrf.token) throw new Error("The account service returned an unexpected response.");
	const result = await adminResponse(await fetch("/api/v1/admin/movies", {
		method: "POST", credentials: "include", cache: "no-store", signal: AbortSignal.timeout(180_000),
		headers: { "Content-Type": "application/json", "X-CSRF-TOKEN": csrf.token }, body: JSON.stringify(input),
	}));
	if (typeof result?.id !== "string" || typeof result?.title !== "string" || result?.status !== "ACTIVE") throw new Error("The admin service returned an unexpected response.");
	return result;
}

export async function uploadAdminMoviePoster(image: File, signal: AbortSignal): Promise<string> {
	const csrf = await adminResponse(await fetch("/api/v1/identity/csrf", { credentials: "include", cache: "no-store", signal }));
	if (typeof csrf?.token !== "string" || !csrf.token) throw new Error("The account service returned an unexpected response.");
	const body = new FormData();
	body.append("image", image);
	const result = await adminResponse(await fetch("/api/v1/admin/movies/posters", {
		method: "POST", credentials: "include", cache: "no-store", signal,
		headers: { "X-CSRF-TOKEN": csrf.token }, body,
	}));
	if (typeof result?.posterUrl !== "string" || !result.posterUrl.startsWith("https://"))
		throw new Error("The poster service returned an unexpected response.");
	return result.posterUrl;
}

export async function updateAdminUser(id: string, status: "ACTIVE" | "SUSPENSE") {
	const csrfResponse = await fetch("/api/v1/identity/csrf", { credentials: "include", cache: "no-store", signal: AbortSignal.timeout(180_000) });
	const csrf = await adminResponse(csrfResponse);
	if (typeof csrf?.token !== "string" || !csrf.token) throw new Error("The account service returned an unexpected response.");
	const result = await adminResponse(await fetch(`/api/v1/admin/users/${encodeURIComponent(id)}/status`, {
		method: "POST", credentials: "include", cache: "no-store", signal: AbortSignal.timeout(180_000),
		headers: { "Content-Type": "application/json", "X-CSRF-TOKEN": csrf.token }, body: JSON.stringify({ status }),
	}));
	if (result?.status !== "UPDATED") throw new Error("The admin service returned an unexpected response.");
}

export async function getAdminOverview(days: number, signal: AbortSignal): Promise<AdminOverview> {
	const response = await fetch(`/api/v1/admin/dashboard?days=${days}`, {
		credentials: "include", cache: "no-store", signal,
	});
	if (response.status === 401 || response.status === 403) throw new AdminAccessError(response.status);
	if (!response.ok || !response.headers.get("content-type")?.includes("json"))
		throw new Error("Dashboard data could not be loaded. Please try again.");
	const body = await response.json();
	if (!body || typeof body.generatedAt !== "string" || typeof body.from !== "string" || typeof body.through !== "string"
		|| typeof body.users !== "number" || typeof body.activeMovies !== "number"
		|| typeof body.current?.bookings !== "number" || typeof body.current?.revenue !== "number"
		|| typeof body.previous?.bookings !== "number" || typeof body.previous?.revenue !== "number"
		|| ![body.revenue, body.previousRevenue, body.recentBookings, body.topMovies, body.genres].every(Array.isArray))
		throw new Error("The dashboard service returned an unexpected response.");
	return body;
}
