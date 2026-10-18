import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronRight, Clock3, Star, X } from "lucide-react";
import {
	demoFeaturedHero,
	movies,
	movieListPath,
	movieShowtimePath,
	type Movie,
} from "./demo-movie-data";
import SiteHeader from "./site-header";

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
			if (
				activeMovie ||
				event.ctrlKey ||
				Math.abs(event.deltaY) < 2 ||
				Math.abs(event.deltaX) > Math.abs(event.deltaY)
			)
				return;
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

	const visibleMovies = category === "Now Showing" ? movies : [];
	const openMovie = (movie: Movie) => {
		setActiveMovie(movie);
	};
	const closeMovie = () => {
		setActiveMovie(null);
	};

	return (
		<>
			<SiteHeader currentStep={1} scrolled={scrolled} />
			<main
				id="top"
				className="scroll-container h-[calc(100dvh_-_94px)] mt-[94px] overflow-y-auto [overscroll-behavior-y:contain]
				[scroll-snap-type:y_mandatory] scroll-smooth max-[600px]:h-[calc(100dvh_-_72px)] max-[600px]:mt-18"
				ref={scrollContainerRef}
			>
				<section
					className="hero-section relative flex items-center h-[calc(100dvh_-_94px)] overflow-hidden isolate text-white
					[scroll-snap-align:start] [scroll-snap-stop:always] max-[600px]:h-[calc(100dvh_-_72px)]"
					ref={heroRef}
					aria-labelledby="featured-title"
				>
					<img
						className="hero-photo absolute inset-0 z-[-1] w-full h-full object-cover [animation:hero-in_1.3s_both]"
						src={demoFeaturedHero.movie.image}
						alt=""
					/>
					<div
						className="hero-shade absolute inset-0 z-[-1]
						[background:linear-gradient(90deg,_#1e0d07bd_0%,_#22100677_48%,_#22100627_100%),_linear-gradient(0deg,_#1b0e0e40,_transparent_60%)]"
					/>
					<div
						className="hero-copy w-full py-16 [animation:rise-in_0.8s_both] [&_h1]:m-[26px_0_17px]
						[&_h1]:text-[clamp(43px,_5vw,_76px)] [&_h1]:leading-[1] [&_h1]:font-normal [&_h1]:tracking-[-0.05em]
						[&_p]:max-w-[730px] [&_p]:m-0 [&_p]:text-[#eee6dc] [&_p]:text-[clamp(13px,_1.05vw,_16px)] [&_p]:leading-[1.55]
						max-[600px]:[&_h1]:text-[clamp(43px,_10vw,_60px)] gutter [padding-inline:clamp(24px,_4.5vw,_72px)]"
					>
						<div
							className="tags flex items-center gap-[9px] text-[10px] font-bold [&_span]:p-[7px_9px] [&_span]:bg-[#111]
							[&_strong]:p-[7px_9px] [&_strong]:text-[#111] [&_strong]:bg-white [&_em]:inline-flex [&_em]:items-center
							[&_em]:gap-1 [&_em]:text-[#f1dbcb] [&_em]:not-italic"
						>
							<span>{demoFeaturedHero.label}</span>
							<strong>{demoFeaturedHero.format}</strong>
							<em>
								<Star size={12} fill="currentColor" aria-hidden="true" />{" "}
								{demoFeaturedHero.ratingText}
							</em>
						</div>
						<h1 id="featured-title">{demoFeaturedHero.movie.title}</h1>
						<p>{demoFeaturedHero.description}</p>
						<div
							className="hero-actions flex gap-[14px] mt-7 [&_button]:min-h-11 [&_button]:p-[0_19px] [&_button]:rounded-[4px]
							[&_button]:text-white [&_button]:text-[11px] [&_button]:font-bold
							[&_button]:[transition:transform_0.2s,_background_0.2s] [&_button:hover]:[transform:translateY(-2px)]"
						>
							<button
								className="dark-button flex items-center gap-4 [border:1px_solid_#0b0b0b] bg-[#0b0b0b]"
								type="button"
								onClick={() => {
									window.location.href = movieShowtimePath(
										demoFeaturedHero.movie,
									);
								}}
							>
								{demoFeaturedHero.bookButtonLabel}{" "}
								<ArrowRight size={15} aria-hidden="true" />
							</button>
							<button
								className="outline-button [border:1px_solid_#fff8] bg-[#ffffff12] hover:bg-[#ffffff30]"
								type="button"
								onClick={() => openMovie(demoFeaturedHero.movie)}
							>
								{demoFeaturedHero.trailerButtonLabel}
							</button>
						</div>
					</div>
				</section>
				<section
					className={`catalog-section h-[calc(100dvh_-_94px)] [scroll-snap-align:start] [scroll-snap-stop:always] overflow-hidden
						bg-[#f8f5ef] [&_.catalog-content]:opacity-[0] [&_.catalog-content]:[transform:translateY(28px)]
						[&_.catalog-content]:[transition:opacity_0.6s_ease,_transform_0.6s_ease]
						[&.is-visible_.catalog-content]:opacity-[1] [&.is-visible_.catalog-content]:[transform:none]
						max-[600px]:h-[calc(100dvh_-_72px)]${catalogVisible ? " is-visible" : ""}`}
					ref={catalogRef}
					aria-label="Movie catalog"
				>
					<div
						className="catalog-content flex flex-col h-full min-h-0 [padding-block:clamp(35px,_6vh,_70px)_36px]
						max-[600px]:[padding-block:26px_20px] gutter [padding-inline:clamp(24px,_4.5vw,_72px)]"
					>
						<div
							className="catalog-toolbar flex items-center justify-between gap-6 pb-5 [border-bottom:1px_solid_#e6e0d6]
							max-[850px]:items-start max-[850px]:flex-col max-[600px]:gap-3 max-[600px]:pb-[13px]"
						>
							<div
								className="categories flex items-center flex-wrap gap-[clamp(16px,_2vw,_30px)] [&_button]:p-0 [&_button]:border-0
									[&_button]:bg-transparent [&_button]:text-[#85817e] [&_button]:text-[clamp(17px,_1.8vw,_25px)]
									[&_button]:whitespace-nowrap [&_button.selected]:text-[#171717] max-[600px]:flex-nowrap max-[600px]:w-full
									max-[600px]:overflow-x-auto max-[600px]:[scrollbar-width:none] max-[600px]:[&::-webkit-scrollbar]:hidden
									max-[600px]:[&_button]:text-[18px]"
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
							<a
								className="movie-list-link inline-flex items-center gap-[7px] flex-none p-[7px_12px] [border:1px_solid_#e8e0d5]
								rounded-[20px] bg-none text-[#55514d] text-[14px] whitespace-nowrap no-underline
								hover:[border-color:#0b0b0b] hover:bg-[#0b0b0b] hover:text-white"
								href={movieListPath()}
							>
								View all movies <ArrowRight size={20} aria-hidden="true" />
							</a>
						</div>
						{visibleMovies.length ? (
							<div
								className="movie-grid grid flex-1 min-h-0 grid-cols-[repeat(4,_minmax(0,_1fr))] gap-[clamp(18px,_2.2vw,_36px)] mt-6
								max-[850px]:grid-cols-[repeat(2,_minmax(0,_1fr))] max-[850px]:grid-rows-[repeat(2,_minmax(0,_1fr))]
								max-[600px]:grid-flow-[column] max-[600px]:grid-cols-[none] max-[600px]:grid-rows-[repeat(2,_minmax(0,_1fr))]
								max-[600px]:auto-cols-[calc((100%_-_12px)_/_2)] max-[600px]:gap-3 max-[600px]:mt-4 max-[600px]:overflow-x-auto
								max-[600px]:overflow-y-hidden max-[600px]:[scroll-snap-type:x_mandatory]
								max-[600px]:[overscroll-behavior-x:contain] max-[600px]:[scrollbar-width:thin] max-[600px]:pb-[5px]"
							>
								{visibleMovies.map((movie) => (
									<article
										className="movie-card overflow-hidden [border:1px_solid_#e8e3db] rounded-[9px] bg-white
										[transition:transform_0.25s,_box-shadow_0.25s] hover:[transform:translateY(-6px)]
										hover:shadow-[0_16px_30px_#3324121b] [&:hover_img]:[transform:scale(1.05)] max-[850px]:min-h-0
										max-[600px]:h-full max-[600px]:[scroll-snap-align:start]"
										key={movie.title}
									>
										<button
											className="poster-button block w-full h-[65%] p-0 border-0 bg-[#191614] overflow-hidden [&_img]:block [&_img]:w-full
												[&_img]:h-full [&_img]:object-cover [&_img]:[transition:transform_0.4s] max-[850px]:h-[55%]
												max-[600px]:h-[48%]"
											type="button"
											aria-label={`View ${movie.title}`}
											onClick={() => openMovie(movie)}
										>
											<img src={movie.image} alt="" />
										</button>
										<div
											className="card-body p-[18px_17px_20px] [&_h2]:m-[15px_0_18px] [&_h2]:text-[clamp(15px,_1.35vw,_21px)]
											[&_h2]:leading-[1.12] [&_h2]:font-normal [&_h2]:tracking-[-0.04em] [&_h2_a]:text-inherit
											[&_h2_a]:no-underline [&_h2_a:hover]:underline [&_h2_a:hover]:underline-offset-[3px] max-[600px]:p-[7px]
											max-[600px]:[&_h2]:m-[5px_0] max-[600px]:[&_h2]:text-[clamp(11px,_3.3vw,_14px)]
											max-[600px]:[&_h2]:leading-[1.1]"
										>
											<div
												className="card-meta flex justify-between gap-2 text-[9px] whitespace-nowrap [&_span:last-child]:inline-flex
												[&_span:last-child]:items-center [&_span:last-child]:gap-1 [&_span:last-child]:text-[#77716a]
												max-[600px]:text-[7px]"
											>
												<span>{movie.label}</span>
												<span>
													<Clock3 size={11} aria-hidden="true" />
													{movie.minutes} MIN
												</span>
											</div>
											<h2>
												<a href={movieShowtimePath(movie)}>{movie.title}</a>
											</h2>
											<div
												className="card-bottom flex justify-between items-center [&_button]:flex [&_button]:items-center [&_button]:gap-[7px]
												[&_button]:p-[3px_0] [&_button]:border-0 [&_button]:bg-transparent [&_button]:text-[10px] [&_button]:font-bold
												[&_button]:whitespace-nowrap max-[600px]:[&_button]:text-[7px]"
											>
												<span className="rating p-[4px_7px] bg-[#f2efe9] text-[#595550] text-[9px] max-[600px]:p-[2px_4px]">
													{movie.rating}
												</span>
												<button
													type="button"
													onClick={() => {
														window.location.href = movieShowtimePath(movie);
													}}
												>
													GET TICKETS{" "}
													<ChevronRight size={18} aria-hidden="true" />
												</button>
											</div>
										</div>
									</article>
								))}
							</div>
						) : (
							<p className="empty mt-8 text-[#76716a]">
								No films in this collection yet.
							</p>
						)}
					</div>
				</section>
			</main>
			{activeMovie && (
				<div
					className="modal-backdrop fixed inset-0 z-[40] grid place-items-center p-4 bg-[#000a]"
					onClick={closeMovie}
				>
					<div
						className="movie-modal relative grid grid-cols-[40%_1fr] w-[min(700px,_100%)] max-h-[calc(100dvh_-_32px)]
							overflow-y-auto [overscroll-behavior:contain] rounded-[10px] bg-[#f8f5ef] shadow-[0_24px_70px_#0005]
							[&_>_div]:p-[48px_30px] [&_h2]:text-[30px] [&_h2]:font-normal [&_p]:leading-[1.5] [&_p]:text-[#666]
							[&_.trailer-unavailable]:text-[#946e42] [&_.trailer-unavailable]:text-[12px] max-[600px]:grid-cols-[1fr]
							max-[600px]:w-[min(400px,_100%)] max-[600px]:[&_>_div]:p-5 max-[600px]:[&_h2]:m-[12px_0]
							max-[600px]:[&_h2]:text-[clamp(21px,_6vw,_28px)] max-[600px]:[&_p]:m-0 max-[600px]:[&_p]:text-[13px]"
						role="dialog"
						aria-modal="true"
						aria-label={activeMovie.title}
						onClick={(event) => event.stopPropagation()}
					>
						<button
							className="modal-close grid place-items-center absolute top-3 right-3 w-8 h-8 border-0 rounded-[50%] bg-white"
							type="button"
							aria-label="Close"
							onClick={closeMovie}
						>
							<X size={20} aria-hidden="true" />
						</button>
						<img
							className="modal-poster w-full h-full min-h-80 block object-cover max-[600px]:w-full
							max-[600px]:h-[clamp(120px,_26dvh,_210px)] max-[600px]:min-h-0"
							src={activeMovie.image}
							alt=""
						/>
						<div>
							<small
								className="modal-meta flex items-center flex-wrap gap-3 [&_span:last-child]:inline-flex [&_span:last-child]:items-center
								[&_span:last-child]:gap-[5px]"
							>
								<span>{activeMovie.label}</span>
								<span>
									<Clock3 size={13} aria-hidden="true" />
									{activeMovie.minutes} MIN
								</span>
							</small>
							<h2>{activeMovie.title}</h2>
							<p>{activeMovie.description}</p>
							<p className="trailer-unavailable">
								Trailer is not available yet.
							</p>
							<a
								className="modal-tickets inline-flex items-center gap-2 mt-5 p-[12px_16px] rounded-[4px] bg-[#111] text-white
								no-underline text-[11px] font-bold"
								href={movieShowtimePath(activeMovie)}
							>
								VIEW SHOWTIMES <ArrowRight size={14} aria-hidden="true" />
							</a>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
export default Page;
