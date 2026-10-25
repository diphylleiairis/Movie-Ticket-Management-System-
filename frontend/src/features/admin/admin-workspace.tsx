import { useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Search } from "lucide-react";
import {
	AdminAccessError,
	updateAdminUser,
	type AdminUser,
} from "../../api/admin-api";
import { type SessionUser } from "../../api/identity-api";
import { useAdminDataStore, useAdminResource } from "./admin-data";

const button =
	"rounded-lg border border-solid border-[#dce3e9] bg-white px-4 py-2 text-xs text-[#344355] hover:bg-[#edf7f3] disabled:cursor-not-allowed disabled:opacity-40";
const cell =
	"border-0 border-b border-solid border-[#edf0f4] px-5 py-4 text-left text-xs";
const date = (value: string) =>
	new Date(value).toLocaleString("en-GB", {
		timeZone: "Asia/Ho_Chi_Minh",
		dateStyle: "medium",
		timeStyle: "short",
	});

function Status({ value }: { value: string }) {
	return (
		<span
			className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold ${["ACTIVE", "CONFIRMED"].includes(value) ? "bg-[#e4f5ee] text-[#167354]" : ["SUSPENSE", "DISABLED", "CANCELLED"].includes(value) ? "bg-[#fcebe8] text-[#ac4034]" : "bg-[#f0f2f6] text-[#657084]"}`}
		>
			{value}
		</span>
	);
}

function Pagination({
	data,
	onPage,
}: {
	data: { page: number; size: number; total: number };
	onPage: (page: number) => void;
}) {
	return (
		<div className="flex flex-wrap items-center justify-between gap-3 p-5 text-xs text-[#697387]">
			<span>
				{data.total.toLocaleString()} records · Page {data.page + 1} of{" "}
				{Math.max(1, Math.ceil(data.total / data.size))}
			</span>
			<div className="flex gap-2">
				<button
					className={button}
					disabled={data.page === 0}
					onClick={() => onPage(data.page - 1)}
				>
					Previous
				</button>
				<button
					className={button}
					disabled={(data.page + 1) * data.size >= data.total}
					onClick={() => onPage(data.page + 1)}
				>
					Next
				</button>
			</div>
		</div>
	);
}

function LoadState({ error, retry }: { error: unknown; retry: () => void }) {
	return error ? (
		<div role="alert" className="rounded-xl bg-white p-6 text-sm">
			<p>
				{error instanceof Error ? error.message : "Data could not be loaded."}
			</p>
			<button className={`${button} mt-3`} onClick={retry}>
				Try again
			</button>
		</div>
	) : (
		<p role="status" className="p-6 text-sm text-[#697387]">
			Loading records…
		</p>
	);
}

export function AdminRefreshNotice({
	loading,
	error,
	retry,
}: {
	loading: boolean;
	error: unknown;
	retry: () => void;
}) {
	if (error)
		return (
			<div
				role="alert"
				className="flex items-center gap-3 p-4 text-xs text-[#9c5e26]"
			>
				Unable to refresh. Showing the last loaded data.
				<button className={button} onClick={retry}>
					Try again
				</button>
			</div>
		);
	return loading ? (
		<p role="status" className="p-4 text-xs text-[#697387]">
			Updating…
		</p>
	) : null;
}

function UpdateUser({
	user,
	close,
	saved,
	denied,
}: {
	user: AdminUser;
	close: () => void;
	saved: (status: "ACTIVE" | "SUSPENSE") => void;
	denied: (error: AdminAccessError) => void;
}) {
	const ref = useRef<HTMLDialogElement>(null);
	const [status, setStatus] = useState<"ACTIVE" | "SUSPENSE">(
		user.status === "SUSPENSE" ? "SUSPENSE" : "ACTIVE",
	);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	useEffect(() => {
		const dialog = ref.current;
		dialog?.showModal();
		return () => dialog?.close();
	}, []);
	async function submit(event: React.SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		if (saving) return;
		setSaving(true);
		setError("");
		try {
			await updateAdminUser(user.id, status);
			saved(status);
		} catch (failure) {
			if (failure instanceof AdminAccessError) denied(failure);
			else {
				setError(
					failure instanceof Error
						? failure.message
						: "The user could not be updated. Please try again.",
				);
				setSaving(false);
			}
		}
	}
	return (
		<dialog
			ref={ref}
			aria-labelledby="update-user-title"
			onCancel={(event) => {
				event.preventDefault();
				if (!saving) close();
			}}
			className="w-[min(420px,calc(100%-40px))] rounded-2xl border-0 p-6 text-[#283647] shadow-2xl backdrop:bg-black/50"
		>
			<form onSubmit={submit}>
				<h2 id="update-user-title" className="mt-0 text-xl">
					Update user
				</h2>
				<p className="break-words text-sm">{user.fullName}</p>
				<p className="break-all text-xs text-[#697387]">{user.email}</p>
				<label className="mt-5 block text-sm">
					Status
					<select
						aria-label="User status"
						value={status}
						disabled={saving}
						onChange={(event) =>
							setStatus(event.target.value as "ACTIVE" | "SUSPENSE")
						}
						className="mt-2 block w-full rounded-lg border border-solid border-[#dce3e9] bg-white p-3"
					>
						<option value="ACTIVE">ACTIVE</option>
						<option value="SUSPENSE">SUSPENSE</option>
					</select>
				</label>
				<p className="text-xs leading-5 text-[#697387]">
					SUSPENSE blocks password and Google sign-in. Existing sessions expire
					on their next request.
				</p>
				{error && (
					<p role="alert" className="text-sm text-[#b23f31]">
						{error}
					</p>
				)}
				<div className="mt-6 flex justify-end gap-2">
					<button
						type="button"
						className={button}
						disabled={saving}
						onClick={close}
					>
						Cancel
					</button>
					<button
						type="submit"
						className={`${button} bg-[#137f73] text-white`}
						disabled={saving || status === user.status}
					>
						{saving ? "Saving…" : "Save changes"}
					</button>
				</div>
			</form>
		</dialog>
	);
}

function UsersTable({
	page,
	query,
	currentId,
	onPage,
}: {
	page: number;
	query: string;
	currentId: string;
	onPage: (page: number) => void;
}) {
	const store = useAdminDataStore();
	const { data, error, loading, refresh } = useAdminResource(
		store.users(page, query),
	);
	const [selected, setSelected] = useState<AdminUser | null>(null);
	const [notice, setNotice] = useState("");
	if (!data) return <LoadState error={error} retry={refresh} />;
	return (
		<section
			id="users-panel"
			aria-label="Users"
			className="overflow-hidden rounded-xl border border-solid border-[#e4e9ef] bg-white"
		>
			{notice && (
				<p
					role="status"
					className="border-0 border-b border-solid border-[#e4e9ef] p-4 text-sm text-[#167354]"
				>
					{notice}
				</p>
			)}
			<AdminRefreshNotice loading={loading} error={error} retry={refresh} />
			<div className="overflow-x-auto">
				<table className="w-full border-collapse">
					<thead className="bg-[#fafbfd] text-[#697387]">
						<tr>
							{[
								"User",
								"Role",
								"Status",
								"Registered (Vietnam time)",
								"Actions",
							].map((label) => (
								<th className={cell} key={label}>
									{label}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{data.items.map((user) => (
							<tr key={user.id}>
								<td className={cell}>
									<span className="block whitespace-nowrap font-semibold">
										{user.fullName}
									</span>
									<span className="mt-1 block text-[#7c8799]">
										{user.email}
									</span>
								</td>
								<td className={`${cell} whitespace-nowrap`}>{user.role}</td>
								<td className={cell}>
									<Status value={user.status} />
								</td>
								<td className={`${cell} whitespace-nowrap`}>
									{date(user.createdAt)}
								</td>
								<td className={cell}>
									<button
										className={button}
										aria-label={`Update ${user.email}`}
										disabled={
											user.id === currentId ||
											user.status === "PENDING_VERIFICATION"
										}
										title={
											user.id === currentId
												? "You cannot change your own status"
												: user.status === "PENDING_VERIFICATION"
													? "Email verification is required first"
													: "Update account status"
										}
										onClick={() => {
											setSelected(user);
											setNotice("");
										}}
									>
										Update
									</button>
								</td>
							</tr>
						))}
						{!data.items.length && (
							<tr>
								<td
									className={`${cell} py-12 text-center text-[#7c8799]`}
									colSpan={5}
								>
									No users found.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
			<Pagination data={data} onPage={onPage} />
			{selected && (
				<UpdateUser
					key={selected.id}
					user={selected}
					close={() => setSelected(null)}
					denied={store.deny}
					saved={(status) => {
						store.userUpdated(selected.id, status);
						setNotice(`${selected.fullName} updated to ${status}.`);
						setSelected(null);
					}}
				/>
			)}
		</section>
	);
}

function BookingsTable({
	page,
	onPage,
}: {
	page: number;
	onPage: (page: number) => void;
}) {
	const store = useAdminDataStore();
	const { data, error, loading, refresh } = useAdminResource(
		store.bookings(page),
	);
	if (!data) return <LoadState error={error} retry={refresh} />;
	return (
		<section
			id="bookings-panel"
			aria-label="Bookings"
			className="overflow-hidden rounded-xl border border-solid border-[#e4e9ef] bg-white"
		>
			<AdminRefreshNotice loading={loading} error={error} retry={refresh} />
			<div className="overflow-x-auto">
				<table className="w-full border-collapse">
					<thead className="bg-[#fafbfd] text-[#697387]">
						<tr>
							{[
								"Booking ID",
								"Customer",
								"Movie",
								"Seats",
								"Total",
								"Status",
								"Created (Vietnam time)",
							].map((label) => (
								<th key={label} className={cell}>
									{label}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{data.items.map((booking) => (
							<tr key={booking.id}>
								<td className={`${cell} font-mono text-[10px]`}>
									{booking.id}
								</td>
								<td className={`${cell} whitespace-nowrap`}>
									{booking.customer}
								</td>
								<td className={`${cell} min-w-40`}>{booking.movie}</td>
								<td className={cell}>{booking.seats}</td>
								<td className={`${cell} whitespace-nowrap`}>
									{new Intl.NumberFormat("vi-VN", {
										style: "currency",
										currency: booking.currency,
									}).format(booking.amount)}
								</td>
								<td className={cell}>
									<Status value={booking.status} />
								</td>
								<td className={`${cell} whitespace-nowrap`}>
									{date(booking.createdAt)}
								</td>
							</tr>
						))}
						{!data.items.length && (
							<tr>
								<td
									colSpan={7}
									className={`${cell} py-12 text-center text-[#7c8799]`}
								>
									No bookings yet.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
			<Pagination data={data} onPage={onPage} />
		</section>
	);
}

export function AdminUsersPanel() {
	const { user } = useOutletContext<{ user: SessionUser }>();
	const [page, setPage] = useState(0);
	const [query, setQuery] = useState("");
	const [search, setSearch] = useState("");
	return (
		<>
			<h1 className="text-2xl font-semibold">User management</h1>
			<p className="pt-2 pb-6 text-sm text-[#7c8799]">
				Manage account access and status.
			</p>
			<form
				className="mb-5 flex max-w-lg gap-2"
				onSubmit={(event) => {
					event.preventDefault();
					setQuery(search.trim());
					setPage(0);
				}}
			>
				<label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-solid border-[#dce3e9] bg-white px-3">
					<Search size={16} className="text-[#7c8799]" />
					<input
						type="search"
						aria-label="Search users"
						placeholder="Search by name or email"
						maxLength={200}
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						className="min-w-0 flex-1 border-0 bg-transparent py-3 text-xs outline-none"
					/>
				</label>
				<button className={button}>Search</button>
			</form>
			<UsersTable
				key={page + ":" + query}
				page={page}
				query={query}
				currentId={user.id}
				onPage={setPage}
			/>
		</>
	);
}

export function AdminBookingsPanel() {
	const [page, setPage] = useState(0);
	return (
		<>
			<h1 className="text-2xl font-semibold">All bookings</h1>
			<p className="pt-2 pb-6 text-sm text-[#7c8799]">
				Bookings across all dates and statuses.
			</p>
			<BookingsTable key={page} page={page} onPage={setPage} />
		</>
	);
}
