import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, Check, ChevronDown, CircleUserRound, MapPin } from "lucide-react";
import { authPagePath } from "./features/identity/auth-navigation";

const locations = [
	"Quận 1, TP. Hồ Chí Minh",
	"Quận 3, TP. Hồ Chí Minh",
	"Thủ Đức, TP. Hồ Chí Minh",
];

type SiteHeaderProps = {
	currentStep: 1 | 2 | 3 | 4;
	scrolled: boolean;
	showtimeHref?: string;
	seatSelectionHref?: string;
};

export default function SiteHeader({ currentStep, scrolled, showtimeHref, seatSelectionHref }: SiteHeaderProps) {
	const currentLocation = useLocation();
	const [location, setLocation] = useState(locations[0]);
	const [locationOpen, setLocationOpen] = useState(false);

	return (
		<header className={`site-header fixed inset-[0_0_auto] z-[20] h-[94px] p-[0_clamp(24px,_4.5vw,_72px)] flex items-center
			justify-between gap-5 bg-[#f8f5ef] [border-bottom:1px_solid_#e7e1d7] [transition:box-shadow_0.3s]
			[&.scrolled]:shadow-[0_7px_24px_#1b130e24] max-[600px]:h-18${scrolled ? " scrolled" : ""}`}>
			<a href="/" className="brand flex items-center gap-3 text-inherit no-underline flex-none [&_>_span:last-child]:flex
				[&_>_span:last-child]:flex-col [&_strong]:text-[19px] [&_strong]:font-normal [&_strong]:tracking-[-0.05em]
				[&_strong]:whitespace-nowrap [&_small]:mt-1 [&_small]:text-[8px] [&_small]:tracking-[0.06em]
				max-[600px]:[&_strong]:text-[16px] max-[440px]:[&_small]:hidden" aria-label="The Lumière home">
				<span className="brand-mark grid place-items-center w-9 h-9 rounded-[50%] bg-[#0e0e0e] text-white font-[Georgia,_serif]
					text-[22px] [font-weight:normal] not-italic leading-[normal] max-[440px]:w-[30px] max-[440px]:h-[30px]">L</span>
				<span><strong>THE LUMIÈRE</strong><small>CINÉMATHÈQUE</small></span>
			</a>
			<nav className="steps flex items-center gap-[clamp(10px,_2vw,_32px)] text-[#95918d] text-[11px] whitespace-nowrap
				[&_span]:flex [&_span]:items-center [&_span]:gap-2 [&_a]:flex [&_a]:items-center [&_a]:gap-2
				[&_a]:text-inherit [&_a]:no-underline [&_a:hover]:text-[#111] [&_a:hover]:underline
				[&_a:hover]:underline-offset-[3px] [&_.current]:text-[#111] [&_.current]:font-semibold [&_b]:text-[10px]
				[&_svg]:ml-1 [&_svg]:text-[#c8c2ba] [&_svg]:flex-none max-[1160px]:hidden" aria-label="Booking progress">
				{currentStep === 1 ? (
					<span className="current" aria-current="step"><b>01</b> Now Showing <ArrowRight size={12} aria-hidden="true" /></span>
				) : (
					<a href="/">{currentStep >= 3 ? <Check size={13} color="#29a350" aria-hidden="true" /> : <b>01</b>} Now Showing <ArrowRight size={12} aria-hidden="true" /></a>
				)}
				{currentStep >= 3 && showtimeHref ? (
					<a href={showtimeHref}><Check size={13} color="#29a350" aria-hidden="true" /> Showtimes &amp; Tickets <ArrowRight size={12} aria-hidden="true" /></a>
				) : (
					<span className={currentStep === 2 ? "current" : ""} aria-current={currentStep === 2 ? "step" : undefined}><b>02</b> Showtimes &amp; Tickets <ArrowRight size={12} aria-hidden="true" /></span>
				)}
				{currentStep === 4 && seatSelectionHref ? (
					<a href={seatSelectionHref}><Check size={13} color="#29a350" aria-hidden="true" /> Seat Selection <ArrowRight size={12} aria-hidden="true" /></a>
				) : (
					<span className={currentStep === 3 ? "current" : ""} aria-current={currentStep === 3 ? "step" : undefined}><b>03</b> Seat Selection <ArrowRight size={12} aria-hidden="true" /></span>
				)}
				<span className={currentStep === 4 ? "current" : ""} aria-current={currentStep === 4 ? "step" : undefined}><b>04</b> Payment</span>
			</nav>
			<div className="header-actions flex items-center gap-5 flex-none max-[600px]:gap-3">
				<div className="location-wrap relative">
					<button className="location-button flex items-center gap-2 p-[7px_0] bg-none border-0 text-[11px] whitespace-nowrap
						[&_svg]:flex-none max-[600px]:max-w-[125px] max-[600px]:overflow-hidden max-[600px]:text-ellipsis" type="button" aria-expanded={locationOpen} onClick={() => setLocationOpen(!locationOpen)}>
						<MapPin size={17} aria-hidden="true" />{location}<ChevronDown size={13} aria-hidden="true" />
					</button>
					{locationOpen && <div className="location-menu absolute top-[calc(100%_+_12px)] right-0 min-w-[225px] p-[7px] [border:1px_solid_#e6dfd5]
						rounded-[8px] bg-white shadow-[0_14px_30px_#0002] [&_button]:block [&_button]:w-full [&_button]:p-[9px]
						[&_button]:border-0 [&_button]:bg-none [&_button]:text-left [&_button]:text-[12px]
						[&_button:hover]:bg-[#f3efe8]">{locations.map((item) => <button key={item} type="button" onClick={() => { setLocation(item); setLocationOpen(false); }}>{item}</button>)}</div>}
				</div>
				<span className="divider h-[26px] [border-left:1px_solid_#e0d9cf] max-[600px]:hidden" />
				<Link className="profile grid place-items-center w-8 h-8 border-0 rounded-[50%] text-[#e9dbcd] bg-[#151515] no-underline
					max-[440px]:w-7 max-[440px]:h-7" to={authPagePath("login", currentLocation.pathname + currentLocation.search)} aria-label="Sign in to your account"><CircleUserRound size={18} aria-hidden="true" /></Link>
			</div>
		</header>
	);
}
