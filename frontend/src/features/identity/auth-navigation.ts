const returnRoutes = new Set(["/", "/movie-list", "/movie-showtime", "/seat-selection", "/ticket-checkout"]);

export function safeReturnTo(value: string | null) {
	if (!value) return "/";
	try {
		const url = new URL(value, window.location.origin);
		return url.origin === window.location.origin && returnRoutes.has(url.pathname)
			? `${url.pathname}${url.search}` : "/";
	} catch {
		return "/";
	}
}

export function authPagePath(mode: "login" | "register" | "forgot-password", returnTo = "/") {
	const target = safeReturnTo(returnTo);
	return `/${mode}${target === "/" ? "" : `?${new URLSearchParams({ returnTo: target })}`}`;
}
