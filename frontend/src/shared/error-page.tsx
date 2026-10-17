import { ArrowRight, House, RotateCcw } from "lucide-react";
import { Link, useParams } from "react-router-dom";

const messages: Record<number, { title: string; description: string }> = {
	400: {
		title: "Something is missing",
		description:
			"This link is incomplete or invalid. Start from the movie collection to find your next screening.",
	},
	401: {
		title: "Your seat awaits",
		description: "Please sign in to your account to continue.",
	},
	403: {
		title: "Behind the velvet rope",
		description: "Your account does not have permission to access this page.",
	},
	404: {
		title: "This scene is missing",
		description:
			"The page you’re looking for may have moved, or the link may be incorrect. There’s still plenty to discover.",
	},
	410: {
		title: "The curtain has closed",
		description:
			"This page is no longer available. Explore the latest movies instead.",
	},
	429: {
		title: "A little intermission",
		description:
			"There have been too many requests. Please wait a moment before trying again.",
	},
	500: {
		title: "An unexpected intermission",
		description:
			"Something went wrong on our side. Please try again in a moment.",
	},
	502: {
		title: "A brief interruption",
		description:
			"We couldn’t reach a service needed for this page. Please try again shortly.",
	},
	503: {
		title: "We’ll be back on screen",
		description:
			"The service is temporarily unavailable. Please come back in a little while.",
	},
	504: {
		title: "The scene is taking longer",
		description:
			"A service took too long to respond. Please try again in a moment.",
	},
};

export default function ErrorPage({
	status: suppliedStatus,
}: {
	status?: number;
}) {
	const { status: routeStatus } = useParams();
	const candidate = suppliedStatus ?? Number(routeStatus);
	const status =
		Number.isInteger(candidate) && candidate >= 400 && candidate <= 599
			? candidate
			: 404;
	const serverError = status >= 500;
	const message =
		messages[status] ??
		(serverError
			? messages[500]
			: {
					title: "We couldn’t open this page",
					description:
						"This request could not be completed. Return to the movie collection to continue.",
				});
	return (
		<main
			className={`error-page flex-1 min-h-0 h-dvh overflow-y-auto p-[38px_clamp(24px,_6vw,_96px)_24px] flex flex-col
				text-[#fff8ef]
				[background:linear-gradient(90deg,_#090303d9,_#10030386),_url(/images/cinema_stage.jpg)_center_/_cover]
				[&_.recovery-eyebrow]:text-[#f3c190] [&_h1]:m-[20px_0_16px] [&_h1]:font-[Georgia,_Times_New_Roman,_serif]
				[&_h1]:text-[clamp(30px,_4vw,_48px)] [&_h1]:font-normal [&_h1]:leading-[1.15] [&_h1]:[text-wrap:balance]
				[&.error-page-server]:text-[#32211d]
				[&.error-page-server]:[background:linear-gradient(_90deg,_#ffc1b0_0%,_#ffc1b0f5_30%,_#ffc1b099_52%,_#ffc1b000_75%_),_url(/images/maintenance.png)_center_/_cover]
				[&.error-page-server_.error-page-content]:w-[min(490px,_48%)]
				[&.error-page-server_.error-page-code]:text-[#963e28] [&.error-page-server_.recovery-eyebrow]:text-[#6e392b]
				[&.error-page-server_.recovery-description]:text-[#6e392b]
				[&.error-page-server_.error-page-footer]:text-[#6e392b]
				[&.error-page-server_.recovery-primary]:[border-color:#843923]
				[&.error-page-server_.recovery-primary]:bg-[#843923]
				[&.error-page-server_.recovery-primary:hover]:bg-[#692a18]
				max-[700px]:[&.error-page-server]:[background-image:linear-gradient(#ffc1b0ed,_#ffc1b0e0),_url(/images/maintenance.png)]
				max-[700px]:[&.error-page-server_.error-page-content]:w-full${serverError ? " error-page-server" : ""}`}
			aria-labelledby="error-title"
		>
			<Link to="/" className="recovery-brand inline-flex flex-col gap-[6px] text-inherit text-[18px] font-bold tracking-[0.15em]
				no-underline [&_span]:text-[9px] [&_span]:tracking-[0.35em] [&_span]:font-normal">
				THE LUMIÈRE <span>CINÉMATHÈQUE</span>
			</Link>
			<div className="error-page-content w-[min(610px,_100%)] my-auto py-12">
				<p className="recovery-eyebrow m-[0_0_18px] text-[10px] font-bold tracking-[0.2em] leading-[1.7] text-[#b78554]">
					{serverError ? "A BRIEF INTERMISSION" : "LET'S FIND YOUR NEXT SCENE"}
				</p>
				<span className="error-page-code block font-[Georgia,_serif] text-[clamp(88px,_14vw,_160px)] leading-[1] text-[#f3c190]">{status}</span>
				<h1 id="error-title">{message.title}</h1>
				<p className="recovery-description max-w-[470px] m-0 text-[15px] leading-[1.8] text-[#d7c9c2]">{message.description}</p>
				<div className="recovery-actions flex items-center flex-wrap gap-[18px_28px] mt-8 max-[700px]:items-stretch
					max-[700px]:flex-col max-[700px]:gap-2">
					{serverError ? (
						<button
							className="recovery-primary inline-flex items-center justify-center gap-3 min-h-12 no-underline text-[13px]
								font-semibold p-[14px_22px] [border:1px_solid_#a46a34] rounded-[6px] bg-[#a46a34] text-white
								[transition:background_0.2s] hover:bg-[#895426]"
							type="button"
							onClick={() => window.location.reload()}
						>
							<RotateCcw size={17} aria-hidden="true" />
							Try again
						</button>
					) : (
						<Link
							className="recovery-primary inline-flex items-center justify-center gap-3 min-h-12 no-underline text-[13px]
								font-semibold p-[14px_22px] [border:1px_solid_#a46a34] rounded-[6px] bg-[#a46a34] text-white
								[transition:background_0.2s] hover:bg-[#895426]"
							to={status === 401 ? "/login" : "/movie-list"}
						>
							{status === 401 ? "Sign in" : "Explore movies"}
							<ArrowRight size={17} aria-hidden="true" />
						</Link>
					)}
					<Link className="recovery-secondary inline-flex items-center justify-center gap-3 min-h-12 no-underline text-[13px]
						font-semibold text-white p-[14px_22px] [border:1px_solid_#a46a34] bg-[#1a1a1a] rounded-[6px]
						hover:underline hover:bg-[#000000]" to="/">
						<House size={16} aria-hidden="true" />
						Back to home
					</Link>
				</div>
			</div>
			<p className="error-page-footer m-0 text-[9px] tracking-[0.16em] leading-[1.8] text-[#d7c9c2]">
				THE LUMIÈRE · EVERY GREAT STORY DESERVES A SCREEN
			</p>
		</main>
	);
}
