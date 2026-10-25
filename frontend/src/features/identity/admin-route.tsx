import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { currentUser, type SessionUser } from "../../api/identity-api";
import AdminDashboard from "../admin/admin-dashboard";
import AdminDataProvider from "../admin/admin-data-provider";
import ErrorPage from "../../shared/error-page";
import { authPagePath } from "./auth-navigation";

export default function AdminRoute() {
	const location = useLocation();
	const [session, setSession] = useState<{ user: SessionUser | null; error?: boolean } | null>(null);
	const [attempt, setAttempt] = useState(0);
	useEffect(() => {
		const controller = new AbortController();
		currentUser(controller.signal).then(user => {
			if (!controller.signal.aborted) setSession({ user });
		}).catch(() => {
			if (!controller.signal.aborted) setSession({ user: null, error: true });
		});
		return () => controller.abort();
	}, [attempt]);
	if (!session || session.error) return <main className="grid min-h-dvh place-items-center bg-[#f5f6fa] p-6 text-center text-[#535d70]">
		<div role={session?.error ? "alert" : "status"}>
			<p>{session?.error ? "Your account could not be verified. Please try again." : "Checking admin access…"}</p>
			{session?.error && <button className="rounded-lg border-0 bg-[#137f73] px-5 py-3 text-white" onClick={() => setAttempt(value => value + 1)}>Try again</button>}
		</div>
	</main>;
	if (!session.user) return <Navigate to={authPagePath("login", location.pathname + location.search)} replace />;
	if (session.user.role !== "ADMIN") return <ErrorPage status={403} />;
	const legacyTab = new URLSearchParams(location.search).get("tab");
	if (["/admin", "/admin/dashboard"].includes(location.pathname) && (legacyTab === "users" || legacyTab === "bookings"))
		return <Navigate to={`/admin/${legacyTab}`} replace />;
	return <AdminDataProvider key={session.user.id}><AdminDashboard user={session.user} /></AdminDataProvider>;
}
