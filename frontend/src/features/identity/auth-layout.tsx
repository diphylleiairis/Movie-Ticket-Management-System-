import { useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { X } from "lucide-react";
import { demoFeaturedHero } from "../../demo-movie-data";
import SiteHeader from "../../site-header";
import "./auth-page.css";

export type AuthLayoutContext = {
	openInfo: (title: string) => void;
};

export default function AuthLayout() {
	const { pathname } = useLocation();
	const mode = pathname === "/register" ? "register" : pathname === "/forgot-password" ? "forgot-password" : "login";
	const registration = mode === "register";
	const [scrolled, setScrolled] = useState(false);
	const [infoTitle, setInfoTitle] = useState("");
	const infoDialog = useRef<HTMLDialogElement>(null);
	const openInfo = (title: string) => {
		setInfoTitle(title);
		infoDialog.current?.showModal();
	};

	return (
		<div
			className={`auth-page auth-page-${mode}`}
			onScroll={(event) => setScrolled(event.currentTarget.scrollTop > 20)}
		>
			<SiteHeader currentStep={1} scrolled={scrolled} />
			<main className="auth-content">
				<aside className="auth-feature" aria-label="Featured film">
					<img
						src={demoFeaturedHero.movie.image}
						alt="Desert landscape from Chronicles of Dust"
					/>
					<span className="auth-feature-tag">
						THE BIG SCREEN. THE FULL EXPERIENCE.
					</span>
					<div className="auth-feature-copy">
						<span className="auth-feature-line" />
						<h2>
							{registration ? (
								<>
									A place for people
									<br />
									who love cinema.
								</>
							) : (
								<>
									Every great story
									<br />
									starts here.
								</>
							)}
						</h2>
						<p>
							{registration
								? "Discover remarkable films, save your favorites and make your next night at the movies your own."
								: "Extraordinary films. Unforgettable evenings. Your next cinema experience is waiting."}
						</p>
					</div>
					<div className="auth-feature-credit">
						<div>
							<small>NOW SHOWING AT THE LUMIÈRE</small>
							<span>{demoFeaturedHero.movie.title}</span>
						</div>
						<span>IMAX · 70MM</span>
					</div>
				</aside>
				<Outlet context={{ openInfo } satisfies AuthLayoutContext} />
			</main>
			<footer className="auth-footer">
				<span>© {new Date().getFullYear()} The Lumière Cinémathèque</span>
				<nav aria-label="Account information">
					<button type="button" onClick={() => openInfo("Privacy Policy")}>
						Privacy Policy
					</button>
					<button type="button" onClick={() => openInfo("Terms & Conditions")}>
						Terms &amp; Conditions
					</button>
					<button type="button" onClick={() => openInfo("Need help?")}>
						Need help?
					</button>
				</nav>
			</footer>
			<dialog
				className="auth-info-dialog"
				ref={infoDialog}
				aria-labelledby="auth-info-title"
			>
				<button
					className="auth-info-close"
					type="button"
					aria-label="Close information"
					onClick={() => infoDialog.current?.close()}
				>
					<X size={20} aria-hidden="true" />
				</button>
				<h2 id="auth-info-title">{infoTitle}</h2>
				<p>
					{infoTitle === "Need help?"
						? "Verify your registration email before signing in. If you forgot your password, use the password reset link with your current verified email."
						: "This information will be published before the account service is available."}
				</p>
				<button
					className="auth-submit"
					type="button"
					onClick={() => infoDialog.current?.close()}
				>
					BACK TO YOUR ACCOUNT
				</button>
			</dialog>
		</div>
	);
}
