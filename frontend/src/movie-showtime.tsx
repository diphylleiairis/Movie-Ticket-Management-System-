import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowRight, Dot } from "lucide-react";
import { demoCinemas, demoShowtimeDates, demoShowtimeHeroLabel, movies, readDemoScreening, seatSelectionPath, showtimeDateKey } from "./demo-movie-data";
import SiteHeader from "./site-header";
import "./movie-showtime.css";

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
		return (
			<main className="showtime-missing">
				<h1>Movie not found</h1>
				<a href="/">Back to movies</a>
			</main>
		);
	}

	const cinemaIndex = demoCinemas.findIndex((cinema, index) =>
		cinema.times.some((time) => selectedShowtime === `${index}-${time}`));
	const cinema = demoCinemas[cinemaIndex];
	const time = cinema?.times.find((item) => selectedShowtime === `${cinemaIndex}-${item}`);
	const date = dates[selectedDate];
	const canSelectSeats = Boolean(movie && date && cinema && time);

	return (
		<div
			className="showtime-page"
			onScroll={(event) => setScrolled(event.currentTarget.scrollTop > 20)}
		>
			<SiteHeader currentStep={2} scrolled={scrolled} />
			<main>
				<section
					className="showtime-hero"
					style={{
						backgroundImage: `linear-gradient(90deg, #0c0c0ccc, #17100a55), url(${movie.image})`,
					}}
				>
					<div>
						<small>{demoShowtimeHeroLabel}</small>
						<h1>{movie.title}</h1>
					</div>
				</section>
				<div className="showtime-content">
					<aside className="showtime-movie">
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
					<div className="showtime-details">
						<section className="showtime-synopsis">
							<h2>The Synopsis</h2>
							<p>{movie.description}</p>
						</section>
						<section className="showtime-dates">
							<h2>1. Select Date</h2>
							<div className="date-options">
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
							<p className="showtime-demo-note">
								Sample schedule for layout preview. Live showtimes will come
								from the scheduling service.
							</p>
							{demoCinemas.map((cinema, cinemaIndex) => (
								<article className="cinema-showtimes" key={cinema.name}>
									<div className="cinema-heading">
										<div>
											<h3><span>{cinema.name}</span><Dot size={16} aria-hidden="true" /><span>{cinema.district}</span></h3>
											<p><span>{cinema.experience}</span><Dot size={15} aria-hidden="true" /><span>{cinema.language}</span></p>
										</div>
									</div>
									<div className="time-options">
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
						<div className="showtime-continue">
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
