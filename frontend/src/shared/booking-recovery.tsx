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
		<main className="booking-recovery flex-1 min-h-0 h-dvh overflow-y-auto p-[38px_clamp(24px,_6vw,_96px)_24px] text-[#28231f]
			[background:radial-gradient(ellipse_at_50%_30%,_#ede0cd80,_transparent_65%),_#f8f5ef] [&_h1]:m-[20px_0_16px]
			[&_h1]:font-[Georgia,_Times_New_Roman,_serif] [&_h1]:text-[clamp(30px,_4vw,_48px)] [&_h1]:font-normal
			[&_h1]:leading-[1.15] [&_h1]:[text-wrap:balance] [&_.recovery-description]:mx-auto
			[&_.recovery-description]:text-[#746b63] [&_.recovery-actions]:justify-center" aria-labelledby="booking-recovery-title">
			<Link className="recovery-brand inline-flex flex-col gap-[6px] text-inherit text-[18px] font-bold tracking-[0.15em]
				no-underline [&_span]:text-[9px] [&_span]:tracking-[0.35em] [&_span]:font-normal" to="/">
				THE LUMIÈRE <span>CINÉMATHÈQUE</span>
			</Link>
			<section className="booking-recovery-card max-w-[720px] m-[clamp(30px,_7vh,_80px)_auto_36px] p-[clamp(24px,_5vw,_56px)]
				[border:1px_solid_#e6dfd5] rounded-[18px] bg-[#fffdfa] shadow-[0_16px_60px_#4d34200a] text-center">
				<div className="booking-recovery-icon grid place-items-center w-19 h-19 m-[0_auto_26px] [border:1px_solid_#e5d5bf]
					rounded-[50%] bg-[#f6eee3] text-[#a46a34]">
					<Icon size={32} strokeWidth={1.5} aria-hidden="true" />
				</div>
				<p className="recovery-eyebrow m-[0_0_18px] text-[10px] font-bold tracking-[0.2em] leading-[1.7] text-[#b78554]">A GREAT NIGHT, ONE STEP AT A TIME</p>
				<h1 id="booking-recovery-title">{titles[nextStep]}</h1>
				<p className="recovery-description max-w-[470px] m-0 text-[15px] leading-[1.8] text-[#d7c9c2]">{descriptions[nextStep]}</p>
				{movie && (
					<p className="booking-recovery-movie grid gap-[6px] m-[24px_0_0] text-[12px] text-[#746b63] [&_strong]:text-[#342b24]
						[&_strong]:text-[16px]">
						Your movie <strong>{movie.title}</strong>
					</p>
				)}
				<ol className="booking-recovery-steps grid grid-cols-[repeat(4,_1fr)] gap-3 m-[32px_0_0] p-[26px_0]
					[border-block:1px_solid_#eee7dd] list-none [&_li]:flex [&_li]:flex-col [&_li]:items-center [&_li]:gap-3
					[&_li]:text-[11px] [&_li]:leading-[1.5] [&_li]:text-[#81766b] [&_li_>_span]:grid
					[&_li_>_span]:place-items-center [&_li_>_span]:w-8 [&_li_>_span]:h-8 [&_li_>_span]:[border:1px_solid_#e4dcd2]
					[&_li_>_span]:rounded-[50%] [&_li_>_span]:text-[11px] [&_.active]:text-[#895426] [&_.active]:font-bold
					[&_.active_>_span]:text-white [&_.active_>_span]:[border-color:#a46a34] [&_.active_>_span]:bg-[#a46a34]
					[&_.complete_>_span]:text-[#447650] [&_.complete_>_span]:bg-[#edf4ec]
					[&_.complete_>_span]:[border-color:#d3e3d1] max-[700px]:grid-cols-[repeat(2,_1fr)] max-[700px]:gap-5" aria-label="Booking steps">
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
				<div className="recovery-actions flex items-center flex-wrap gap-[18px_28px] mt-8 max-[700px]:items-stretch
					max-[700px]:flex-col max-[700px]:gap-2">
					<Link className="recovery-primary inline-flex items-center justify-center gap-3 min-h-12 no-underline text-[13px]
						font-semibold p-[14px_22px] [border:1px_solid_#a46a34] rounded-[6px] bg-[#a46a34] text-white
						[transition:background_0.2s] hover:bg-[#895426]" to={href}>
						{
							["Browse movies", "Back to showtimes", "Back to seat selection"][
								nextStep
							]
						}
						<ArrowRight size={17} aria-hidden="true" />
					</Link>
					<Link className="recovery-secondary inline-flex items-center justify-center gap-3 min-h-12 no-underline text-[13px]
						font-semibold text-white p-[14px_22px] [border:1px_solid_#a46a34] bg-[#1a1a1a] rounded-[6px]
						hover:underline hover:bg-[#000000]" to="/">
						Back to home
					</Link>
				</div>
			</section>
		</main>
	);
}
