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
import "./movie-list.css";

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
		<div className="movie-list-page">
			<aside className="movie-list-sidebar" aria-label="Movie library">
				<a className="movie-list-brand" href="/" aria-label="Aura home">
					<span className="movie-list-brand-mark">
						<Film size={20} aria-hidden="true" />
					</span>
					<span>
						<strong>THE LUMIÈRE</strong>
						<small>CINÉMATHÈQUE</small>
					</span>
				</a>
				<div className="movie-list-search">
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
					className="movie-list-category-toggle"
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
					className="movie-list-genres"
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
				<nav className="movie-list-collections" aria-label="Film collections">
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
			<main className="movie-list-main">
				<header className="movie-list-header">
					<a href="/" className="movie-list-back">
						<ArrowLeft size={15} aria-hidden="true" /> Cinema Discovery
					</a>
					<span>THE FILM COLLECTION</span>
				</header>
				<div className="movie-list-heading">
					<div>
						<p>EXPLORE THE WORLD OF CINEMA</p>
						<h1>{heading}</h1>
						<p className="movie-list-intro">
							Stories that stay with you. Find your next cinematic escape.
						</p>
					</div>
					<span className="movie-list-count" role="status">
						{visibleMovies.length}{" "}
						{visibleMovies.length === 1 ? "film" : "films"}
					</span>
				</div>
				{(genre !== "All Genres" || search) && (
					<div className="movie-list-filters">
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
					<div className="movie-list-grid">
						{visibleMovies.map((movie) => {
							const saved = watchlist.includes(movie.slug);
							return (
								<article className="movie-list-card" key={movie.slug}>
									<div className="movie-list-poster">
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
										<span className="movie-list-rating">{movie.rating}</span>
										<button
											type="button"
											className={`movie-list-save${saved ? " saved" : ""}`}
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
									<div className="movie-list-card-body">
										<div className="movie-list-meta">
											<span>{movie.label}</span>
											<span>
												<Clock3 size={12} aria-hidden="true" />
												{movie.minutes} min
											</span>
										</div>
										<h2>
											<a href={movieShowtimePath(movie)}>{movie.title}</a>
										</h2>
										<details className="movie-list-synopsis">
											<summary>Synopsis</summary>
											<p>{movie.description}</p>
										</details>
										<a
											className="movie-list-tickets"
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
					<div className="movie-list-empty">
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
