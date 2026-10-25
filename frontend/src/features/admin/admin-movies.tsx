import { useEffect, useRef, useState, type ReactNode } from "react";
import { Clapperboard, ImagePlus, LoaderCircle, Plus, Search, Upload, X } from "lucide-react";
import { AdminAccessError, createAdminMovie, uploadAdminMoviePoster, type AdminMovie } from "../../api/admin-api";
import { useAdminDataStore, useAdminResource } from "./admin-data";
import { AdminRefreshNotice } from "./admin-workspace";

const button = "rounded-lg border border-solid border-[#dce3e9] bg-white px-4 py-2.5 text-xs text-[#344355] hover:bg-[#edf7f3] disabled:cursor-not-allowed disabled:opacity-40";
const primary = "inline-flex items-center justify-center gap-2 rounded-lg border-0 bg-[#148477] px-4 py-3 text-xs text-white hover:bg-[#106e64] disabled:cursor-not-allowed disabled:opacity-40";
const input = "mt-2 box-border block w-full rounded-lg border border-solid border-[#dce3e9] bg-white px-3 py-3 text-sm text-[#344355] outline-none focus:border-[#148477] disabled:bg-[#f5f6fa]";
const cell = "border-0 border-b border-solid border-[#edf0f4] px-5 py-4 text-left text-xs";

function slugify(title: string) {
	return title.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replaceAll("đ", "d").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
	return <div><label htmlFor={id} className="text-xs font-semibold text-[#566178]">{label}</label>{children}</div>;
}

function CreateMovie({ close, saved }: { close: () => void; saved: (movie: AdminMovie) => void }) {
	const store = useAdminDataStore();
	const dialog = useRef<HTMLDialogElement>(null);
	const mounted = useRef(false);
	const [values, setValues] = useState({ title: "", slug: "", description: "", duration: "", ageRating: "", posterUrl: "", releaseDate: "", genres: "" });
	const [slugEdited, setSlugEdited] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [uploading, setUploading] = useState(false);
	const [posterError, setPosterError] = useState("");
	const [posterNotice, setPosterNotice] = useState("");
	const [failedPreview, setFailedPreview] = useState("");
	const uploadRequest = useRef<AbortController | null>(null);
	let previewUrl = "";
	try {
		const url = new URL(values.posterUrl.trim());
		if (["http:", "https:"].includes(url.protocol) && !url.username && !url.password) previewUrl = url.href;
	} catch { /* Incomplete URLs keep the poster placeholder visible. */ }
	useEffect(() => {
		mounted.current = true; const element = dialog.current; element?.showModal();
		return () => { mounted.current = false; uploadRequest.current?.abort(); element?.close(); };
	}, []);
	async function upload(image: File | undefined) {
		if (!image || saving || uploading) return;
		setPosterError(""); setPosterNotice("");
		if (!["image/jpeg", "image/png", "image/webp"].includes(image.type) || !image.size || image.size > 5 * 1024 * 1024) {
			setPosterError("Choose a JPEG, PNG or WebP image up to 5 MB."); return;
		}
		const controller = new AbortController();
		uploadRequest.current = controller;
		setUploading(true);
		try {
			const posterUrl = await uploadAdminMoviePoster(image, AbortSignal.any([controller.signal, AbortSignal.timeout(180_000)]));
			if (!mounted.current || controller.signal.aborted) return;
			setValues(value => ({ ...value, posterUrl }));
			setPosterNotice("Poster uploaded. Ready to add your movie.");
		} catch (failure) {
			if (!mounted.current || controller.signal.aborted) return;
			if (failure instanceof AdminAccessError) store.deny(failure);
			else setPosterError(failure instanceof Error ? failure.message : "Poster upload failed. Please try again.");
		} finally {
			if (mounted.current && !controller.signal.aborted) setUploading(false);
		}
	}
	async function submit(event: React.SubmitEvent<HTMLFormElement>) {
		event.preventDefault(); if (saving || uploading) return;
		const genres = values.genres.split(",").map(value => value.trim()).filter(Boolean);
		if (!genres.length || genres.length > 10) { setError("Enter between 1 and 10 genres, separated by commas."); return; }
		setSaving(true); setError("");
		try {
			const movie = await createAdminMovie({ title: values.title.trim(), slug: values.slug.trim(), description: values.description.trim(),
				durationMinutes: Number(values.duration), ageRating: values.ageRating.trim(), posterUrl: values.posterUrl.trim(),
				releaseDate: values.releaseDate || null, genres });
			if (mounted.current) saved(movie);
		} catch (failure) {
			if (!mounted.current) return;
			if (failure instanceof AdminAccessError) store.deny(failure);
			else { setError(failure instanceof Error ? failure.message : "The movie could not be added. Please try again."); setSaving(false); }
		}
	}
	return <dialog ref={dialog} aria-labelledby="create-movie-title" onCancel={event => { event.preventDefault(); if (!saving) close(); }} className="m-auto box-border max-h-[90dvh] w-[calc(100%_-_32px)] max-w-[960px] overflow-y-auto rounded-2xl border border-solid border-[#dce3e9] bg-white p-5 text-[#283647] shadow-2xl backdrop:bg-black/50 sm:p-7">
		<div className="mb-5 flex items-start justify-between gap-4"><div><h2 id="create-movie-title" className="text-xl font-semibold">Add movie</h2><p className="pt-2 text-xs text-[#7c8799]">Add a film to your active catalog.</p></div><button type="button" aria-label="Close movie form" disabled={saving} onClick={close} className="border-0 bg-transparent p-1 text-[#7c8799]"><X size={20} /></button></div>
		<form onSubmit={submit}><fieldset disabled={saving} className="m-0 grid min-w-0 gap-6 border-0 p-0 md:grid-cols-[minmax(0,1fr)_minmax(220px,280px)]">
			<div className="min-w-0 space-y-4">
			<Field id="movie-title" label="Movie title"><input id="movie-title" className={input} required maxLength={200} value={values.title} onChange={event => { const title = event.target.value; setValues(value => ({ ...value, title, slug: slugEdited ? value.slug : slugify(title) })); }} autoFocus /></Field>
			<Field id="movie-slug" label="Slug"><input id="movie-slug" className={input} required maxLength={200} pattern="[a-z0-9]+(-[a-z0-9]+)*" title="Lowercase letters, numbers and hyphens" value={values.slug} onChange={event => { setSlugEdited(true); setValues(value => ({ ...value, slug: event.target.value })); }} /><p className="pt-1 text-[11px] text-[#7c8799]">Unique URL name, suggested from the title. You can edit it.</p></Field>
			<Field id="movie-description" label="Description"><textarea id="movie-description" className={`${input} min-h-24 resize-y`} required maxLength={10000} rows={3} value={values.description} onChange={event => setValues(value => ({ ...value, description: event.target.value }))} /></Field>
			<div className="grid gap-4 sm:grid-cols-2"><Field id="movie-duration" label="Duration (minutes)"><input id="movie-duration" className={input} type="number" required min={1} max={2147483647} step={1} value={values.duration} onChange={event => setValues(value => ({ ...value, duration: event.target.value }))} /></Field><Field id="movie-age-rating" label="Age rating"><input id="movie-age-rating" className={input} required maxLength={20} placeholder="e.g. T13" value={values.ageRating} onChange={event => setValues(value => ({ ...value, ageRating: event.target.value }))} /></Field></div>
			<Field id="movie-genres" label="Genres"><input id="movie-genres" className={input} required maxLength={810} placeholder="e.g. Drama, Adventure" value={values.genres} onChange={event => setValues(value => ({ ...value, genres: event.target.value }))} /><p className="pt-1 text-[11px] text-[#7c8799]">Separate genres with commas. Existing genres are reused.</p></Field>
			<Field id="movie-release-date" label="Release date (optional)"><input id="movie-release-date" className={input} type="date" value={values.releaseDate} onChange={event => setValues(value => ({ ...value, releaseDate: event.target.value }))} /></Field>
			</div>
			<section aria-label="Movie poster" className="min-w-0 rounded-xl border border-solid border-[#e4e9ef] bg-[#f8fafb] p-4">
				<h3 className="mb-3 mt-0 text-sm font-semibold">Movie poster</h3>
				<div className="relative mb-4 aspect-[2/3] overflow-hidden rounded-lg border border-solid border-[#dce3e9] bg-[#edf1f4]">
					{previewUrl && failedPreview !== previewUrl ? <img key={previewUrl} src={previewUrl} alt="Movie poster preview" referrerPolicy="no-referrer" className="h-full w-full object-cover" onError={() => setFailedPreview(previewUrl)} />
						: <div className="flex h-full flex-col items-center justify-center gap-3 px-5 text-center text-[#8896a6]"><ImagePlus size={36} strokeWidth={1.3} /><span className="text-xs leading-5">{previewUrl ? "Image could not be loaded. Check the URL or upload another image." : "Your poster preview will appear here."}</span></div>}
					{uploading && <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#f8fafb]/90 text-xs text-[#148477]"><LoaderCircle size={26} className="animate-spin" />Uploading poster…</div>}
				</div>
				<Field id="movie-poster" label="Poster URL"><input id="movie-poster" className={input} type="url" required disabled={uploading} maxLength={2048} placeholder="https://example.com/poster.jpg" value={values.posterUrl} onChange={event => { setValues(value => ({ ...value, posterUrl: event.target.value })); setPosterError(""); setPosterNotice(""); setFailedPreview(""); }} /></Field>
				<div className="my-3 flex items-center gap-3 text-[10px] uppercase tracking-wider text-[#93a0af]"><span className="h-px flex-1 bg-[#dce3e9]" />or upload an image<span className="h-px flex-1 bg-[#dce3e9]" /></div>
				<label className={`${button} flex items-center justify-center gap-2 ${uploading || saving ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
					<Upload size={15} />{uploading ? "Uploading…" : "Choose poster"}
					<input id="movie-poster-file" aria-label="Upload movie poster" className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={event => { void upload(event.target.files?.[0]); event.target.value = ""; }} />
				</label>
				<p className="pt-2 text-[10px] leading-4 text-[#7c8799]">JPEG, PNG or WebP · Up to 5 MB</p>
				{posterError && <p role="alert" className="pt-2 text-xs leading-5 text-[#ac4034]">{posterError}</p>}
				{posterNotice && <p role="status" className="pt-2 text-xs leading-5 text-[#167354]">{posterNotice}</p>}
			</section>
		</fieldset>{error && <p role="alert" className="pt-4 text-sm leading-5 text-[#ac4034]">{error}</p>}<div className="mt-6 flex justify-end gap-2"><button type="button" className={button} disabled={saving} onClick={close}>Cancel</button><button type="submit" className={primary} disabled={saving || uploading}>{saving ? "Adding…" : "Add movie"}</button></div></form>
	</dialog>;
}

export default function AdminMoviesPanel() {
	const store = useAdminDataStore();
	const [page, setPage] = useState(0);
	const [query, setQuery] = useState("");
	const [search, setSearch] = useState("");
	const [adding, setAdding] = useState(false);
	const [notice, setNotice] = useState("");
	const { data, error, loading, refresh } = useAdminResource(store.movies(page, query));
	return <>
		<div className="mb-6 flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-semibold">Movie management</h1><p className="pt-2 text-sm text-[#7c8799]">Your films, ready for their next screening.</p></div><button className={primary} onClick={() => { setAdding(true); setNotice(""); }}><Plus size={15} />Add movie</button></div>
		<form className="mb-5 flex max-w-lg gap-2" onSubmit={event => { event.preventDefault(); setQuery(search.trim()); setPage(0); }}><label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-solid border-[#dce3e9] bg-white px-3"><Search size={16} className="text-[#7c8799]" /><input type="search" aria-label="Search movies" placeholder="Search by title or slug" maxLength={200} value={search} onChange={event => setSearch(event.target.value)} className="min-w-0 flex-1 border-0 bg-transparent py-3 text-xs outline-none" /></label><button className={button}>Search</button></form>
		{notice && <p role="status" className="mb-4 rounded-lg bg-[#e4f5ee] p-4 text-sm text-[#167354]">{notice}</p>}
		{!data ? <div className="rounded-xl bg-white p-6 text-sm" role={error ? "alert" : "status"}>{error ? <><p>{error instanceof Error ? error.message : "Movies could not be loaded."}</p><button className={`${button} mt-3`} onClick={refresh}>Try again</button></> : "Loading movies…"}</div> : <section id="movies-panel" aria-label="Movies" className="overflow-hidden rounded-xl border border-solid border-[#e4e9ef] bg-white">
			<AdminRefreshNotice loading={loading} error={error} retry={refresh} /><div className="overflow-x-auto"><table className="w-full border-collapse"><thead className="bg-[#fafbfd] text-[#697387]"><tr>{["Movie", "Duration", "Genres", "Age rating", "Release date", "Status"].map(label => <th key={label} className={cell}>{label}</th>)}</tr></thead><tbody>
				{data.items.map(movie => <tr key={movie.id}><td className={cell}><div className="flex min-w-52 items-center gap-3"><img src={movie.posterUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-16 w-11 shrink-0 rounded-md bg-[#edf0f4] object-cover" /><div><span className="block font-semibold">{movie.title}</span><span className="mt-1 block text-[10px] text-[#7c8799]">{movie.slug}</span></div></div></td><td className={`${cell} whitespace-nowrap`}>{movie.durationMinutes} min</td><td className={cell}>{movie.genres.join(", ") || "—"}</td><td className={cell}>{movie.ageRating}</td><td className={`${cell} whitespace-nowrap`}>{movie.releaseDate || "—"}</td><td className={cell}><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${movie.status === "ACTIVE" ? "bg-[#e4f5ee] text-[#167354]" : "bg-[#f0f2f6] text-[#657084]"}`}>{movie.status}</span></td></tr>)}
				{!data.items.length && <tr><td colSpan={6} className={`${cell} py-12 text-center text-[#7c8799]`}><Clapperboard size={26} className="mx-auto mb-3" />{query ? "No movies match your search." : "No movies yet. Add your first movie."}</td></tr>}
			</tbody></table></div><div className="flex flex-wrap items-center justify-between gap-3 p-5 text-xs text-[#697387]"><span>{data.total.toLocaleString()} records · Page {data.page + 1} of {Math.max(1, Math.ceil(data.total / data.size))}</span><div className="flex gap-2"><button className={button} disabled={!page} onClick={() => setPage(page - 1)}>Previous</button><button className={button} disabled={(page + 1) * data.size >= data.total} onClick={() => setPage(page + 1)}>Next</button></div></div>
		</section>}
		{adding && <CreateMovie close={() => setAdding(false)} saved={movie => { setAdding(false); setPage(0); setQuery(""); setSearch(""); setNotice(`${movie.title} added to the active catalog.`); store.movieCreated(); }} />}
	</>;
}
