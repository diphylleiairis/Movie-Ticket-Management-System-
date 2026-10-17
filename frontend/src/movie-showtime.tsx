import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowRight, Dot } from "lucide-react";
import { demoCinemas, demoShowtimeDates, demoShowtimeHeroLabel, movies, readDemoScreening, seatSelectionPath, showtimeDateKey } from "./demo-movie-data";
import SiteHeader from "./site-header";
import BookingRecovery from "./shared/booking-recovery";
import ErrorPage from "./shared/error-page";

const dates = demoShowtimeDates();

export default function MovieShowtime() {
	const [params] = useSearchParams();
	const movie = movies.find((item) => item.slug === params.get("movie"));
	const previousScreening = readDemoScreening(params);
	const [selectedDate, setSelectedDate] = useState(() => previousScreening
		? dates.findIndex((date) => showtimeDateKey(date) === showtimeDateKey(previousScreening.date))
		: 0);
	const [selectedShowtime, setSelectedShowtime] = useState(() => previousScreening
		? `${demoCinemas.indexOf(previousScreening.cinema)}-${previousScreening.time}`
		: "");
	const [scrolled, setScrolled] = useState(false);

	if (!movie) {
		return params.has("movie") ? <ErrorPage status={404} /> : <BookingRecovery params={params} />;
	}

	const cinemaIndex = demoCinemas.findIndex((cinema, index) =>
		cinema.times.some((time) => selectedShowtime === `${index}-${time}`));
	const cinema = demoCinemas[cinemaIndex];
	const time = cinema?.times.find((item) => selectedShowtime === `${cinemaIndex}-${item}`);
	const date = dates[selectedDate];
	const canSelectSeats = Boolean(movie && date && cinema && time);

	return (
		<div
			className="showtime-page w-full h-dvh overflow-y-auto bg-[#f7f4ed] text-[#171717] [&_>_main]:pt-[94px]
				max-[650px]:[&_>_main]:pt-18"
			onScroll={(event) => setScrolled(event.currentTarget.scrollTop > 20)}
		>
			<SiteHeader currentStep={2} scrolled={scrolled} />
			<main>
				<section
					className="showtime-hero h-[clamp(230px,_24vw,_360px)] flex items-end [background-size:cover]
						[background-position:center_42%] text-white [&_>_div]:w-full [&_>_div]:p-[0_clamp(24px,_4.5vw,_72px)_32px]
						[&_small]:text-[10px] [&_small]:font-bold [&_small]:tracking-[.05em] [&_h1]:m-[12px_0_0]
						[&_h1]:text-[clamp(32px,_4vw,_56px)] [&_h1]:font-normal [&_h1]:tracking-[-.045em] max-[650px]:h-[210px]"
					style={{
						backgroundImage: `linear-gradient(90deg, #0c0c0ccc, #17100a55), url(${movie.image})`,
					}}
				>
					<div>
						<small>{demoShowtimeHeroLabel}</small>
						<h1>{movie.title}</h1>
					</div>
				</section>
				<div className="showtime-content grid grid-cols-[minmax(210px,_30%)_minmax(0,_1fr)] gap-[clamp(28px,_4vw,_56px)]
					max-w-[1450px] m-auto p-[52px_clamp(24px,_4.5vw,_72px)_70px] max-[650px]:grid-cols-[1fr] max-[650px]:pt-7">
					<aside className="showtime-movie [&_img]:w-full [&_img]:aspect-[2_/_3] [&_img]:object-cover [&_img]:rounded-[6px] [&_img]:block
						[&_dl]:m-[14px_0] [&_dl]:text-[12px] [&_dl_div]:flex [&_dl_div]:justify-between [&_dl_div]:gap-3
						[&_dl_div]:p-[11px_0] [&_dl_div]:[border-bottom:1px_solid_#e5ded4] [&_dt]:text-[#77716a] [&_dd]:m-0
						[&_dd]:text-right [&_dd]:font-semibold max-[650px]:grid max-[650px]:grid-cols-[110px_1fr]
						max-[650px]:items-start max-[650px]:gap-4 max-[650px]:[&_dl]:mt-[0]">
						<img src={movie.image} alt={`${movie.title} poster`} />
						<dl>
							<div>
								<dt>Rating</dt>
								<dd>{movie.rating}</dd>
							</div>
							<div>
								<dt>Runtime</dt>
								<dd>
									{Math.floor(movie.minutes / 60)}h {movie.minutes % 60}m (
									{movie.minutes} Min)
								</dd>
							</div>
						</dl>
					</aside>
					<div className="showtime-details [&_section]:pb-7 [&_section]:mb-[27px] [&_section]:[border-bottom:1px_solid_#e5ded4]
						[&_section:last-child]:border-0 [&_section:last-child]:mb-[0] [&_h2]:m-[0_0_18px] [&_h2]:text-[22px]
						[&_h2]:font-normal max-[650px]:[&_h2]:text-[19px]">
						<section className="showtime-synopsis [&_p]:max-w-[800px] [&_p]:m-0 [&_p]:text-[#77716a] [&_p]:text-[13px] [&_p]:leading-[1.7]">
							<h2>The Synopsis</h2>
							<p>{movie.description}</p>
						</section>
						<section className="showtime-dates">
							<h2>1. Select Date</h2>
							<div className="date-options flex flex-wrap gap-[10px] [&_button]:min-w-[58px] [&_button]:flex [&_button]:flex-col
								[&_button]:items-center [&_button]:gap-[5px] [&_button]:p-[9px_12px] [&_button]:[border:1px_solid_#e5ded4]
								[&_button]:rounded-[5px] [&_button]:bg-white [&_button]:text-[#222] [&_small]:text-[9px]
								[&_span]:text-[17px] [&_button.selected]:bg-[#171717] [&_button.selected]:[border-color:#171717]
								[&_button.selected]:text-white">
								{dates.map((date, index) => (
									<button
										key={date.toDateString()}
										type="button"
										className={selectedDate === index ? "selected" : ""}
										aria-pressed={selectedDate === index}
										onClick={() => {
											setSelectedDate(index);
											setSelectedShowtime("");
										}}
									>
										<small>
											{new Intl.DateTimeFormat("en-US", { weekday: "short" })
												.format(date)
												.toUpperCase()}
										</small>
										<span>{date.getDate()}</span>
									</button>
								))}
							</div>
						</section>
						<section className="showtime-list">
							<h2>2. Choose Experience &amp; Showtime</h2>
							<p className="showtime-demo-note m-[-5px_0_16px] text-[#8a8176] text-[11px]">
								Sample schedule for layout preview. Live showtimes will come
								from the scheduling service.
							</p>
							{demoCinemas.map((cinema, cinemaIndex) => (
								<article className="cinema-showtimes mb-[18px] p-5 bg-white [border:1px_solid_#e5ded4] rounded-[8px]" key={cinema.name}>
									<div className="cinema-heading [&_h3]:flex [&_h3]:items-center [&_h3]:flex-wrap [&_h3]:m-[0_0_5px] [&_h3]:text-[13px]
										[&_p]:flex [&_p]:items-center [&_p]:flex-wrap [&_p]:m-[0_0_16px] [&_p]:text-[#77716a] [&_p]:text-[11px]">
										<div>
											<h3><span>{cinema.name}</span><Dot size={16} aria-hidden="true" /><span>{cinema.district}</span></h3>
											<p><span>{cinema.experience}</span><Dot size={15} aria-hidden="true" /><span>{cinema.language}</span></p>
										</div>
									</div>
									<div className="time-options flex flex-wrap gap-[10px] [&_button.selected]:bg-[#171717]
										[&_button.selected]:[border-color:#171717] [&_button.selected]:text-white [&_button]:p-[9px_13px]
										[&_button]:[border:1px_solid_#e5ded4] [&_button]:rounded-[4px] [&_button]:bg-white [&_button]:text-[11px]">
										{cinema.times.map((time) => {
											const key = `${cinemaIndex}-${time}`;
											return (
												<button
													key={time}
													type="button"
													className={selectedShowtime === key ? "selected" : ""}
													aria-pressed={selectedShowtime === key}
													onClick={() => setSelectedShowtime(key)}
												>
													{time}
												</button>
											);
										})}
									</div>
								</article>
							))}
						</section>
						<div className="showtime-continue flex flex-wrap items-center justify-between gap-4 pt-2 [&_p]:flex-1 [&_p]:min-w-50
							[&_p]:m-0 [&_p]:text-[#77716a] [&_p]:text-[13px] [&_p]:leading-[1.6] [&_button]:inline-flex
							[&_button]:items-center [&_button]:justify-center [&_button]:gap-[14px] [&_button]:min-h-[46px]
							[&_button]:p-[12px_22px] [&_button]:[border:1px_solid_#111] [&_button]:rounded-[5px] [&_button]:bg-[#111]
							[&_button]:text-white [&_button]:text-[12px] [&_button]:font-semibold
							[&_button:hover:not(:disabled)]:bg-[#333] [&_button:disabled]:cursor-not-allowed
							[&_button:disabled]:[border-color:#d8d3ca] [&_button:disabled]:bg-[#e7e2d9] [&_button:disabled]:text-[#77716a]">
							<p id="showtime-selection-status" role="status">
								{canSelectSeats
									? `${cinema.name} · ${date.toLocaleDateString("en-GB")} · ${time}`
									: "Choose a date, cinema and showtime to continue."}
							</p>
							<button
								type="button"
								disabled={!canSelectSeats}
								aria-describedby="showtime-selection-status"
								onClick={() => {
									if (canSelectSeats && time) window.location.href = seatSelectionPath(movie, date, cinemaIndex, time);
								}}
							>
								SELECT SEATS <ArrowRight size={16} aria-hidden="true" />
							</button>
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
