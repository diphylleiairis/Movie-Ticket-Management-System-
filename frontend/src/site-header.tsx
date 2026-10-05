import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, Check, ChevronDown, CircleUserRound, MapPin } from "lucide-react";
import "./cinema-discovery.css";
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
		<header className={`site-header${scrolled ? " scrolled" : ""}`}>
			<a href="/" className="brand" aria-label="The Lumière home">
				<span className="brand-mark">L</span>
				<span><strong>THE LUMIÈRE</strong><small>CINÉMATHÈQUE</small></span>
			</a>
			<nav className="steps" aria-label="Booking progress">
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
			<div className="header-actions">
				<div className="location-wrap">
					<button className="location-button" type="button" aria-expanded={locationOpen} onClick={() => setLocationOpen(!locationOpen)}>
						<MapPin size={17} aria-hidden="true" />{location}<ChevronDown size={13} aria-hidden="true" />
					</button>
					{locationOpen && <div className="location-menu">{locations.map((item) => <button key={item} type="button" onClick={() => { setLocation(item); setLocationOpen(false); }}>{item}</button>)}</div>}
				</div>
				<span className="divider" />
				<Link className="profile" to={authPagePath("login", currentLocation.pathname + currentLocation.search)} aria-label="Sign in to your account"><CircleUserRound size={18} aria-hidden="true" /></Link>
			</div>
		</header>
	);
}
