import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronRight, Clock3, Star, X } from "lucide-react";
import { demoFeaturedHero, movies, movieListPath, movieShowtimePath, type Movie } from "./demo-movie-data";
import SiteHeader from "./site-header";
import "./cinema-discovery.css";

function Page() {
	const [category, setCategory] = useState("Now Showing");
	const [activeMovie, setActiveMovie] = useState<Movie | null>(null);
	const [scrolled, setScrolled] = useState(false);
	const [catalogVisible, setCatalogVisible] = useState(false);
	const scrollContainerRef = useRef<HTMLElement>(null);
	const heroRef = useRef<HTMLElement>(null);
	const catalogRef = useRef<HTMLElement>(null);
	const lastSectionScroll = useRef(0);

	useEffect(() => {
		const container = scrollContainerRef.current;
		if (!container) return;
		const onScroll = () => setScrolled(container.scrollTop > 20);
		container.addEventListener("scroll", onScroll, { passive: true });
		return () => container.removeEventListener("scroll", onScroll);
	}, []);

	useEffect(() => {
		const catalog = catalogRef.current;
		if (!catalog || !("IntersectionObserver" in window)) return;
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					setCatalogVisible(true);
					observer.disconnect();
				}
			},
			{ root: scrollContainerRef.current, threshold: 0.12 },
		);
		observer.observe(catalog);
		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		const container = scrollContainerRef.current;
		if (!container) return;
		const onWheel = (event: WheelEvent) => {
			if (activeMovie || event.ctrlKey || Math.abs(event.deltaY) < 2 || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
			event.preventDefault();
			const now = Date.now();
			if (now - lastSectionScroll.current < 650) return;
			const goingDown = event.deltaY > 0;
			const target = goingDown ? catalogRef.current : heroRef.current;
			const targetTop = goingDown ? container.clientHeight : 0;
			if (!target || Math.abs(container.scrollTop - targetTop) < 8) return;
			lastSectionScroll.current = now;
			target.scrollIntoView({ behavior: "smooth", block: "start" });
		};
		container.addEventListener("wheel", onWheel, { passive: false });
		return () => container.removeEventListener("wheel", onWheel);
	}, [activeMovie]);

	const visibleMovies =
		category === "Now Showing"
			? movies
			: [];
	const openMovie = (movie: Movie) => {
		setActiveMovie(movie);
	};
	const closeMovie = () => {
		setActiveMovie(null);
	};

	return (
		<>
			<SiteHeader currentStep={1} scrolled={scrolled} />
			<main id="top" className="scroll-container" ref={scrollContainerRef}>
				<section className="hero-section" ref={heroRef} aria-labelledby="featured-title">
					<img className="hero-photo" src={demoFeaturedHero.movie.image} alt="" />
					<div className="hero-shade" />
					<div className="hero-copy gutter">
						<div className="tags">
							<span>{demoFeaturedHero.label}</span>
							<strong>{demoFeaturedHero.format}</strong>
							<em><Star size={12} fill="currentColor" aria-hidden="true" /> {demoFeaturedHero.ratingText}</em>
						</div>
						<h1 id="featured-title">{demoFeaturedHero.movie.title}</h1>
						<p>{demoFeaturedHero.description}</p>
						<div className="hero-actions">
							<button
								className="dark-button"
								type="button"
								onClick={() => { window.location.href = movieShowtimePath(demoFeaturedHero.movie); }}
							>
								{demoFeaturedHero.bookButtonLabel} <ArrowRight size={15} aria-hidden="true" />
							</button>
							<button
								className="outline-button"
								type="button"
								onClick={() => openMovie(demoFeaturedHero.movie)}
							>
								{demoFeaturedHero.trailerButtonLabel}
							</button>
						</div>
					</div>
				</section>
				<section
					className={`catalog-section${catalogVisible ? " is-visible" : ""}`}
					ref={catalogRef}
					aria-label="Movie catalog"
				>
					<div className="catalog-content gutter">
						<div className="catalog-toolbar">
							<div
								className="categories"
								role="tablist"
								aria-label="Movie category"
							>
								{["Now Showing", "Coming Soon", "Festivals & Specials"].map(
									(item) => (
										<button
											type="button"
											role="tab"
											aria-selected={category === item}
											className={category === item ? "selected" : ""}
											key={item}
											onClick={() => setCategory(item)}
										>
											{item}
										</button>
									),
								)}
							</div>
							<a className="movie-list-link" href={movieListPath()}>
								View all movies <ArrowRight size={14} aria-hidden="true" />
							</a>
						</div>
						{visibleMovies.length ? (
							<div className="movie-grid">
								{visibleMovies.map((movie) => (
									<article className="movie-card" key={movie.title}>
										<button
											className="poster-button"
											type="button"
											aria-label={`View ${movie.title}`}
											onClick={() => openMovie(movie)}
										>
											<img src={movie.image} alt="" />
										</button>
										<div className="card-body">
											<div className="card-meta">
												<span>{movie.label}</span>
												<span><Clock3 size={11} aria-hidden="true" />{movie.minutes} MIN</span>
											</div>
											<h2><a href={movieShowtimePath(movie)}>{movie.title}</a></h2>
											<div className="card-bottom">
												<span className="rating">{movie.rating}</span>
												<button
													type="button"
												onClick={() => { window.location.href = movieShowtimePath(movie); }}
												>
													GET TICKETS <ChevronRight size={18} aria-hidden="true" />
												</button>
											</div>
										</div>
									</article>
								))}
							</div>
						) : (
							<p className="empty">No films in this collection yet.</p>
						)}
					</div>
				</section>
			</main>
			{activeMovie && (
				<div className="modal-backdrop" onClick={closeMovie}>
					<div
						className="movie-modal"
						role="dialog"
						aria-modal="true"
						aria-label={activeMovie.title}
						onClick={(event) => event.stopPropagation()}
					>
						<button
							className="modal-close"
							type="button"
							aria-label="Close"
							onClick={closeMovie}
						>
							<X size={20} aria-hidden="true" />
						</button>
						<img className="modal-poster" src={activeMovie.image} alt="" />
						<div>
							<small className="modal-meta">
								<span>{activeMovie.label}</span>
								<span><Clock3 size={13} aria-hidden="true" />{activeMovie.minutes} MIN</span>
							</small>
							<h2>{activeMovie.title}</h2>
							<p>{activeMovie.description}</p>
							<p className="trailer-unavailable">Trailer is not available yet.</p>
							<a className="modal-tickets" href={movieShowtimePath(activeMovie)}>VIEW SHOWTIMES <ArrowRight size={14} aria-hidden="true" /></a>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
export default Page;
