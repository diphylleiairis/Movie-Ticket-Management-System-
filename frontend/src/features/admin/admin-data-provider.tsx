import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { AdminAccessError } from "../../api/admin-api";
import { AdminDataContext, AdminDataStore } from "./admin-data";
import { authPagePath } from "../identity/auth-navigation";

export default function AdminDataProvider({ children }: { children: ReactNode }) {
	const [denied, setDenied] = useState<AdminAccessError | null>(null);
	const [store] = useState(() => new AdminDataStore(setDenied));
	useEffect(() => {
		// Let the visible page start first, then warm only the default page of each section.
		const timer = window.setTimeout(() => { ["overview", "users", "bookings", "movies"].forEach(section => store.prefetch(section)); }, 0);
		return () => { window.clearTimeout(timer); store.clear(); };
	}, [store]);
	if (denied) return <Navigate to={denied.status === 401 ? authPagePath("login", "/admin") : "/error/403"} replace />;
	return <AdminDataContext.Provider value={store}>{children}</AdminDataContext.Provider>;
}
