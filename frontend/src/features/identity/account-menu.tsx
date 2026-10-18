import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CircleUserRound } from "lucide-react";
import { currentUser, signOut, type SessionUser } from "../../api/identity-api";
import { authPagePath } from "./auth-navigation";

export default function AccountMenu() {
	const location = useLocation();
	const [user, setUser] = useState<SessionUser | null>(null);
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState("");
	useEffect(() => {
		const controller = new AbortController();
		currentUser(controller.signal).then(setUser).catch(() => {
			if (!controller.signal.aborted) setUser(null);
		});
		return () => controller.abort();
	}, [location.key]);

	const logout = async () => {
		if (pending) return;
		setPending(true);
		setError("");
		try {
			await signOut();
			setUser(null);
			setOpen(false);
		} catch {
			setError("Sign out could not be completed. Please try again.");
		} finally {
			setPending(false);
		}
	};
	const profileClass = "profile grid place-items-center w-8 h-8 border-0 rounded-[50%] text-[#e9dbcd] bg-[#151515] no-underline max-[440px]:w-7 max-[440px]:h-7";
	if (!user) return (
		<Link className={profileClass} to={authPagePath("login", location.pathname + location.search)} aria-label="Sign in to your account">
			<CircleUserRound size={18} aria-hidden="true" />
		</Link>
	);
	return (
		<div className="relative">
			<button className={profileClass} type="button" aria-label={`Account: ${user.fullName}`} aria-expanded={open} onClick={() => setOpen(!open)}>
				<CircleUserRound size={18} aria-hidden="true" />
			</button>
			{open && <div className="absolute right-0 top-[calc(100%_+_12px)] min-w-[220px] max-w-[min(320px,85vw)] rounded-lg border border-[#e6dfd5] bg-white p-4 text-[13px] shadow-lg">
				<p className="m-0 break-words font-semibold">{user.fullName}</p>
				<p className="my-2 break-words text-[#80796f]">{user.email}</p>
				{error && <p role="alert" className="text-[#8a3529]">{error}</p>}
				<button type="button" className="mt-2 border-0 bg-transparent p-0 underline disabled:opacity-50" onClick={logout} disabled={pending}>
					{pending ? "Signing out…" : "Sign out"}
				</button>
			</div>}
		</div>
	);
}
