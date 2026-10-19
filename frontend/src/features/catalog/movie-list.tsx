import { useEffect, useState } from "react";
import {
	ArrowLeft,
	ArrowUpRight,
	Bookmark,
	ChevronDown,
	Clock3,
	Compass,
	Film,
	Search,
	Sparkles,
	TrendingUp,
	X,
} from "lucide-react";
import {
	demoMovieCollections,
	demoMovieListGenres,
	movies,
	movieListPath,
	movieShowtimePath,
} from "../../demo-movie-data";

const watchlistKey = "aura-demo-watchlist";
const collections = [
	{ id: "all", label: "All Films", icon: Compass },
	{ id: "trending", label: "Trending Now", icon: TrendingUp },
	{ id: "new", label: "New Releases", icon: Sparkles },
	{ id: "watchlist", label: "My Watchlist", icon: Bookmark },
];

function readWatchlist(): string[] {
	try {
		const saved: unknown = JSON.parse(
			localStorage.getItem(watchlistKey) ?? "[]",
		);
		return Array.isArray(saved)
			? movies
					.filter((movie) => saved.includes(movie.slug))
					.map((movie) => movie.slug)
			: [];
	} catch {
		return [];
	}
}

export default function MovieList() {
	const params = new URLSearchParams(window.location.search);
	const genre = params.get("genre") ?? "All Genres";
	const collection =
		collections.find((item) => item.id === params.get("collection")) ??
		collections[0];
	const [search, setSearch] = useState("");
	const [categoriesOpen, setCategoriesOpen] = useState(false);
	const [watchlist, setWatchlist] = useState(readWatchlist);

	useEffect(() => {
		try {
			localStorage.setItem(watchlistKey, JSON.stringify(watchlist));
		} catch {
			// Browsing and saving for this visit still work when storage is unavailable.
		}
	}, [watchlist]);

	const visibleMovies = movies.filter((movie) => {
		const matchesCollection =
			collection.id === "all" ||
			(collection.id === "watchlist" && watchlist.includes(movie.slug)) ||
			(collection.id === "trending" &&
				demoMovieCollections.trending.includes(movie.slug)) ||
			(collection.id === "new" &&
				demoMovieCollections.new.includes(movie.slug));
		return (
			matchesCollection &&
			(genre === "All Genres" || movie.genre.includes(genre)) &&
			movie.title.toLowerCase().includes(search.trim().toLowerCase())
		);
	});
	const heading = genre === "All Genres" ? collection.label : `${genre} Films`;
	const genrePath = (item: string) => {
		const path = movieListPath(item);
		return collection.id === "all"
			? path
			: `${path}${path.includes("?") ? "&" : "?"}collection=${collection.id}`;
	};
	const toggleWatchlist = (slug: string) =>
		setWatchlist((saved) =>
			saved.includes(slug)
				? saved.filter((item) => item !== slug)
				: [...saved, slug],
		);

	return (
		<div className="movie-list-page [--list-gold:#edbd42] [--list-muted:#9b9ea8] grid grid-cols-[238px_minmax(0,_1fr)] h-dvh
			min-h-0 bg-[#f8f5ef] text-[#151515] [&_a]:text-inherit [&_a]:no-underline
			[&_:is(a,_button,_input,_summary):focus-visible]:[outline:2px_solid_var(--list-gold)]
			[&_:is(a,_button,_input,_summary):focus-visible]:outline-offset-[3px]
			max-[900px]:grid-cols-[220px_minmax(0,_1fr)] max-[600px]:block max-[600px]:overflow-y-auto">
			<aside className="movie-list-sidebar min-h-0 overflow-y-auto p-[24px_20px] bg-[#101113] text-[#f3f3f5]
				[border-right:1px_solid_#25262a] max-[600px]:overflow-visible max-[600px]:p-[22px]
				max-[600px]:[border-right:0] max-[600px]:[border-bottom:1px_solid_#25262a]" aria-label="Movie library">
				<a className="movie-list-brand flex items-center gap-[10px] mb-6 [&_>_span:last-child]:flex [&_>_span:last-child]:flex-col
					[&_>_span:last-child]:gap-[3px] [&_strong]:text-[16px] [&_strong]:tracking-[0.03em] [&_small]:text-[8px]
					[&_small]:text-[color:var(--list-gold)] [&_small]:tracking-[0.04em] max-[600px]:mb-[18px]" href="/" aria-label="Aura home">
					<span className="movie-list-brand-mark grid place-items-center w-8 h-8 flex-none bg-[var(--list-gold)] rounded-[8px]
						text-[#151515]">
						<Film size={20} aria-hidden="true" />
					</span>
					<span>
						<strong>THE LUMIÈRE</strong>
						<small>CINÉMATHÈQUE</small>
					</span>
				</a>
				<div className="movie-list-search flex items-center gap-2 p-[10px] mb-5 [border:1px_solid_#292b30] rounded-[5px]
					text-[#707480] bg-[#1a1b1f] [&_svg]:flex-none [&_input]:min-w-0 [&_input]:w-full [&_input]:p-0
					[&_input]:border-0 [&_input]:bg-transparent [&_input]:text-[#f3f3f5] [&_input]:font-[inherit]
					[&_input]:text-[14px] [&_input]:[font-weight:inherit] [&_input]:[font-style:inherit]
					[&_input]:leading-[inherit] [&_input::placeholder]:text-[#8b8f99] max-[600px]:mb-[14px]">
					<Search size={16} aria-hidden="true" />
					<input
						type="search"
						aria-label="Search films"
						placeholder="Search films..."
						value={search}
						onChange={(event) => setSearch(event.target.value)}
					/>
				</div>
				<button
					className="movie-list-category-toggle flex items-center justify-between w-full p-[10px] border-0 rounded-[4px]
						bg-[#1a1b1f] text-[#b5b9c3] text-[11px] tracking-[0.08em] [&_svg]:[transition:transform_0.2s]
						[&_.collapsed]:[transform:rotate(-90deg)]"
					type="button"
					aria-expanded={categoriesOpen}
					aria-controls="movie-list-genres"
					onClick={() => setCategoriesOpen(!categoriesOpen)}
				>
					CATEGORIES{" "}
					<ChevronDown
						size={15}
						className={categoriesOpen ? "" : "collapsed"}
						aria-hidden="true"
					/>
				</button>
				<nav
					id="movie-list-genres"
					className="movie-list-genres p-[8px_0] [&.movie-list-genres_a]:block [&.movie-list-genres_a]:p-[9px_22px]
						[&.movie-list-genres_a]:rounded-[4px] [&.movie-list-genres_a]:text-[#b0b3bd]
						[&.movie-list-genres_a]:text-[14px] [&.movie-list-genres_a:hover]:bg-[#272318]
						[&.movie-list-genres_a:hover]:text-[color:var(--list-gold)] [&.movie-list-genres_a.selected]:bg-[#272318]
						[&.movie-list-genres_a.selected]:text-[color:var(--list-gold)]
						max-[600px]:[&.movie-list-genres:not([hidden])]:flex max-[600px]:[&.movie-list-genres:not([hidden])]:flex-wrap
						max-[600px]:[&.movie-list-genres:not([hidden])]:gap-[3px] max-[600px]:[&.movie-list-genres_a]:p-[9px_11px]"
					aria-label="Film genres"
					hidden={!categoriesOpen}
				>
					{demoMovieListGenres.map((item) => (
						<a
							key={item}
							href={genrePath(item)}
							className={genre === item ? "selected" : ""}
							aria-current={genre === item ? "page" : undefined}
						>
							{item}
						</a>
					))}
				</nav>
				<nav className="movie-list-collections grid gap-[5px] mt-[2px] [&.movie-list-collections_a]:flex
					[&.movie-list-collections_a]:items-center [&.movie-list-collections_a]:gap-[11px]
					[&.movie-list-collections_a]:p-[10px] [&.movie-list-collections_a]:[border-left:2px_solid_transparent]
					[&.movie-list-collections_a]:rounded-[5px] [&.movie-list-collections_a]:text-[14px]
					[&.movie-list-collections_a]:text-[#b0b3bd] [&.movie-list-collections_svg]:flex-none
					[&.movie-list-collections_small]:ml-auto [&.movie-list-collections_small]:text-[#858a96]
					[&.movie-list-collections_small]:text-[12px] [&.movie-list-collections_a:hover]:bg-[#1b1c20]
					[&.movie-list-collections_a.selected]:[border-left-color:var(--list-gold)]
					[&.movie-list-collections_a.selected]:bg-[#2b271a] [&.movie-list-collections_a.selected]:text-[#fff]
					[&.movie-list-collections_a.selected_svg]:text-[color:var(--list-gold)]
					max-[600px]:grid-cols-[repeat(2,_minmax(0,_1fr))]" aria-label="Film collections">
					{collections.map(({ id, label, icon: Icon }) => (
						<a
							key={id}
							href={
								id === "all" ? movieListPath() : `/movie-list?collection=${id}`
							}
							className={
								collection.id === id && genre === "All Genres" ? "selected" : ""
							}
							aria-current={
								collection.id === id && genre === "All Genres"
									? "page"
									: undefined
							}
						>
							<Icon size={17} aria-hidden="true" />
							<span>{label}</span>
							{id === "all" && <small>{movies.length}</small>}
							{id === "watchlist" && <small>{watchlist.length}</small>}
						</a>
					))}
				</nav>
			</aside>
			<main className="movie-list-main [--list-muted:#76716a] [--list-accent:#82592f] min-w-0 overflow-y-auto
				p-[0_clamp(22px,_4vw,_64px)_48px] bg-[#f8f5ef]
				[&_:is(a,_button,_summary):focus-visible]:[outline-color:#a46a34] [&_.movie-list-back]:inline-flex
				[&_.movie-list-back]:items-center [&_.movie-list-back]:gap-2 [&_.movie-list-back]:text-[14px]
				[&_.movie-list-back]:text-[color:var(--list-muted)] [&_.movie-list-back:hover]:text-[#151515]
				[&_.movie-list-tickets]:flex [&_.movie-list-tickets]:items-center [&_.movie-list-tickets]:justify-between
				[&_.movie-list-tickets]:gap-[10px] [&_.movie-list-tickets]:mt-[18px] [&_.movie-list-tickets]:pt-[14px]
				[&_.movie-list-tickets]:[border-top:1px_solid_#e6e0d6] [&_.movie-list-tickets]:text-[#151515]
				[&_.movie-list-tickets]:text-[14px] max-[600px]:overflow-visible max-[600px]:p-[0_22px_32px]
				max-[600px]:[&_.movie-list-tickets]:text-[13px]">
				<header className="movie-list-header flex items-center justify-between gap-4 min-h-[78px] [border-bottom:1px_solid_#e6e0d6]
					[&_>_span]:text-[color:var(--list-muted)] [&_>_span]:text-[12px] [&_>_span]:tracking-[0.16em]
					max-[900px]:[&_>_span]:hidden max-[600px]:min-h-[58px]">
					<a href="/" className="movie-list-back">
						<ArrowLeft size={15} aria-hidden="true" /> Cinema Discovery
					</a>
					<span>THE FILM COLLECTION</span>
				</header>
				<div className="movie-list-heading flex justify-between items-end gap-5 p-[40px_0_30px] [&_p]:m-0
					[&_p]:text-[color:var(--list-accent)] [&_p]:text-[12px] [&_p]:tracking-[0.15em] [&_h1]:m-[12px_0_14px]
					[&_h1]:text-[clamp(32px,_4vw,_52px)] [&_h1]:font-medium [&_h1]:tracking-[-0.045em]
					[&_.movie-list-intro]:text-[color:var(--list-muted)] [&_.movie-list-intro]:text-[16px]
					[&_.movie-list-intro]:tracking-[0] [&_.movie-list-intro]:leading-[1.6] max-[600px]:[padding-block:28px_24px]
					max-[600px]:gap-3 max-[600px]:[&_.movie-list-intro]:text-[15px]">
					<div>
						<p>EXPLORE THE WORLD OF CINEMA</p>
						<h1>{heading}</h1>
						<p className="movie-list-intro">
							Stories that stay with you. Find your next cinematic escape.
						</p>
					</div>
					<span className="movie-list-count flex-none pb-1 text-[color:var(--list-muted)] text-[15px]" role="status">
						{visibleMovies.length}{" "}
						{visibleMovies.length === 1 ? "film" : "films"}
					</span>
				</div>
				{(genre !== "All Genres" || search) && (
					<div className="movie-list-filters flex flex-wrap gap-2 mb-[22px] [&_:is(a,_button)]:inline-flex
						[&_:is(a,_button)]:items-center [&_:is(a,_button)]:gap-[10px] [&_:is(a,_button)]:p-[7px_11px]
						[&_:is(a,_button)]:[border:1px_solid_#e8e0d5] [&_:is(a,_button)]:rounded-[20px]
						[&_:is(a,_button)]:bg-[#f2efe9] [&_:is(a,_button)]:text-[#55514d] [&_:is(a,_button)]:text-[13px]
						[&_:is(a,_button)]:[overflow-wrap:anywhere]">
						{genre !== "All Genres" && (
							<a
								href={genrePath("All Genres")}
								aria-label={`Clear ${genre} filter`}
							>
								{genre}
								<X size={13} aria-hidden="true" />
							</a>
						)}
						{search && (
							<button
								type="button"
								onClick={() => setSearch("")}
								aria-label="Clear search"
							>
								“{search}”<X size={13} aria-hidden="true" />
							</button>
						)}
					</div>
				)}
				{visibleMovies.length ? (
					<div className="movie-list-grid grid grid-cols-[repeat(auto-fill,_minmax(210px,_1fr))] gap-[28px_22px] items-start
						max-[900px]:grid-cols-[repeat(2,_minmax(0,_1fr))] max-[900px]:gap-4">
						{visibleMovies.map((movie) => {
							const saved = watchlist.includes(movie.slug);
							return (
								<article className="movie-list-card min-w-0 overflow-hidden [border:1px_solid_#e8e3db] rounded-[9px] bg-white
									[&:hover_.movie-list-poster_img]:[transform:scale(1.04)] [&_h2]:m-[13px_0] [&_h2]:text-[19px]
									[&_h2]:font-medium [&_h2]:leading-[1.35] [&_h2]:tracking-[-0.02em]
									[&_h2_a:hover]:text-[color:var(--list-accent)] max-[600px]:[&_h2]:text-[16px]" key={movie.slug}>
									<div className="movie-list-poster relative overflow-hidden aspect-[2_/_3] bg-[#eee5d9] [&_>_a]:block [&_>_a]:w-full
										[&_>_a]:h-full [&_img]:block [&_img]:w-full [&_img]:h-full [&_img]:object-cover
										[&_img]:[transition:transform_0.3s]">
										<a
											href={movieShowtimePath(movie)}
											aria-label={`View ${movie.title}`}
										>
											<img
												src={movie.image}
												alt={`${movie.title} poster`}
												loading="lazy"
											/>
										</a>
										<span className="movie-list-rating absolute bottom-3 left-3 p-[5px_7px] [border:1px_solid_#e8e0d5] rounded-[3px] bg-[#f2efe9]
											text-[#595550] text-[12px] pointer-events-none">{movie.rating}</span>
										<button
											type="button"
											className={`movie-list-save absolute top-3 right-3 grid place-items-center w-[34px] h-[34px] [border:1px_solid_#e8e0d5]
												rounded-[50%] bg-[#ffffffeb] text-[#55514d] hover:text-[color:var(--list-accent)]
												hover:[border-color:var(--list-accent)] hover:bg-[#f2efe9] [&.saved]:text-[color:var(--list-accent)]
												[&.saved]:[border-color:var(--list-accent)] [&.saved]:bg-[#f2efe9]${saved ? " saved" : ""}`}
											aria-label={`${saved ? "Remove" : "Save"} ${movie.title} ${saved ? "from" : "to"} watchlist`}
											aria-pressed={saved}
											onClick={() => toggleWatchlist(movie.slug)}
										>
											<Bookmark
												size={17}
												fill={saved ? "currentColor" : "none"}
												aria-hidden="true"
											/>
										</button>
									</div>
									<div className="movie-list-card-body p-[18px_16px] max-[600px]:p-3">
										<div className="movie-list-meta flex flex-wrap justify-between gap-2 text-[#77716a] text-[12px] leading-[1.5]
											[&_>_span:last-child]:inline-flex [&_>_span:last-child]:items-center [&_>_span:last-child]:gap-1
											max-[600px]:text-[11px]">
											<span>{movie.label}</span>
											<span>
												<Clock3 size={12} aria-hidden="true" />
												{movie.minutes} min
											</span>
										</div>
										<h2>
											<a href={movieShowtimePath(movie)}>{movie.title}</a>
										</h2>
										<details className="movie-list-synopsis text-[color:var(--list-muted)] text-[14px] leading-[1.6] [&_summary]:cursor-pointer
											[&_p]:m-[8px_0_0] [&_p]:text-[15px]">
											<summary>Synopsis</summary>
											<p>{movie.description}</p>
										</details>
										<a
											className="movie-list-tickets hover:underline hover:underline-offset-[4px]"
											href={movieShowtimePath(movie)}
										>
											View showtimes
											<ArrowUpRight size={16} aria-hidden="true" />
										</a>
									</div>
								</article>
							);
						})}
					</div>
				) : (
					<div className="movie-list-empty flex flex-col items-center gap-4 p-[70px_20px] [border:1px_dashed_#d9d1c5] rounded-[9px]
						text-center text-[color:var(--list-muted)] bg-white [&.movie-list-empty_h2]:m-0
						[&.movie-list-empty_h2]:text-[#151515] [&.movie-list-empty_h2]:text-[22px] [&.movie-list-empty_h2]:font-medium
						[&.movie-list-empty_p]:m-0 [&.movie-list-empty_p]:text-[16px] [&.movie-list-empty_p]:leading-[1.6]
						[&.movie-list-empty_a]:p-[10px_16px] [&.movie-list-empty_a]:border-0 [&.movie-list-empty_a]:rounded-[5px]
						[&.movie-list-empty_a]:bg-[#111] [&.movie-list-empty_a]:text-white [&.movie-list-empty_a]:text-[14px]
						[&.movie-list-empty_button]:p-[10px_16px] [&.movie-list-empty_button]:border-0
						[&.movie-list-empty_button]:rounded-[5px] [&.movie-list-empty_button]:bg-[#111]
						[&.movie-list-empty_button]:text-white [&.movie-list-empty_button]:text-[14px]">
						<Film size={34} aria-hidden="true" />
						<h2>
							{collection.id === "watchlist" && !watchlist.length
								? "Your watchlist is waiting"
								: "No films found"}
						</h2>
						<p>
							{collection.id === "watchlist" && !watchlist.length
								? "Save a film using the bookmark on its poster."
								: "Try another genre or search for a different title."}
						</p>
						<a href={movieListPath()}>Explore all films</a>
						{search && (
							<button type="button" onClick={() => setSearch("")}>
								Clear search
							</button>
						)}
					</div>
				)}
			</main>
		</div>
	);
}
