import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CircleUserRound } from "lucide-react";
import { currentUser, type SessionUser } from "../../api/identity-api";
import { authPagePath } from "./auth-navigation";

export default function AccountMenu() {
	const location = useLocation();
	const [user, setUser] = useState<SessionUser | null>(null);
	useEffect(() => {
		const controller = new AbortController();
		const refresh = () => currentUser(controller.signal).then(setUser).catch(() => {
			if (!controller.signal.aborted) setUser(null);
		});
		void refresh();
		window.addEventListener("profile-updated", refresh);
		return () => { controller.abort(); window.removeEventListener("profile-updated", refresh); };
	}, [location.key]);
	return <Link className="profile grid place-items-center w-8 h-8 border-0 rounded-[50%] text-[#e9dbcd] bg-[#151515] no-underline max-[440px]:w-7 max-[440px]:h-7"
		to={user ? "/account" : authPagePath("login", location.pathname + location.search)}
		aria-label={user ? `Account: ${user.fullName}` : "Sign in to your account"}>
		<CircleUserRound size={18} aria-hidden="true" />
	</Link>;
}
