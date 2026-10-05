export type AuthProvider = "google" | "apple";

function configuredUrl(value: unknown) {
	if (typeof value !== "string" || !value.trim()) return null;
	try {
		const url = new URL(value, window.location.origin);
		const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
		return !url.username && !url.password && (url.protocol === "https:" || (import.meta.env.DEV && local && url.protocol === "http:")) ? url : null;
	} catch {
		return null;
	}
}

const apiBase = configuredUrl(import.meta.env.VITE_IDENTITY_API_URL);

async function readJson(response: Response): Promise<Record<string, unknown>> {
	if (!response.headers.get("content-type")?.includes("json")) throw new Error("The account service is unavailable. Please try again later.");
	let body: unknown;
	try { body = await response.json(); }
	catch { throw new Error("The account service returned an unexpected response."); }
	if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("The account service returned an unexpected response.");
	return body as Record<string, unknown>;
}

async function postIdentity(action: "login" | "register" | "password-reset" | "email-verification/confirm" | "email-verification/resend", payload: object, expectedStatus: string) {
	if (!apiBase) throw new Error("The account service is not available yet. Please try again later.");
	const endpoint = apiBase.href.replace(/\/$/, "");
	try {
		const csrfResponse = await fetch(`${endpoint}/csrf`, { credentials: "include", cache: "no-store", signal: AbortSignal.timeout(15000) });
		if (!csrfResponse.ok) throw new Error("The account service is unavailable. Please try again later.");
		const csrf = await readJson(csrfResponse);
		if (typeof csrf.token !== "string" || !csrf.token) throw new Error("The account service is unavailable. Please try again later.");
		const response = await fetch(`${endpoint}/${action}`, {
			method: "POST", credentials: "include", cache: "no-store", signal: AbortSignal.timeout(15000),
			headers: { "Content-Type": "application/json", "X-CSRF-TOKEN": csrf.token }, body: JSON.stringify(payload),
		});
		const result = await readJson(response);
		if (!response.ok) {
			if (result.code === "EMAIL_NOT_VERIFIED") throw new Error("Verify your email before signing in. Check your inbox for the verification code.");
			if (result.code === "INVALID_VERIFICATION_CODE") throw new Error("The verification code is incorrect. Please check the six digits and try again.");
			if (result.code === "EXPIRED_VERIFICATION_CODE") throw new Error("The verification code has expired. Request a new code to continue.");
			if (response.status === 401) throw new Error("The email or password is incorrect.");
			if (response.status === 409) throw new Error("This email is already registered. Sign in to your account instead.");
			if (response.status === 429) throw new Error("Too many attempts. Please wait a moment before trying again.");
			throw new Error("The request could not be completed. Please try again later.");
		}
		if (result.status !== expectedStatus) throw new Error("The account service returned an unexpected response.");
		return result;
	} catch (error) {
		if (error instanceof TypeError || (error instanceof DOMException && ["TimeoutError", "AbortError"].includes(error.name))) throw new Error("The account service could not be reached. Please try again later.", { cause: error });
		throw error;
	}
}

export const signIn = (email: string, password: string, rememberMe: boolean) =>
	postIdentity("login", { email, password, rememberMe }, "AUTHENTICATED");

function readVerificationChallenge(result: Record<string, unknown>) {
	if (typeof result.challengeId !== "string" || !result.challengeId.trim()) throw new Error("The account service returned an unexpected response.");
	return result.challengeId;
}

export const registerCustomer = async (fullName: string, email: string, password: string) =>
	readVerificationChallenge(await postIdentity("register", { fullName, email, password, acceptedTerms: true }, "VERIFICATION_REQUIRED"));

export const resendVerificationCode = async (challengeId: string) =>
	readVerificationChallenge(await postIdentity("email-verification/resend", { challengeId }, "VERIFICATION_REQUIRED"));

export function verifyRegistrationCode(challengeId: string, code: string) {
	if (!/^[0-9]{6}$/.test(code)) throw new Error("Enter the complete six-digit verification code.");
	return postIdentity("email-verification/confirm", { challengeId, code }, "EMAIL_VERIFIED");
}

export const requestPasswordReset = (email: string) =>
	postIdentity("password-reset", { email }, "REQUEST_ACCEPTED");

export function startSocialAuth(provider: AuthProvider, intent: "login" | "register", returnTo: string) {
	const url = configuredUrl(provider === "google" ? import.meta.env.VITE_GOOGLE_AUTH_URL : import.meta.env.VITE_APPLE_AUTH_URL);
	if (!url) throw new Error(`${provider === "google" ? "Google" : "Apple ID"} sign-in is not available yet. Please use email or try again later.`);
	url.searchParams.set("intent", intent);
	url.searchParams.set("returnTo", returnTo);
	window.location.assign(url.href);
}
