import { useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { X } from "lucide-react";
import { demoFeaturedHero } from "../../demo-movie-data";
import SiteHeader from "../../site-header";

export type AuthLayoutContext = {
	openInfo: (title: string) => void;
};

export default function AuthLayout() {
	const { pathname } = useLocation();
	const mode = pathname === "/register" ? "register" : pathname === "/reset-password" ? "reset-password" : pathname === "/forgot-password" ? "forgot-password" : "login";
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
			className={`auth-page [--auth-gold:#e4b333] [--auth-accent:#825b13] flex flex-col w-full h-dvh overflow-y-auto
				text-[#34312e] bg-[#f8f5ef] [&_.brand-mark]:bg-[var(--auth-gold)] [&_.brand-mark]:text-[#171717]
				[&_.brand_small]:text-[color:var(--auth-accent)] [&_.profile]:[border:1px_solid_#e8e0d5]
				[&_.profile]:bg-white [&_.profile]:text-[#34312e] [&_input[type=checkbox]]:flex-none
				[&_input[type=checkbox]]:w-[14px] [&_input[type=checkbox]]:h-[14px] [&_input[type=checkbox]]:m-[2px_0_0]
				[&_input[type=checkbox]]:[accent-color:#825b13]
				[@media(min-width:_851px)_and_(max-height:_800px)]:[&.auth-page-register_.auth-eyebrow]:mb-2
				[@media(min-width:_851px)_and_(max-height:_800px)]:[&.auth-page-register_.auth-form-panel_h1]:mb-[9px]
				[@media(min-width:_851px)_and_(max-height:_800px)]:[&.auth-page-register_.auth-form-panel_h1]:text-[30px]
				[@media(min-width:_851px)_and_(max-height:_800px)]:[&.auth-page-register_.auth-intro]:mb-[14px]
				[@media(min-width:_851px)_and_(max-height:_800px)]:[&.auth-page-register_.auth-intro]:text-[13px]
				[@media(min-width:_851px)_and_(max-height:_800px)]:[&.auth-page-register_.auth-form-fields]:gap-3
				[@media(min-width:_851px)_and_(max-height:_800px)]:[&.auth-page-register_.auth-field_input]:min-h-[39px]
				[@media(min-width:_851px)_and_(max-height:_800px)]:[&.auth-page-register_.auth-field_input]:py-[9px]
				[@media(min-width:_851px)_and_(max-height:_800px)]:[&.auth-page-register_.auth-field_>_small]:mt-[6px]
				[@media(min-width:_851px)_and_(max-height:_800px)]:[&.auth-page-register_.auth-field_>_small]:text-[10px]
				[@media(min-width:_851px)_and_(max-height:_800px)]:[&.auth-page-register_.auth-divider]:my-3
				[@media(min-width:_851px)_and_(max-height:_800px)]:[&.auth-page-register_.auth-switch]:mt-[14px] auth-page-${mode}`}
			onScroll={(event) => setScrolled(event.currentTarget.scrollTop > 20)}
		>
			<SiteHeader currentStep={1} scrolled={scrolled} />
			<main className="auth-content flex-1 grid grid-cols-[minmax(0,_1.1fr)_minmax(0,_1fr)] items-center
				gap-[clamp(40px,_8vw,_130px)] w-full max-w-[1340px] m-[94px_auto_0] p-[24px_clamp(24px,_4.5vw,_72px)]
				[@media(min-width:_851px)_and_(max-height:_800px)]:gap-[clamp(36px,_7vw,_100px)]
				[@media(min-width:_851px)_and_(max-height:_800px)]:py-[18px] max-[850px]:grid-cols-[1fr]
				max-[850px]:max-w-[580px] max-[850px]:gap-6 max-[600px]:mt-18 max-[600px]:p-[16px_20px_24px]">
				<aside className="auth-feature relative self-stretch min-h-[430px] overflow-hidden isolate rounded-[10px] text-white
					bg-[#4a321e] after:absolute after:inset-0 after:z-[-1] after:content-['']
					after:[background:linear-gradient(180deg,_#24110615_15%,_#24110625_40%,_#120a04cf_100%)]
					[&_>_img]:absolute [&_>_img]:inset-0 [&_>_img]:z-[-2] [&_>_img]:w-full [&_>_img]:h-full [&_>_img]:object-cover
					[&_>_img]:object-[48%_center] max-[850px]:min-h-[250px] max-[600px]:min-h-55" aria-label="Featured film">
					<img
						src={demoFeaturedHero.movie.image}
						alt="Desert landscape from Chronicles of Dust"
					/>
					<span className="auth-feature-tag absolute top-7 left-7 right-7 w-[fit-content] p-[7px_9px] rounded-[3px] bg-[#111]
						text-white text-[9px] font-medium leading-[1.5] max-[850px]:top-[18px] max-[600px]:left-5
						max-[600px]:text-[8px]">
						THE BIG SCREEN. THE FULL EXPERIENCE.
					</span>
					<div className="auth-feature-copy absolute right-7 bottom-26 left-7 [&_h2]:m-[0_0_16px] [&_h2]:text-[clamp(28px,_3vw,_43px)]
						[&_h2]:font-normal [&_h2]:tracking-[-.025em] [&_h2]:leading-[1.13] [&_p]:max-w-[380px] [&_p]:m-0
						[&_p]:text-[#e4d9cc] [&_p]:text-[14px] [&_p]:leading-[1.65] max-[850px]:bottom-20
						max-[850px]:[&_h2]:text-[28px] max-[850px]:[&_h2]:mb-[10px] max-[850px]:[&_p]:text-[12px] max-[600px]:left-5
						max-[600px]:right-5 max-[600px]:bottom-[65px] max-[600px]:[&_h2]:text-[25px] max-[600px]:[&_p]:hidden">
						<span className="auth-feature-line block w-[30px] h-[2px] mb-4 bg-[var(--auth-gold)] max-[850px]:mb-[10px]" />
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
					<div className="auth-feature-credit absolute right-7 bottom-7 left-7 flex items-end justify-between gap-4 [&_>_div]:grid
						[&_>_div]:gap-2 [&_small]:text-[color:var(--auth-gold)] [&_small]:text-[8px] [&_small]:font-semibold
						[&_small]:leading-[1.5] [&_span]:text-[12px] [&_span]:leading-[1.4] [&.auth-feature-credit_>_span]:flex-none
						[&.auth-feature-credit_>_span]:text-[9px] max-[850px]:bottom-[18px] max-[600px]:left-5 max-[600px]:right-5
						max-[600px]:[&_span]:text-[10px] max-[600px]:[&.auth-feature-credit_>_span]:text-[8px]">
						<div>
							<small>NOW SHOWING AT THE LUMIÈRE</small>
							<span>{demoFeaturedHero.movie.title}</span>
						</div>
						<span>IMAX · 70MM</span>
					</div>
				</aside>
				<Outlet context={{ openInfo } satisfies AuthLayoutContext} />
			</main>
			<footer className="auth-footer flex flex-wrap items-center justify-between flex-none gap-4 min-h-15
				p-[18px_clamp(24px,_4.5vw,_72px)] [border-top:1px_solid_#e8e0d5] text-[#80796f] text-[10px] [&_nav]:flex
				[&_nav]:flex-wrap [&_nav]:gap-[22px] [&_button]:p-0 [&_button]:border-0 [&_button]:bg-none
				[&_button]:text-[#80796f] [&_button]:text-[10px] [&_button:hover]:text-[#34312e] [&_button:hover]:underline
				max-[600px]:p-[18px_20px] max-[600px]:[&_nav]:gap-4">
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
				className="auth-info-dialog w-[min(450px,_calc(100%_-_32px))] max-h-[calc(100dvh_-_32px)] p-8 overflow-y-auto
					[border:1px_solid_#e8e0d5] rounded-[10px] bg-[#f8f5ef] text-[#34312e] backdrop:bg-[#0008]
					[&_h2]:m-[0_20px_18px_0] [&_h2]:text-[26px] [&_h2]:font-normal [&_p]:text-[#77716a] [&_p]:text-[14px]
					[&_p]:leading-[1.7]"
				ref={infoDialog}
				aria-labelledby="auth-info-title"
			>
				<button
					className="auth-info-close absolute top-3 right-3 grid place-items-center w-[30px] h-[30px] p-0 border-0 rounded-[50%]
						bg-white text-[#34312e]"
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
					className="auth-submit flex items-center justify-center gap-3 w-full min-h-[43px] p-[12px_16px] border-0 rounded-[6px]
						bg-[var(--auth-gold)] text-[#171717] text-[12px] font-semibold no-underline
						[&:hover:not(:disabled)]:bg-[#d9a326] disabled:cursor-wait disabled:opacity-[.65]"
					type="button"
					onClick={() => infoDialog.current?.close()}
				>
					BACK TO YOUR ACCOUNT
				</button>
			</dialog>
		</div>
	);
}
