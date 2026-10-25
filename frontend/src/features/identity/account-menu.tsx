import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CircleUserRound, LayoutDashboard, LoaderCircle, UserRound } from "lucide-react";
import { currentUser, type SessionUser } from "../../api/identity-api";
import { authPagePath } from "./auth-navigation";

const profileClass = "profile grid place-items-center w-8 h-8 border-0 rounded-[50%] text-[#e9dbcd] bg-[#151515] no-underline max-[440px]:w-7 max-[440px]:h-7";

type AccountSession = { locationKey: string } & (
	| { status: "authenticated"; user: SessionUser }
	| { status: "anonymous" }
	| { status: "error" }
);

function WorkspaceAccountMenu({ user }: { user: SessionUser }) {
	const [open, setOpen] = useState(false);
	const dropdown = useRef<HTMLDivElement>(null);
	const trigger = useRef<HTMLButtonElement>(null);
	const optionsId = useId();
	const admin = user.role === "ADMIN";
	const itemClass = "flex w-full items-center gap-3 rounded-md border-0 px-3 py-3 text-left text-[12px] text-[#40362b] no-underline hover:bg-[#f1e6d4] focus-visible:outline-2 focus-visible:outline-[#a46a34]";
	useEffect(() => {
		if (!open) return;
		const closeOutside = (event: PointerEvent) => {
			if (event.target instanceof Node && !dropdown.current?.contains(event.target)) setOpen(false);
		};
		const closeOnEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setOpen(false);
				trigger.current?.focus();
			}
		};
		document.addEventListener("pointerdown", closeOutside);
		document.addEventListener("keydown", closeOnEscape);
		return () => {
			document.removeEventListener("pointerdown", closeOutside);
			document.removeEventListener("keydown", closeOnEscape);
		};
	}, [open]);
	return <div ref={dropdown} className="relative shrink-0"
		onBlur={event => {
			if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
		}}>
		<button type="button" ref={trigger} className={`${profileClass} cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#a46a34]`}
			aria-label={`Account: ${user.fullName}`} aria-expanded={open} aria-controls={optionsId}
			onClick={() => setOpen(value => !value)}>
			<CircleUserRound size={18} aria-hidden="true" />
		</button>
		{open && <nav id={optionsId} aria-label="Account options" className="absolute right-0 top-full z-50 mt-3 w-[224px] rounded-xl border border-solid border-[#e3d9ca] bg-[#fffdf9] p-2 text-[#28221d] shadow-[0_12px_32px_#28221d24]">
			<div className="mb-1 px-3 py-3 [border-bottom:1px_solid_#e8e0d5]">
				<strong className="block truncate text-[13px]">{user.fullName}</strong>
				<span className="mt-1 block text-[10px] text-[#8b7d6e]">{admin ? "Administrator" : "Cinema Staff"}</span>
			</div>
			<Link to="/account" className={itemClass} onClick={() => setOpen(false)}>
				<UserRound size={16} aria-hidden="true" />Edit profile
			</Link>
			{admin ? <Link to="/admin" className={itemClass} onClick={() => setOpen(false)}>
				<LayoutDashboard size={16} aria-hidden="true" />Admin dashboard
			</Link> : <button type="button" disabled className={`${itemClass} cursor-not-allowed bg-transparent opacity-50`}>
				<LayoutDashboard size={16} aria-hidden="true" />
				<span>Staff dashboard<small className="mt-1 block text-[10px]">Coming soon</small></span>
			</button>}
		</nav>}
	</div>;
}

export default function AccountMenu() {
	const location = useLocation();
	const [session, setSession] = useState<AccountSession | null>(null);
	const [attempt, setAttempt] = useState(0);
	useEffect(() => {
		const controller = new AbortController();
		let latestRequest = 0;
		const load = async () => {
			const request = ++latestRequest;
			try {
				const user = await currentUser(controller.signal);
				if (!controller.signal.aborted && request === latestRequest) {
					setSession(user ? { locationKey: location.key, status: "authenticated", user }
						: { locationKey: location.key, status: "anonymous" });
				}
			} catch {
				if (!controller.signal.aborted && request === latestRequest)
					setSession({ locationKey: location.key, status: "error" });
			}
		};
		void load();
		window.addEventListener("profile-updated", load);
		return () => { controller.abort(); window.removeEventListener("profile-updated", load); };
	}, [location.key, attempt]);
	const resolved = session?.locationKey === location.key ? session : null;
	if (!resolved || resolved.status === "error") {
		const label = resolved ? "Account unavailable. Retry account check" : "Checking your account";
		return <button type="button" className={`${profileClass} ${resolved ? "cursor-pointer" : "cursor-wait"}`}
			aria-label={label} title={label} aria-busy={!resolved} disabled={!resolved}
			onClick={() => { setSession(null); setAttempt(value => value + 1); }}>
			{resolved ? <CircleUserRound size={18} aria-hidden="true" /> : <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />}
		</button>;
	}
	const user = resolved.status === "authenticated" ? resolved.user : null;
	if (user && (user.role === "ADMIN" || user.role === "CINEMA_STAFF")) {
		return <WorkspaceAccountMenu key={location.key} user={user} />;
	}
	return <Link className={profileClass}
		to={user ? "/account" : authPagePath("login", location.pathname + location.search)}
		aria-label={user ? `Account: ${user.fullName}` : "Sign in to your account"}>
		<CircleUserRound size={18} aria-hidden="true" />
	</Link>;
}
