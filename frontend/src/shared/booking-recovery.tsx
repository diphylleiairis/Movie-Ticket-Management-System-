import {
	ArrowRight,
	CalendarDays,
	Check,
	Film,
	Armchair,
	CreditCard,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
	movies,
	movieShowtimePath,
	readDemoScreening,
} from "../demo-movie-data";
import "./recovery-page.css";

const steps = [
	"Choose a movie",
	"Choose a showtime",
	"Select your seats",
	"Payment",
];

export default function BookingRecovery({
	params,
	checkout = false,
}: {
	params: URLSearchParams;
	checkout?: boolean;
}) {
	const movie = movies.find((item) => item.slug === params.get("movie"));
	const screening = readDemoScreening(params);
	const nextStep = !movie ? 0 : checkout && screening ? 2 : 1;
	const backParams = new URLSearchParams(params);
	backParams.delete("seats");
	const href =
		nextStep === 0
			? "/movie-list"
			: nextStep === 1
				? movieShowtimePath(movie!)
				: `/seat-selection?${backParams}`;
	const Icon = [Film, CalendarDays, Armchair, CreditCard][nextStep];
	const titles = [
		"Your movie night starts here",
		"First, choose your showtime",
		"Your perfect seat is waiting",
	];
	const descriptions = [
		"Choose a movie you'd love to see, then pick a cinema and showtime. We'll guide you to your seat from there.",
		"Select a date, cinema and showtime before choosing your seats.",
		"Choose between 1 and 10 available seats before continuing to payment.",
	];
	return (
		<main className="booking-recovery" aria-labelledby="booking-recovery-title">
			<Link className="recovery-brand" to="/">
				THE LUMIÈRE <span>CINÉMATHÈQUE</span>
			</Link>
			<section className="booking-recovery-card">
				<div className="booking-recovery-icon">
					<Icon size={32} strokeWidth={1.5} aria-hidden="true" />
				</div>
				<p className="recovery-eyebrow">A GREAT NIGHT, ONE STEP AT A TIME</p>
				<h1 id="booking-recovery-title">{titles[nextStep]}</h1>
				<p className="recovery-description">{descriptions[nextStep]}</p>
				{movie && (
					<p className="booking-recovery-movie">
						Your movie <strong>{movie.title}</strong>
					</p>
				)}
				<ol className="booking-recovery-steps" aria-label="Booking steps">
					{steps.map((step, index) => (
						<li
							key={step}
							className={
								index === nextStep
									? "active"
									: index < nextStep
										? "complete"
										: ""
							}
							aria-current={index === nextStep ? "step" : undefined}
						>
							<span>
								{index < nextStep ? (
									<Check size={15} aria-hidden="true" />
								) : (
									`0${index + 1}`
								)}
							</span>
							{step}
						</li>
					))}
				</ol>
				<div className="recovery-actions">
					<Link className="recovery-primary" to={href}>
						{
							["Browse movies", "Back to showtimes", "Back to seat selection"][
								nextStep
							]
						}
						<ArrowRight size={17} aria-hidden="true" />
					</Link>
					<Link className="recovery-secondary" to="/">
						Back to home
					</Link>
				</div>
			</section>
		</main>
	);
}
