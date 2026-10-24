import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, Check, CircleUserRound, Clock3, Film, LogOut, Mail, MapPin, Phone, RefreshCw, ShieldCheck, Ticket, UserRound } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import SiteHeader from "../../site-header";
import { getProfile, signOut, updateProfile, type CustomerProfile } from "../../api/identity-api";
import { getMyTickets, type CustomerTicket } from "../../api/tickets-api";
import { authPagePath } from "./auth-navigation";

const inputClass = "mt-2 w-full rounded-md border border-[#ded6ca] bg-[#fffdf9] px-4 py-3 text-[14px] text-[#28221d] outline-none focus:border-[#a46a34] focus:ring-2 focus:ring-[#a46a34]/10 disabled:cursor-not-allowed disabled:bg-[#eee9e0] disabled:text-[#80796f]";
const actionClass = "inline-flex items-center justify-center gap-2 rounded-md border-0 bg-[#a46a34] px-6 py-3 text-[12px] font-bold tracking-[.06em] text-white hover:bg-[#895529] disabled:cursor-not-allowed disabled:opacity-50";
const dateFormat = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

function isPast(ticket: CustomerTicket, now: number) {
	return ticket.status === "USED" || ticket.status === "EXPIRED" || now > Date.parse(ticket.checkInClosesAt);
}

function TicketCard({ ticket, now }: { ticket: CustomerTicket; now: number }) {
	const used = ticket.status === "USED" || ticket.remainingAdmissions === 0;
	const inactive = used || isPast(ticket, now);
	const partial = ticket.admittedCount > 0 && !used;
	const label = used ? "Checked in" : inactive ? "Expired" : partial ? "Partially checked in" : "Upcoming";
	const movie = typeof ticket.details.movie === "string" ? ticket.details.movie : ticket.details.movie.title;
	const cinema = typeof ticket.details.cinema === "string" ? ticket.details.cinema : ticket.details.cinema.name;
	return <article data-ticket-id={ticket.id} data-status={used ? "USED" : inactive ? "EXPIRED" : partial ? "PARTIALLY_USED" : "VALID"}
		className={`account-ticket overflow-hidden rounded-xl border bg-[#fffdf9] ${inactive ? "border-[#dedbd5] text-[#89847d]" : "border-[#e3d9ca] text-[#28221d]"}`}>
		<div className="grid grid-cols-[1fr_190px] max-[650px]:grid-cols-1">
			<div className="min-w-0 p-6 sm:p-7">
				<div className="mb-5 flex flex-wrap items-center gap-2">
					<span className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.08em] ${inactive ? "bg-[#eae7e2] text-[#807b74]" : "bg-[#f2e7d5] text-[#96602d]"}`}>{label}</span>
					<span className="text-[11px] text-[#8b8176]">{ticket.seatCount} {ticket.seatCount === 1 ? "admission" : "admissions"}</span>
				</div>
				<h3 className="m-0 font-[Georgia,serif] text-[27px] font-normal leading-tight">{movie}</h3>
				<p className="mb-4 mt-3 flex items-center gap-2 text-[12px]"><MapPin size={14} aria-hidden="true" />{cinema}</p>
				<p className="flex items-center gap-2 text-[12px]"><Clock3 size={14} aria-hidden="true" />{dateFormat.format(new Date(ticket.startsAt))} · Vietnam time</p>
				<dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 text-[12px] [&_dt]:mb-1 [&_dt]:text-[10px] [&_dt]:uppercase [&_dt]:tracking-[.09em] [&_dt]:text-[#9a8d7d] [&_dd]:m-0 [&_dd]:break-words">
					<div><dt>Seats</dt><dd>{ticket.details.seats.join(", ")}</dd></div>
					<div><dt>Total paid</dt><dd>{new Intl.NumberFormat("en-GB", { style: "currency", currency: ticket.details.currency }).format(ticket.details.price)}</dd></div>
					<div><dt>Ticket holder</dt><dd>{ticket.customerName}</dd></div>
					<div><dt>Admissions</dt><dd>{ticket.admittedCount} checked in · {ticket.remainingAdmissions} remaining</dd></div>
				</dl>
				<p className="mb-0 mt-5 break-all border-t border-dashed border-[#e1d9ce] pt-4 font-mono text-[10px] text-[#93887b]">BOOKING {ticket.bookingId}</p>
			</div>
			<div className={`ticket-qr flex flex-col items-center justify-center gap-3 border-l border-dashed border-[#ddd3c5] p-5 text-center max-[650px]:border-l-0 max-[650px]:border-t ${inactive ? "bg-[#ece9e4] grayscale" : "bg-[#f6f0e6]"}`}>
				{ticket.qrToken ? <div className={inactive ? "opacity-35" : ""}><QRCodeSVG value={ticket.qrToken} size={142} marginSize={3} level="M" title={`Check-in QR for ${movie}${inactive ? ` — ${label}` : ""}`} /></div>
					: <div className="grid h-[142px] w-[142px] place-items-center rounded-lg border border-[#ded6ca] bg-white text-[12px] text-[#827668]">QR unavailable</div>}
				<strong className="text-[10px] uppercase tracking-[.12em]">{used ? "All admissions used" : inactive ? "Check-in closed" : "Your entry to the cinema"}</strong>
				<p className="m-0 text-[11px] leading-relaxed text-[#8c8072]">{inactive ? "Keep this ticket as a memory." : `Show this code at the entrance. ${ticket.remainingAdmissions} ${ticket.remainingAdmissions === 1 ? "admission" : "admissions"} remaining.`}</p>
			</div>
		</div>
		{!inactive && <p className="m-0 border-t border-[#e6ded2] px-6 py-3 text-[10px] leading-relaxed text-[#8b7a66]">Check-in: {dateFormat.format(new Date(ticket.checkInOpensAt))} – {dateFormat.format(new Date(ticket.checkInClosesAt))}</p>}
	</article>;
}

export default function AccountPage() {
	const navigate = useNavigate();
	const [profile, setProfile] = useState<CustomerProfile | null>(null);
	const [name, setName] = useState("");
	const [phone, setPhone] = useState("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [notice, setNotice] = useState("");
	const [saving, setSaving] = useState(false);
	const [leaving, setLeaving] = useState(false);
	const [tab, setTab] = useState<"all" | "upcoming" | "history">("all");
	const [tickets, setTickets] = useState<CustomerTicket[]>([]);
	const [ticketError, setTicketError] = useState("");
	const [ticketLoading, setTicketLoading] = useState(true);
	const [reload, setReload] = useState(0);
	const [now, setNow] = useState(0);
	useEffect(() => {
		const controller = new AbortController();
		getProfile(controller.signal).then(value => {
			if (controller.signal.aborted) return;
			if (!value) { navigate(authPagePath("login", "/account"), { replace: true }); return; }
			setProfile(value); setName(value.fullName); setPhone(value.phone ?? "");
		}).catch(() => { if (!controller.signal.aborted) setError("Your profile could not be loaded. Please refresh and try again."); })
			.finally(() => { if (!controller.signal.aborted) setLoading(false); });
		return () => controller.abort();
	}, [navigate]);
	useEffect(() => {
		if (!profile || profile.role !== "CUSTOMER") return;
		const controller = new AbortController();
		let timer: ReturnType<typeof setInterval> | undefined;
		const load = () => getMyTickets(controller.signal).then(result => {
			if (controller.signal.aborted) return;
			setTickets(result.tickets); setTicketError("");
			const serverTime = Date.parse(result.serverTime), received = performance.now();
			setNow(serverTime);
			if (timer) clearInterval(timer);
			timer = setInterval(() => setNow(serverTime + performance.now() - received), 1000);
		}).catch(error => { if (!controller.signal.aborted) setTicketError(error instanceof Error ? error.message : "Tickets could not be loaded."); })
			.finally(() => { if (!controller.signal.aborted) setTicketLoading(false); });
		void load();
		const refresh = setInterval(load, 30000);
		window.addEventListener("focus", load);
		return () => { controller.abort(); clearInterval(refresh); if (timer) clearInterval(timer); window.removeEventListener("focus", load); };
	}, [profile, reload]);

	async function save(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!profile || saving) return;
		setSaving(true); setError(""); setNotice("");
		try {
			await updateProfile(name.trim(), phone.trim());
			setProfile({ ...profile, fullName: name.trim(), phone: phone.trim() || null });
			setName(name.trim()); setPhone(phone.trim());
			setNotice("Your personal information has been saved.");
			window.dispatchEvent(new Event("profile-updated"));
		} catch (error) { setError(error instanceof Error ? error.message : "Your profile could not be saved."); }
		finally { setSaving(false); }
	}
	async function logout() {
		if (leaving) return;
		setLeaving(true);
		try { await signOut(); navigate("/login", { replace: true }); }
		catch { setError("Sign out could not be completed. Please try again."); setLeaving(false); }
	}
	const visibleTickets = tickets.filter(ticket => tab === "all" || (tab === "history" ? isPast(ticket, now) : !isPast(ticket, now)));
	const customer = profile?.role === "CUSTOMER";
	return <div className="account-page h-dvh overflow-y-auto bg-[#f8f5ef] text-[#28221d]">
		<SiteHeader currentStep={1} scrolled />
		<main className="mx-auto max-w-[1320px] px-6 pb-16 pt-[130px] sm:px-10 lg:px-16 max-[600px]:pt-[100px]">
			<Link to="/movie-list" className="inline-flex items-center gap-2 text-[11px] tracking-[.04em] text-[#8d7d6b] no-underline hover:text-[#a46a34]"><ArrowLeft size={14} />BACK TO THE FILMS</Link>
			<div className="mb-9 mt-8 flex flex-wrap items-end justify-between gap-5 border-b border-[#e2d9cb] pb-8">
				<div><p className="mb-3 text-[10px] font-bold tracking-[.24em] text-[#a46a34]">THE LUMIÈRE · YOUR CINEMA JOURNEY</p><h1 className="m-0 font-[Georgia,serif] text-[clamp(36px,4vw,52px)] font-normal">A space for <em className="text-[#a46a34]">you.</em></h1><p className="mb-0 mt-3 text-[13px] leading-relaxed text-[#8b7d6e]">Your details, your tickets, your next great story.</p></div>
				{profile && <button type="button" disabled={leaving} onClick={logout} className="inline-flex items-center gap-2 border-0 bg-transparent px-0 py-2 text-[12px] text-[#8b7d6e] hover:text-[#a46a34] disabled:opacity-50"><LogOut size={15} />{leaving ? "Signing out…" : "Sign out"}</button>}
			</div>
			{loading ? <p role="status" className="py-16 text-center text-[#8b7d6e]">Opening your account…</p> : <div className="grid grid-cols-[minmax(270px,340px)_minmax(0,1fr)] items-start gap-8 max-[950px]:grid-cols-1">
				<section aria-labelledby="profile-title" className="rounded-xl border border-[#e3d9ca] bg-[#fffdf9] p-6 sm:p-7">
					<div className="mb-6 flex items-center gap-4 border-b border-[#e8e0d5] pb-6"><span className="grid size-14 shrink-0 place-items-center rounded-full bg-[#f1e6d4] text-[#a46a34]"><CircleUserRound size={30} strokeWidth={1.2} /></span><div><p className="mb-1 mt-0 text-[9px] font-bold uppercase tracking-[.15em] text-[#a46a34]">Your account</p><h2 id="profile-title" className="m-0 font-[Georgia,serif] text-[24px] font-normal">Personal details</h2></div></div>
					{error && <p role="alert" className="rounded-md bg-[#f8ece5] p-3 text-[12px] leading-relaxed text-[#8a3529]">{error}</p>}
					{notice && <p role="status" className="flex gap-2 rounded-md bg-[#edf1e7] p-3 text-[12px] leading-relaxed text-[#546341]"><Check size={16} className="shrink-0" />{notice}</p>}
					{profile && <form onSubmit={save} className="grid gap-5">
						<label className="text-[10px] font-bold tracking-[.09em]"><span className="flex items-center gap-2"><UserRound size={13} />FULL NAME</span><input id="profile-name" className={inputClass} value={name} onChange={e => { setName(e.target.value); setNotice(""); }} autoComplete="name" required maxLength={150} disabled={!customer || saving} /></label>
						<label className="text-[10px] font-bold tracking-[.09em]"><span className="flex items-center gap-2"><Mail size={13} />EMAIL ADDRESS</span><input id="profile-email" className={inputClass} value={profile.email} type="email" readOnly aria-describedby="profile-email-note" /></label>
						<p id="profile-email-note" className="-mt-3 mb-0 flex gap-2 text-[11px] leading-relaxed text-[#8e806f]"><ShieldCheck size={15} className="shrink-0" />Your verified sign-in email. Changing it requires verification of the new address.</p>
						<label className="text-[10px] font-bold tracking-[.09em]"><span className="flex items-center gap-2"><Phone size={13} />PHONE NUMBER <span className="font-normal text-[#9c9082]">(OPTIONAL)</span></span><input id="profile-phone" className={inputClass} value={phone} onChange={e => { setPhone(e.target.value); setNotice(""); }} type="tel" autoComplete="tel" maxLength={26} placeholder="+84" disabled={!customer || saving} /></label>
						{customer && <button className={actionClass} type="submit" disabled={saving || !name.trim() || (name.trim() === profile.fullName && phone.trim() === (profile.phone ?? ""))}>{saving ? "SAVING…" : "SAVE CHANGES"}<ArrowUpRight size={15} /></button>}
					</form>}
				</section>
				<section aria-labelledby="tickets-title" className="min-w-0">
					<div className="mb-2 flex items-center justify-between gap-3"><h2 id="tickets-title" className="m-0 flex items-center gap-3 font-[Georgia,serif] text-[30px] font-normal"><Ticket size={24} strokeWidth={1.3} className="text-[#a46a34]" />Your tickets</h2>{customer && <button type="button" aria-label="Refresh tickets" onClick={() => setReload(reload + 1)} className="grid size-9 place-items-center rounded-full border border-[#e0d7c9] bg-transparent text-[#927c62] hover:bg-[#eee6d9]"><RefreshCw size={14} /></button>}</div>
					<p className="mb-6 text-[12px] leading-relaxed text-[#8d8070]">All upcoming screenings and your past 30 days of ticket history.</p>
					<div role="group" aria-label="Filter tickets" className="mb-6 flex flex-wrap gap-2">{([ ["all", "All tickets"], ["upcoming", "Upcoming"], ["history", "Used & expired"] ] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={tab === value} onClick={() => setTab(value)} className={`rounded-full border px-4 py-2 text-[11px] ${tab === value ? "border-[#a46a34] bg-[#a46a34] text-white" : "border-[#dfd5c6] bg-transparent text-[#8b7a66] hover:bg-[#f0e8dc]"}`}>{label}</button>)}</div>
					{ticketError && <div role="alert" className="mb-5 rounded-lg border border-[#e7cebc] bg-[#f8ece5] p-4 text-[12px] text-[#8a3529]">{ticketError}<button type="button" onClick={() => setReload(reload + 1)} className="ml-2 border-0 bg-transparent text-inherit underline">Try again</button></div>}
					{customer && ticketLoading ? <p role="status" className="py-12 text-center text-[13px] text-[#8b7d6e]">Loading your tickets…</p> : !ticketError && visibleTickets.length === 0 ? <div className="rounded-xl border border-dashed border-[#d9cbb9] bg-[#f3eee5] px-6 py-16 text-center"><span className="mx-auto grid size-16 place-items-center rounded-full bg-[#eae0d1] text-[#ad8d64]"><Film size={28} strokeWidth={1.2} /></span><h3 className="mb-3 mt-5 font-[Georgia,serif] text-[26px] font-normal">{tab === "history" ? "No past screenings yet" : "Your next story awaits"}</h3><p className="mx-auto mb-6 max-w-[300px] text-[12px] leading-relaxed text-[#8d8070]">{customer ? "Your confirmed tickets will appear here, ready for your next visit." : "Customer tickets are available from a Customer account."}</p><Link to="/movie-list" className={`${actionClass} no-underline`}>EXPLORE THE FILMS<ArrowUpRight size={14} /></Link></div> : <div className="grid gap-5">{visibleTickets.map(ticket => <TicketCard key={ticket.id} ticket={ticket} now={now} />)}</div>}
					<p className="mt-6 flex items-start gap-2 text-[11px] leading-relaxed text-[#9b8c79]"><ShieldCheck size={15} className="shrink-0" />One QR covers all seats in your booking. Groups may arrive separately while admissions remain and check-in is open.</p>
				</section>
			</div>}
			<footer className="mt-14 flex flex-wrap justify-between gap-3 border-t border-[#e2d9cb] pt-6 text-[9px] uppercase tracking-[.13em] text-[#aa9a86]"><span>The Lumière Cinémathèque</span><span>For the love of the big screen.</span></footer>
		</main>
	</div>;
}
