import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
	demoSeatLayout,
	movies,
	movieShowtimePath,
	readDemoScreening,
} from "../../demo-movie-data";
import SiteHeader from "../../site-header";
import { maxSeatsPerBooking } from "./booking-limits";
import { readDemoSeatSelection, ticketCheckoutPath } from "./selection";
import "./seat-selection.css";

const formatPrice = (amount: number) => new Intl.NumberFormat("vi-VN", {
	style: "currency", currency: "VND", maximumFractionDigits: 0,
}).format(amount);

export default function SeatSelection() {
	const params = new URLSearchParams(window.location.search);
	const screening = readDemoScreening(params);
	const [selectedSeats, setSelectedSeats] = useState<string[]>(() => readDemoSeatSelection(params)?.seats ?? []);
	const [scrolled, setScrolled] = useState(false);
	const columns = Array.from({ length: demoSeatLayout.columns }, (_, index) => index + 1);

	if (!screening) {
		const movie = movies.find((item) => item.slug === params.get("movie"));
		return (
			<main className="seat-selection-missing">
				<h1>Choose a showtime first</h1>
				<p>Select a valid date, cinema and showtime before choosing your seats.</p>
				<a href={movie ? movieShowtimePath(movie) : "/movie-list"}><ArrowLeft size={16} aria-hidden="true" />{movie ? "Back to showtimes" : "Browse movies"}</a>
			</main>
		);
	}

	const { movie, date, cinema, time } = screening;
	const showtimeHref = `/movie-showtime?${params}`;
	const sortedSeats = [...selectedSeats].sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
	const atSeatLimit = selectedSeats.length >= maxSeatsPerBooking;
	const ticketSubtotal = selectedSeats.length * demoSeatLayout.ticketPrice;
	const serviceFee = selectedSeats.length ? demoSeatLayout.serviceFee : 0;
	const total = ticketSubtotal + serviceFee;
	const dateLabel = `${new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(date)} · ${time}`;
	const toggleSeat = (seat: string) => {
		if (demoSeatLayout.bookedSeats.includes(seat)) return;
		setSelectedSeats((selected) => {
			if (selected.includes(seat)) return selected.filter((item) => item !== seat);
			return selected.length < maxSeatsPerBooking ? [...selected, seat] : selected;
		});
	};

	return (
		<div className="seat-selection-page" onScroll={(event) => setScrolled(event.currentTarget.scrollTop > 20)}>
			<SiteHeader currentStep={3} scrolled={scrolled} showtimeHref={showtimeHref} />
			<main className="seat-selection-content">
				<section className="seat-selection-hall" aria-label="Choose your seats">
					<div className="seat-selection-map-scroll" tabIndex={0} aria-label="Seat layout; scroll horizontally to see all seats on small screens">
						<div className="seat-selection-map">
							<div className="seat-selection-screen"><div /><span>STAGED SCREEN FOCUS</span></div>
							<div className="seat-selection-rows">
								{demoSeatLayout.rows.map((row) => (
									<div className="seat-selection-row" key={row} role="group" aria-label={`Row ${row}`}>
										<span className="seat-selection-row-label" aria-hidden="true">{row}</span>
										{columns.map((column) => {
											const seat = `${row}${column}`;
											const booked = demoSeatLayout.bookedSeats.includes(seat);
											const selected = selectedSeats.includes(seat);
											return (
												<button
													key={seat}
													type="button"
													className={`seat-selection-seat${booked ? " booked" : selected ? " selected" : ""}`}
													disabled={booked || (atSeatLimit && !selected)}
													aria-describedby="seat-selection-limit"
													aria-pressed={selected}
													aria-label={`Row ${row}, Seat ${column}, ${booked ? "booked" : selected ? "selected" : "available"}`}
													onClick={() => toggleSeat(seat)}
												>{column}</button>
											);
										})}
										<span className="seat-selection-row-label" aria-hidden="true">{row}</span>
									</div>
								))}
							</div>
						</div>
					</div>
					<div className="seat-selection-legend" aria-label="Seat status legend">
						<span><i className="available" aria-hidden="true" />Available</span>
						<span><i className="selected" aria-hidden="true" />Selected</span>
						<span><i className="booked" aria-hidden="true" />Booked</span>
					</div>
					<p className="seat-selection-limit" id="seat-selection-limit" role="status">
						{selectedSeats.length}/{maxSeatsPerBooking} seats selected.
						{atSeatLimit ? " Deselect a seat to choose another." : ` Maximum ${maxSeatsPerBooking} seats per booking.`}
					</p>
				</section>
				<aside className="seat-selection-summary" aria-labelledby="seat-selection-title">
					<span className="seat-selection-experience">{cinema.experience.toUpperCase()}</span>
					<h1 id="seat-selection-title">{movie.title}</h1>
					<p className="seat-selection-venue">{cinema.name} · {cinema.district}</p>
					<dl className="seat-selection-details">
						<div><dt>Date &amp; Time</dt><dd>{dateLabel}</dd></div>
						<div><dt>Seats Chosen</dt><dd>{sortedSeats.length ? sortedSeats.join(", ") : "Select your seats"}</dd></div>
					</dl>
					<dl className="seat-selection-prices">
						<div><dt>{selectedSeats.length}× {selectedSeats.length === 1 ? "Ticket" : "Tickets"} ({cinema.experience})</dt><dd>{formatPrice(ticketSubtotal)}</dd></div>
						<div><dt>Service fee</dt><dd>{formatPrice(serviceFee)}</dd></div>
						<div className="seat-selection-total" aria-live="polite" aria-atomic="true"><dt>Total Price</dt><dd>{formatPrice(total)}</dd></div>
					</dl>
					<button className="seat-selection-checkout" type="button" disabled={!selectedSeats.length || selectedSeats.length > maxSeatsPerBooking} aria-describedby="seat-selection-hint" onClick={() => { if (selectedSeats.length > 0 && selectedSeats.length <= maxSeatsPerBooking) window.location.href = ticketCheckoutPath(params, sortedSeats); }}>
						PROCEED TO CHECKOUT <ArrowRight size={17} aria-hidden="true" />
					</button>
					<p className="seat-selection-hint" id="seat-selection-hint">{selectedSeats.length ? "Demo preview: selecting seats does not reserve them." : "Choose at least one available seat to continue."}</p>
					<a className="seat-selection-back" href={showtimeHref}><ArrowLeft size={14} aria-hidden="true" />Change showtime</a>
				</aside>
			</main>
		</div>
	);
}
