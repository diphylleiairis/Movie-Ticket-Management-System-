import { useState, type ReactNode } from "react";
import {
	Link,
	Outlet,
	useLocation,
	useNavigate,
	useOutletContext,
} from "react-router-dom";
import {
	ArrowDownRight,
	ArrowLeft,
	ArrowUpRight,
	CalendarDays,
	ChevronDown,
	Clapperboard,
	Download,
	LayoutDashboard,
	LogOut,
	Menu,
	Search,
	ShieldCheck,
	Ticket,
	TrendingUp,
	Users,
	Wallet,
	X,
} from "lucide-react";
import { type AdminOverview, type RevenueDay } from "../../api/admin-api";
import { signOut, type SessionUser } from "../../api/identity-api";
import { useAdminDataStore, useAdminResource } from "./admin-data";
import { AdminRefreshNotice } from "./admin-workspace";

const colors = ["#148477", "#8b79b9", "#5284ac", "#d4ab70", "#a7b1c0"];
const number = (value: number) => new Intl.NumberFormat("en-GB").format(value);
const money = (value: number, currency = "VND") =>
	new Intl.NumberFormat("vi-VN", {
		style: "currency",
		currency,
		maximumFractionDigits: currency === "VND" ? 0 : 2,
	}).format(value);
const compact = (value: number) =>
	new Intl.NumberFormat("en-GB", {
		notation: "compact",
		maximumFractionDigits: 1,
	}).format(value);
const compactMoney = (value: number) =>
	new Intl.NumberFormat("vi-VN", {
		style: "currency",
		currency: "VND",
		notation: "compact",
		maximumFractionDigits: 1,
	}).format(value);
const dateLabel = (value: string) =>
	new Intl.DateTimeFormat("en-GB", {
		day: "2-digit",
		month: "short",
		timeZone: "Asia/Ho_Chi_Minh",
	}).format(new Date(value));
const card = "rounded-xl border border-solid border-[#e6e9ef] bg-white";
const quietButton =
	"inline-flex items-center justify-center gap-2 rounded-md border border-solid border-[#e6e9ef] bg-white px-3 py-2 text-xs text-[#566178] transition-colors hover:bg-[#f4f6f9]";

function Change({ value, previous }: { value: number; previous: number }) {
	if (!previous)
		return (
			<span className="text-[11px] text-[#8992a3]">
				{value ? "First activity this period" : "No activity this period"}
			</span>
		);
	const change = ((value - previous) / previous) * 100;
	return (
		<span
			className={`inline-flex items-center gap-1 text-[11px] ${change < 0 ? "text-[#b66b44]" : "text-[#168577]"}`}
		>
			{change < 0 ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
			{Math.abs(change).toFixed(1)}%{" "}
			<span className="ml-1 text-[#8992a3]">vs. previous period</span>
		</span>
	);
}

function Metric({
	title,
	value,
	icon,
	footer,
	points,
}: {
	title: string;
	value: string;
	icon: ReactNode;
	footer: ReactNode;
	points?: number[];
}) {
	const max = Math.max(...(points || []), 1);
	return (
		<article className={`${card} min-w-0 p-5`}>
			<div className="flex items-center justify-between text-xs text-[#596277]">
				<span>{title}</span>
				<span className="text-[#8690a4]">{icon}</span>
			</div>
			<div className="my-4 flex items-center justify-between gap-3">
				<strong className="text-[clamp(18px,2vw,29px)] font-semibold tracking-[-.04em] text-[#202735]">
					{value}
				</strong>
				{points && points.length > 1 && value.length <= 12 && (
					<svg
						className="hidden h-10 w-20 shrink-0 2xl:block"
						viewBox="0 0 90 40"
						aria-hidden="true"
					>
						<polyline
							points={points
								.map(
									(p, i) =>
										`${(i / (points.length - 1)) * 88},${37 - (p / max) * 33}`,
								)
								.join(" ")}
							fill="none"
							stroke="#148477"
							strokeWidth="1.5"
						/>
					</svg>
				)}
			</div>
			{footer}
		</article>
	);
}

function dailyValues(rows: RevenueDay[], start: string, days: number) {
	const values = new Map(rows.map((row) => [row.date, row.revenue]));
	return Array.from({ length: days }, (_, i) => {
		const date = new Date(`${start}T00:00:00Z`);
		date.setUTCDate(date.getUTCDate() + i);
		return values.get(date.toISOString().slice(0, 10)) || 0;
	});
}

function RevenueChart({ data, days }: { data: AdminOverview; days: number }) {
	const [weekly, setWeekly] = useState(false);
	const previousStart = new Date(`${data.from}T00:00:00Z`);
	previousStart.setUTCDate(previousStart.getUTCDate() - days);
	let current = dailyValues(data.revenue, data.from, days);
	let previous = dailyValues(
		data.previousRevenue,
		previousStart.toISOString().slice(0, 10),
		days,
	);
	const aggregate = (values: number[]) =>
		Array.from({ length: Math.ceil(values.length / 7) }, (_, i) =>
			values.slice(i * 7, i * 7 + 7).reduce((a, b) => a + b, 0),
		);
	if (weekly) {
		current = aggregate(current);
		previous = aggregate(previous);
	}
	const max = Math.max(...current, ...previous, 1) * 1.15;
	const line = (values: number[]) =>
		values.length === 1
			? `M50,${190 - (values[0] / max) * 160} L720,${190 - (values[0] / max) * 160}`
			: values
					.map(
						(value, i) =>
							`${i ? "L" : "M"}${50 + (i / (values.length - 1)) * 670},${190 - (value / max) * 160}`,
					)
					.join(" ");
	return (
		<section
			id="revenue"
			className={`${card} scroll-mt-6 p-5 md:p-6`}
			aria-labelledby="revenue-title"
		>
			<div className="flex items-start justify-between gap-4">
				<div>
					<h2 id="revenue-title" className="text-sm font-semibold">
						Revenue performance
					</h2>
					<p className="mt-1 text-[11px] text-[#8a93a5]">
						A bigger picture, one booking at a time.
					</p>
				</div>
				<div className="flex rounded-md bg-[#f4f5f8] p-1">
					{[false, true].map((value) => (
						<button
							key={String(value)}
							aria-pressed={weekly === value}
							onClick={() => setWeekly(value)}
							className={`rounded border-0 px-3 py-1.5 text-[11px] ${weekly === value ? "bg-white text-[#354056] shadow-sm" : "bg-transparent text-[#8a93a5]"}`}
						>
							{value ? "Weekly" : "Daily"}
						</button>
					))}
				</div>
			</div>
			<div className="mt-4 flex flex-wrap items-center justify-between gap-3">
				<div className="flex flex-wrap items-center gap-3">
					<strong className="text-2xl font-semibold tracking-[-.04em]">
						{money(data.current.revenue)}
					</strong>
					<Change
						value={data.current.revenue}
						previous={data.previous.revenue}
					/>
				</div>
				<div className="flex gap-4 text-[10px] text-[#8a93a5]">
					<span>
						<span className="mr-1.5 inline-block w-3 border-t border-solid border-[#148477]" />
						This period
					</span>
					<span>
						<span className="mr-1.5 inline-block w-3 border-t border-dashed border-[#a9b8c9]" />
						Previous period
					</span>
				</div>
			</div>
			<svg
				viewBox="0 0 740 225"
				className="mt-3 block w-full"
				role="img"
				aria-label={`${weekly ? "Weekly" : "Daily"} confirmed booking revenue in VND, compared with the previous period`}
			>
				<defs>
					<linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor="#148477" stopOpacity=".16" />
						<stop offset="100%" stopColor="#148477" stopOpacity="0" />
					</linearGradient>
				</defs>
				{[0, 1, 2, 3, 4].map((i) => (
					<g key={i}>
						<line
							x1="50"
							y1={190 - i * 40}
							x2="720"
							y2={190 - i * 40}
							stroke="#edf0f4"
						/>
						<text x="3" y={194 - i * 40} fontSize="10" fill="#939bad">
							{compact((max * i) / 4)}
						</text>
					</g>
				))}
				<path
					d={`${line(current)} L720,190 L50,190 Z`}
					fill="url(#revenue-fill)"
				/>
				<path
					d={line(previous)}
					fill="none"
					stroke="#b7c4d2"
					strokeDasharray="4 5"
					strokeWidth="1.5"
				/>
				<path
					d={line(current)}
					fill="none"
					stroke="#148477"
					strokeWidth="2.2"
					strokeLinejoin="round"
				/>
				{[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
					const date = new Date(`${data.from}T00:00:00Z`);
					date.setUTCDate(
						date.getUTCDate() + Math.round((days - 1) * fraction),
					);
					return (
						<text
							key={fraction}
							x={50 + 670 * fraction}
							y="218"
							textAnchor={
								fraction === 0 ? "start" : fraction === 1 ? "end" : "middle"
							}
							fontSize="10"
							fill="#939bad"
						>
							{dateLabel(date.toISOString())}
						</text>
					);
				})}
			</svg>
			<div className="mt-2 border-0 border-t border-solid border-[#edf0f4] pt-3 text-[10px] text-[#8a93a5]">
				{data.current.revenue
					? "Confirmed bookings only"
					: "No confirmed VND revenue in this period"}{" "}
				<span className="mx-2">·</span> All amounts in VND{" "}
				<span className="mx-2">·</span> Vietnam time
			</div>
		</section>
	);
}

function GenreChart({ data }: { data: AdminOverview }) {
	const total = data.genres.reduce((sum, genre) => sum + genre.seats, 0);
	const genres = data.genres.slice(0, 4);
	if (data.genres.length > 4)
		genres.push({
			name: "Other genres",
			seats: data.genres.slice(4).reduce((sum, genre) => sum + genre.seats, 0),
		});

	return (
		<section
			className={`${card} flex flex-col p-5 md:p-6`}
			aria-labelledby="genre-title"
		>
			<h2 id="genre-title" className="text-sm font-semibold">
				What fills the seats
			</h2>
			<p className="mt-1 text-[11px] text-[#8a93a5]">
				Purchased seats by primary movie genre
			</p>
			<div className="my-auto flex items-center justify-center gap-5 py-6">
				<div className="relative h-36 w-36 shrink-0">
					<svg
						viewBox="0 0 120 120"
						className="h-full w-full -rotate-90"
						role="img"
						aria-label={
							genres.map((g) => `${g.name}: ${g.seats} seats`).join(", ") ||
							"No purchased seats"
						}
					>
						<circle
							cx="60"
							cy="60"
							r="49"
							fill="none"
							stroke="#edf0f4"
							strokeWidth="12"
						/>
						{genres.map((genre, i) => {
							const length = (genre.seats / total) * 307.88;
							const start =
								(genres
									.slice(0, i)
									.reduce((sum, entry) => sum + entry.seats, 0) /
									total) *
								307.88;
							return (
								<circle
									key={genre.name}
									cx="60"
									cy="60"
									r="49"
									fill="none"
									stroke={colors[i]}
									strokeWidth="12"
									strokeDasharray={`${Math.max(0, length - 2)} ${307.88 - Math.max(0, length - 2)}`}
									strokeDashoffset={-start}
								/>
							);
						})}
					</svg>
					<div className="absolute inset-0 flex flex-col items-center justify-center">
						<strong className="text-2xl font-semibold">{compact(total)}</strong>
						<span className="mt-1 text-[10px] text-[#8a93a5]">
							seats booked
						</span>
					</div>
				</div>
				<div className="min-w-0 flex-1 space-y-4">
					{genres.length ? (
						genres.map((genre, i) => (
							<div
								key={genre.name}
								className="flex items-center justify-between gap-2 text-[11px]"
							>
								<span className="flex min-w-0 items-center gap-2 text-[#697387]">
									<span
										className="h-1.5 w-1.5 shrink-0 rounded-full"
										style={{ background: colors[i] }}
									/>
									<span className="truncate">{genre.name}</span>
								</span>
								<strong className="font-medium">
									{Math.round((genre.seats / total) * 100)}%
								</strong>
							</div>
						))
					) : (
						<p className="text-xs leading-5 text-[#8992a3]">
							Genre insights will appear after the first confirmed booking.
						</p>
					)}
				</div>
			</div>
			<div className="flex items-center gap-2 rounded-md bg-[#eaf5f1] px-3 py-3 text-[10px] leading-4 text-[#278b7f]">
				<TrendingUp size={15} className="shrink-0" />
				{genres.length
					? `${genres[0].name} leads the way this period.`
					: "Every movie night starts with a first booking."}
			</div>
		</section>
	);
}

const statusStyles: Record<string, string> = {
	CONFIRMED: "bg-[#e7f5f0] text-[#268a78]",
	HELD: "bg-[#fff4df] text-[#b18c46]",
	EXPIRED: "bg-[#f0f2f6] text-[#7d8799]",
	CANCELLED: "bg-[#fbecea] text-[#ba756a]",
	REVERSAL_PENDING: "bg-[#fff4df] text-[#b18c46]",
	REVERSED: "bg-[#f0f2f6] text-[#7d8799]",
};

function RecentBookings({
	data,
	query,
}: {
	data: AdminOverview;
	query: string;
}) {
	const rows = data.recentBookings.filter((row) =>
		`${row.id} ${row.customer} ${row.movie} ${row.status}`
			.toLowerCase()
			.includes(query.toLowerCase().trim()),
	);
	return (
		<section
			id="bookings"
			className={`${card} min-w-0 scroll-mt-6 overflow-hidden`}
			aria-labelledby="bookings-title"
		>
			<div className="p-5 pb-4">
				<h2
					id="bookings-title"
					className="flex items-center gap-2 text-sm font-semibold"
				>
					Recent bookings{" "}
					<span className="rounded bg-[#f1f3f7] px-1.5 py-0.5 text-[10px] font-normal text-[#8992a3]">
						{number(data.current.bookings)}
					</span>
				</h2>
				<p className="mt-1 text-[11px] text-[#8a93a5]">
					The latest seats reserved across your cinemas
				</p>
			</div>
			<div className="overflow-x-auto">
				<table className="w-full min-w-[630px] border-collapse text-left text-[11px]">
					<thead className="border-y border-solid border-[#edf0f4] bg-[#fafbfd] text-[10px] font-normal text-[#8a93a5]">
						<tr>
							{[
								"Booking ID",
								"Customer",
								"Movie",
								"Booked at",
								"Seats",
								"Amount",
								"Status",
							].map((label) => (
								<th key={label} className="px-4 py-3 font-normal">
									{label}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{rows.map((row) => (
							<tr
								key={row.id}
								className="border-0 border-b border-solid border-[#edf0f4] text-[#647087] hover:bg-[#fafbfd]"
							>
								<td
									className="px-4 py-4 font-medium text-[#354056]"
									title={row.id}
								>
									#{row.id.slice(0, 8).toUpperCase()}
								</td>
								<td className="px-4 py-4 text-[#354056]">{row.customer}</td>
								<td className="max-w-40 truncate px-4 py-4" title={row.movie}>
									{row.movie}
								</td>
								<td className="whitespace-nowrap px-4 py-4">
									{new Intl.DateTimeFormat("en-GB", {
										day: "2-digit",
										month: "short",
										hour: "2-digit",
										minute: "2-digit",
										timeZone: "Asia/Ho_Chi_Minh",
									}).format(new Date(row.createdAt))}
								</td>
								<td className="px-4 py-4">{row.seats}</td>
								<td className="whitespace-nowrap px-4 py-4">
									{money(row.amount, row.currency)}
								</td>
								<td className="px-4 py-4">
									<span
										className={`whitespace-nowrap rounded px-2 py-1 text-[9px] ${statusStyles[row.status] || statusStyles.EXPIRED}`}
									>
										{row.status.toLowerCase().replaceAll("_", " ")}
									</span>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			{!rows.length && (
				<p className="px-6 py-8 text-center text-xs text-[#8992a3]">
					{query
						? "No recent bookings match your search."
						: "No bookings yet in this period."}
				</p>
			)}
			<div className="flex items-center justify-between gap-3 px-5 py-4 text-[10px] text-[#8a93a5]">
				<span>
					Showing {rows.length} of the latest {data.recentBookings.length}{" "}
					bookings
				</span>
				<span>
					Updated{" "}
					{new Intl.DateTimeFormat("en-GB", {
						hour: "2-digit",
						minute: "2-digit",
						timeZone: "Asia/Ho_Chi_Minh",
					}).format(new Date(data.generatedAt))}{" "}
					ICT
				</span>
			</div>
		</section>
	);
}

function TopMovies({ data }: { data: AdminOverview }) {
	return (
		<section
			id="movies"
			className={`${card} scroll-mt-6 p-5 md:p-6`}
			aria-labelledby="movies-title"
		>
			<div className="flex items-center justify-between">
				<h2 id="movies-title" className="text-sm font-semibold">
					Top of the watchlist
				</h2>
				<span className="text-[9px] tracking-wider text-[#8a93a5]">SEATS</span>
			</div>
			<p className="mt-1 text-[11px] text-[#8a93a5]">
				Most booked movies this period
			</p>
			<div className="mt-5 space-y-4">
				{data.topMovies.map((movie, i) => (
					<div key={movie.id} className="flex items-center gap-3">
						<span
							className={`text-[11px] ${i === 0 ? "text-[#148477]" : "text-[#8a93a5]"}`}
						>
							{String(i + 1).padStart(2, "0")}
						</span>
						<div className="h-11 w-8 shrink-0 overflow-hidden rounded bg-[#e9edf2]">
							<img
								src={movie.poster}
								alt=""
								className="h-full w-full object-cover"
								onError={(event) => {
									event.currentTarget.style.visibility = "hidden";
								}}
							/>
						</div>
						<div className="min-w-0 flex-1">
							<p
								className="truncate text-xs text-[#354056]"
								title={movie.title}
							>
								{movie.title}
							</p>
							<p className="mt-1 text-[10px] text-[#8a93a5]">{movie.genre}</p>
						</div>
						<strong className="text-xs font-medium">
							{number(movie.seats)}
						</strong>
					</div>
				))}
			</div>
			{!data.topMovies.length && (
				<div className="grid min-h-48 place-items-center text-center text-xs leading-5 text-[#8992a3]">
					<div>
						<Clapperboard size={26} className="mb-3 text-[#b4bdca]" />
						<p>
							Confirmed bookings will bring
							<br />
							your top movies into focus.
						</p>
					</div>
				</div>
			)}
			<a
				href="#revenue"
				className="mt-5 flex items-center gap-2 border-0 border-t border-solid border-[#edf0f4] pt-4 text-[11px] text-[#148477] no-underline hover:underline"
			>
				Explore revenue performance <ArrowUpRight size={13} />
			</a>
		</section>
	);
}

function exportReport(data: AdminOverview) {
	// Prefix spreadsheet formulas; quote every field, including user-controlled titles and names.
	const cell = (value: string | number) =>
		`"${String(value)
			.replace(/^[\s=+@-]/, "'$&")
			.replaceAll('"', '""')}"`;
	const rows = [
		["Report period", data.from, data.through],
		["Total users", data.users],
		["Active movies", data.activeMovies],
		["Bookings", data.current.bookings],
		["Confirmed revenue", data.current.revenue, "VND"],
		[],
		["Date", "Confirmed revenue (VND)"],
		...data.revenue.map((day) => [day.date, day.revenue]),
		[],
		[
			"Recent booking ID",
			"Customer",
			"Movie",
			"Booked at",
			"Seats",
			"Amount",
			"Currency",
			"Status",
		],
		...data.recentBookings.map((row) => [
			row.id,
			row.customer,
			row.movie,
			row.createdAt,
			row.seats,
			row.amount,
			row.currency,
			row.status,
		]),
	];
	const url = URL.createObjectURL(
		new Blob(
			["\uFEFF" + rows.map((row) => row.map(cell).join(",")).join("\r\n")],
			{ type: "text/csv;charset=utf-8;" },
		),
	);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = `cinema-report-${data.from}-${data.through}.csv`;
	anchor.click();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function DashboardReport({ days, query }: { days: number; query: string }) {
	const store = useAdminDataStore();
	const { data, error, loading, refresh } = useAdminResource(
		store.overview(days),
	);
	return (
		<>
			<div className="mb-6 flex flex-wrap items-center justify-between gap-4">
				<div>
					<div className="flex items-center gap-3">
						<h1 className="text-[27px] font-semibold tracking-[-.035em]">
							The big picture
						</h1>
						<span className="rounded bg-[#e9edf2] px-2 py-1 text-[9px] font-semibold tracking-wide text-[#697387]">
							OVERVIEW
						</span>
					</div>
					<p className="mt-2 text-xs text-[#8a93a5]">
						Your audience, your stories, your growth. All in one frame.
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					{data && (
						<span className={`${quietButton} cursor-default`}>
							<CalendarDays size={14} />
							{dateLabel(data.from)} – {dateLabel(data.through)},{" "}
							{data.through.slice(0, 4)}
						</span>
					)}
					<button
						disabled={!data}
						onClick={() => data && exportReport(data)}
						className="inline-flex items-center gap-2 rounded-md border-0 bg-[#148477] px-4 py-2.5 text-xs text-white hover:bg-[#106e64] disabled:cursor-wait disabled:opacity-50"
					>
						<Download size={14} />
						Export report
					</button>
				</div>
			</div>
			{!data && !error && (
				<div
					className={`${card} grid min-h-72 place-items-center text-sm text-[#8992a3]`}
					role="status"
				>
					Loading your cinema overview…
				</div>
			)}
			{!data && error && (
				<div className={`${card} p-8 text-center`} role="alert">
					<p className="mb-4 text-sm text-[#697387]">
						{error instanceof Error
							? error.message
							: "Dashboard data could not be loaded."}
					</p>
					<button className={quietButton} onClick={refresh}>
						Try again
					</button>
				</div>
			)}
			{data && (
				<AdminRefreshNotice loading={loading} error={error} retry={refresh} />
			)}
			{data && (
				<div className="admin-dashboard-data space-y-5">
					<div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
						<Metric
							title="Total users"
							value={number(data.users)}
							icon={<Users size={16} />}
							footer={
								<span className="text-[11px] text-[#8992a3]">
									Registered accounts · all time
								</span>
							}
						/>
						<Metric
							title="Active movies"
							value={number(data.activeMovies)}
							icon={<Clapperboard size={16} />}
							footer={
								<span className="text-[11px] text-[#8992a3]">
									In your active catalog
								</span>
							}
						/>
						<Metric
							title="Total bookings"
							value={number(data.current.bookings)}
							icon={<Ticket size={16} />}
							footer={
								<Change
									value={data.current.bookings}
									previous={data.previous.bookings}
								/>
							}
						/>
						<Metric
							title="Total revenue"
							value={compactMoney(data.current.revenue)}
							icon={<Wallet size={16} />}
							footer={
								<Change
									value={data.current.revenue}
									previous={data.previous.revenue}
								/>
							}
							points={dailyValues(data.revenue, data.from, days)}
						/>
					</div>
					<div className="grid items-stretch gap-5 min-[1150px]:grid-cols-[minmax(0,1.75fr)_minmax(300px,1fr)]">
						<RevenueChart data={data} days={days} />
						<GenreChart data={data} />
					</div>
					<div className="grid items-start gap-5 min-[1150px]:grid-cols-[minmax(0,1.75fr)_minmax(300px,1fr)]">
						<RecentBookings data={data} query={query} />
						<TopMovies data={data} />
					</div>
					<p className="text-center text-[10px] text-[#9aa2b1]">
						A little perspective for your next big picture.{" "}
						<span className="mx-1">·</span> Admin workspace
					</p>
				</div>
			)}
		</>
	);
}

export default function AdminDashboard({ user }: { user: SessionUser }) {
	const store = useAdminDataStore();
	const [query, setQuery] = useState("");
	const [mobileMenu, setMobileMenu] = useState(false);
	const { pathname } = useLocation();
	const active =
		pathname === "/admin/movies"
			? "movies"
			: pathname === "/admin/users"
				? "users"
				: pathname === "/admin/bookings"
					? "bookings"
					: "overview";
	const [loggingOut, setLoggingOut] = useState(false);
	const [logoutError, setLogoutError] = useState("");
	const navigate = useNavigate();
	async function logout() {
		setLoggingOut(true);
		setLogoutError("");
		try {
			await signOut();
			navigate("/login", { replace: true });
		} catch {
			setLogoutError("Sign out failed. Please try again.");
			setLoggingOut(false);
		}
	}
	const initials = user.fullName
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0])
		.join("");
	return (
		<div className="admin-dashboard flex h-dvh overflow-hidden bg-[#f5f6fa] font-[Arial,Helvetica,sans-serif] text-[#252c3b] [&_h1]:m-0 [&_h2]:m-0 [&_p]:mb-0 [&_p]:mt-0 [&_svg]:shrink-0">
			{mobileMenu && (
				<button
					aria-label="Close navigation"
					className="fixed inset-0 z-30 border-0 bg-black/40 md:hidden"
					onClick={() => setMobileMenu(false)}
				/>
			)}
			<aside
				aria-label="Admin navigation"
				className={`${mobileMenu ? "flex" : "hidden"} fixed inset-y-0 left-0 z-40 w-[216px] shrink-0 flex-col bg-[#111821] text-[#8a94a5] md:static md:flex`}
			>
				<Link
					to="/admin"
					className="flex h-20 items-center gap-2.5 px-6 text-[22px] tracking-[-.035em] text-[#f6f8fb] no-underline"
				>
					<span className="grid h-7 w-7 place-items-center rounded-lg bg-[#8cd1bb] text-[#153d35]">
						<Clapperboard size={17} />
					</span>
					<span className="flex flex-col leading-tight">
						<strong className="whitespace-nowrap text-[15px]">THE LUMIÈRE</strong>
						<small className="mt-1 text-[8px] tracking-[.12em]">CINÉMATHÈQUE</small>
					</span>
					<span className="sr-only">Admin dashboard</span>
				</Link>
				<p className="px-6 pb-3 pt-6 text-[9px] tracking-[.12em] text-[#647084]">
					WORKSPACE
				</p>
				<nav aria-label="Workspace sections" className="space-y-1 px-3">
					{[
						{
							id: "overview",
							label: "Overview",
							to: "/admin",
							icon: LayoutDashboard,
						},
						{
							id: "movies",
							label: "Movie",
							to: "/admin/movies",
							icon: Clapperboard,
						},
						{ id: "users", label: "User", to: "/admin/users", icon: Users },
						{
							id: "bookings",
							label: "Booking",
							to: "/admin/bookings",
							icon: Ticket,
						},
					].map((item) => (
						<Link
							key={item.id}
							to={item.to}
							aria-current={active === item.id ? "page" : undefined}
							onClick={() => setMobileMenu(false)}
							onPointerEnter={() => store.prefetch(item.id)}
							onFocus={() => store.prefetch(item.id)}
							className={`flex items-center gap-3 rounded-md px-3 py-3 text-xs no-underline transition-colors ${active === item.id ? "bg-[#1d3c37] text-[#dff5ed]" : "text-[#8a94a5] hover:bg-[#1a2431] hover:text-white"}`}
						>
							<item.icon size={17} />
							{item.label}
						</Link>
					))}
				</nav>
				<p className="px-6 pb-3 pt-9 text-[9px] tracking-[.12em] text-[#647084]">
					PLATFORM
				</p>
				<Link
					to="/"
					className="mx-3 flex items-center gap-3 rounded-md px-3 py-3 text-xs text-[#8a94a5] no-underline hover:bg-[#1a2431] hover:text-white"
				>
					<ArrowLeft size={17} />
					Back to cinema
				</Link>
				<div className="mt-auto p-3">
					<div className="rounded-lg border border-solid border-[#263241] bg-[#1b2430] p-3">
						<div className="flex items-center gap-2 text-[10px] text-[#dce7e4]">
							<ShieldCheck size={14} className="text-[#8cd1bb]" />
							Admin access
						</div>
						<p className="pt-2 text-[10px] leading-4 text-[#8491a3]">
							Your workspace is protected
							<br />
							by your account permissions.
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2.5 border-0 border-t border-solid border-[#25303e] px-4 py-4">
					<span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#d9cbb7] text-[11px] text-[#413a31]">
						{initials}
					</span>
					<div className="min-w-0 flex-1">
						<p className="truncate text-[11px] text-[#e3e7ed]">
							{user.fullName}
						</p>
						<p className="pt-1 text-[10px]">Administrator</p>
					</div>
					<button
						aria-label="Sign out"
						disabled={loggingOut}
						onClick={logout}
						className="border-0 bg-transparent p-1 text-[#8a94a5] hover:text-white disabled:opacity-40"
					>
						<LogOut size={15} />
					</button>
				</div>
				{logoutError && (
					<p role="alert" className="px-4 pb-4 text-[11px] text-[#f2b6aa]">
						{logoutError}
					</p>
				)}
			</aside>
			<div className="flex min-w-0 flex-1 flex-col">
				<header className="flex min-h-16 shrink-0 items-center justify-between gap-4 border-0 border-b border-solid border-[#e6e9ef] bg-white px-5 md:px-7">
					<div className="flex items-center gap-3">
						<button
							aria-label={
								mobileMenu ? "Close admin navigation" : "Open admin navigation"
							}
							aria-expanded={mobileMenu}
							className="border-0 bg-transparent p-1 text-[#697387] md:hidden"
							onClick={() => setMobileMenu(!mobileMenu)}
						>
							{mobileMenu ? <X size={20} /> : <Menu size={20} />}
						</button>
						<span className="hidden text-[11px] text-[#8a93a5] sm:block">
							Workspace <span className="mx-2 text-[#c2c9d4]">/</span>
							<span className="text-[#354056]">
								{active === "overview"
									? "Overview"
									: active === "movies"
										? "Movie"
										: active === "users"
											? "User"
											: "Booking"}
							</span>
						</span>
					</div>
					<div className="flex min-w-0 items-center gap-5">
						{active === "overview" && (
							<label className="flex w-44 items-center gap-2 rounded-md border border-solid border-[#e6e9ef] bg-[#fafbfd] px-3 py-2 text-[#939bad] sm:w-60">
								<Search size={13} />
								<input
									type="search"
									aria-label="Search recent bookings"
									placeholder="Search recent bookings…"
									value={query}
									onChange={(event) => setQuery(event.target.value)}
									className="w-full min-w-0 border-0 bg-transparent text-[11px] text-[#566178] outline-none"
								/>
							</label>
						)}
						<span className="hidden items-center gap-1.5 whitespace-nowrap text-[10px] text-[#697387] lg:flex">
							<span className="h-1.5 w-1.5 rounded-full bg-[#148477]" />
							Admin workspace
						</span>
					</div>
				</header>
				<main className="min-h-0 flex-1 overflow-y-auto scroll-smooth p-4 md:p-7">
					<div className="mx-auto max-w-[1600px]">
						<Outlet context={{ user, query }} />
					</div>
				</main>
			</div>
		</div>
	);
}

export function AdminOverviewPanel() {
	const [days, setDays] = useState(30);
	const { query } = useOutletContext<{ query: string }>();
	return (
		<section id="overview">
			<div className="mb-4 flex justify-end">
				<label className="inline-flex items-center gap-2 text-[11px] text-[#697387]">
					<CalendarDays size={13} />
					<span>Period</span>
					<select
						aria-label="Dashboard period"
						value={days}
						onChange={(event) => setDays(Number(event.target.value))}
						className="rounded-md border border-solid border-[#e2e7ef] bg-white px-2 py-1.5 text-[11px] text-[#566178]"
					>
						<option value={7}>Last 7 days</option>
						<option value={30}>Last 30 days</option>
						<option value={90}>Last 90 days</option>
					</select>
					<ChevronDown size={12} aria-hidden="true" />
				</label>
			</div>
			<DashboardReport key={days} days={days} query={query} />
		</section>
	);
}
