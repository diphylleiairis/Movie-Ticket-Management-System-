import { ArrowRight, House, RotateCcw } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import "./recovery-page.css";

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
			className={`error-page${serverError ? " error-page-server" : ""}`}
			aria-labelledby="error-title"
		>
			<Link to="/" className="recovery-brand">
				THE LUMIÈRE <span>CINÉMATHÈQUE</span>
			</Link>
			<div className="error-page-content">
				<p className="recovery-eyebrow">
					{serverError ? "A BRIEF INTERMISSION" : "LET'S FIND YOUR NEXT SCENE"}
				</p>
				<span className="error-page-code">{status}</span>
				<h1 id="error-title">{message.title}</h1>
				<p className="recovery-description">{message.description}</p>
				<div className="recovery-actions">
					{serverError ? (
						<button
							className="recovery-primary"
							type="button"
							onClick={() => window.location.reload()}
						>
							<RotateCcw size={17} aria-hidden="true" />
							Try again
						</button>
					) : (
						<Link
							className="recovery-primary"
							to={status === 401 ? "/login" : "/movie-list"}
						>
							{status === 401 ? "Sign in" : "Explore movies"}
							<ArrowRight size={17} aria-hidden="true" />
						</Link>
					)}
					<Link className="recovery-secondary" to="/">
						<House size={16} aria-hidden="true" />
						Back to home
					</Link>
				</div>
			</div>
			<p className="error-page-footer">
				THE LUMIÈRE · EVERY GREAT STORY DESERVES A SCREEN
			</p>
		</main>
	);
}
