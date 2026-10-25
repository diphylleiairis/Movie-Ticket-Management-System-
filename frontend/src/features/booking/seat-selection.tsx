import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
	demoSeatLayout,
	readDemoScreening,
} from "../../demo-movie-data";
import SiteHeader from "../../site-header";
import BookingRecovery from "../../shared/booking-recovery";
import { maxSeatsPerBooking } from "./booking-limits";
import { readDemoSeatSelection, ticketCheckoutPath } from "./selection";

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
		return <BookingRecovery params={params} />;
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
		<div className="seat-selection-page w-full h-dvh overflow-y-auto bg-[#f8f5ef] text-[#20232a]" onScroll={(event) => setScrolled(event.currentTarget.scrollTop > 20)}>
			<SiteHeader currentStep={3} scrolled={scrolled} showtimeHref={showtimeHref} />
			<main className="seat-selection-content grid grid-cols-[minmax(0,_2.15fr)_minmax(280px,_1fr)] items-start
				gap-[clamp(24px,_3.3vw,_48px)] w-full max-w-[1500px] m-auto p-[114px_clamp(24px,_4.5vw,_72px)_24px]
				max-[1000px]:grid-cols-[minmax(0,_1fr)] max-[1000px]:max-w-[850px] max-[1000px]:pt-[110px] max-[1000px]:gap-5
				[@media(min-width:_1001px)_and_(max-height:_800px)]:pt-[106px]
				[@media(min-width:_1001px)_and_(max-height:_800px)]:pb-4 max-[600px]:p-[84px_16px_24px]">
				<section className="seat-selection-hall [border:1px_solid_#e8e3db] rounded-[12px] bg-white min-w-0
					p-[24px_clamp(16px,_2vw,_28px)_22px] [@media(min-width:_1001px)_and_(max-height:_800px)]:pt-[18px]
					[@media(min-width:_1001px)_and_(max-height:_800px)]:pb-[18px] max-[600px]:p-[18px_12px]" aria-label="Choose your seats">
					<div className="seat-selection-map-scroll overflow-x-auto p-[0_4px_6px] [scrollbar-width:thin]
						[overscroll-behavior-x:contain] focus-visible:[outline:2px_solid_#a46a34]
						focus-visible:outline-offset-[2px]" tabIndex={0} aria-label="Seat layout; scroll horizontally to see all seats on small screens">
						<div className="seat-selection-map min-w-140">
							<div className="seat-selection-screen m-[0_14px_34px] text-center [&_>_div]:h-[13px] [&_>_div]:rounded-[3px_3px_50%_50%]
								[&_>_div]:[background:linear-gradient(#fff_0%,_#c2c2c2_32%,_#545454_75%,_#252525_100%)]
								[&_>_div]:shadow-[0_4px_8px_#00000012] [&_>_span]:block [&_>_span]:mt-4 [&_>_span]:text-[#777d8b]
								[&_>_span]:text-[11px] [&_>_span]:font-semibold [@media(min-width:_1001px)_and_(max-height:_800px)]:mb-6
								[@media(min-width:_1001px)_and_(max-height:_800px)]:[&_>_span]:mt-3 max-[600px]:mb-[26px]"><div /><span>STAGED SCREEN FOCUS</span></div>
							<div className="seat-selection-rows grid gap-[13px] [@media(min-width:_1001px)_and_(max-height:_800px)]:gap-[10px]">
								{demoSeatLayout.rows.map((row) => (
									<div className="seat-selection-row grid grid-cols-[20px_repeat(14,_minmax(26px,_1fr))_20px] items-center
										gap-[clamp(7px,_.8vw,_12px)]" key={row} role="group" aria-label={`Row ${row}`}>
										<span className="seat-selection-row-label text-[#747c8d] text-center text-[13px] font-semibold" aria-hidden="true">{row}</span>
										{columns.map((column) => {
											const seat = `${row}${column}`;
											const booked = demoSeatLayout.bookedSeats.includes(seat);
											const selected = selectedSeats.includes(seat);
											return (
												<button
													key={seat}
													type="button"
													className={`seat-selection-seat grid place-items-center min-w-0 h-[34px] p-0 [border:1px_solid_#d0d5df] rounded-[5px]
														bg-white text-[#646d7f] text-[11px] font-medium [transition:background_.15s,_border-color_.15s,_color_.15s]
														[&:hover:not(:disabled):not(.selected)]:[border-color:#a46a34]
														[&:hover:not(:disabled):not(.selected)]:bg-[#f8f5ef] [&:hover:not(:disabled):not(.selected)]:text-[#20232a]
														[&.selected]:[border-color:#111] [&.selected]:bg-[#111] [&.selected]:text-white
														[&.booked]:cursor-not-allowed [&.booked]:[border-color:#e3e5ea] [&.booked]:bg-[#e3e5ea]
														[&.booked]:text-[#525967] [&:disabled:not(.booked)]:cursor-not-allowed
														[&:disabled:not(.booked)]:text-[#959baa] [&:disabled:not(.booked)]:bg-[#fafafa]
														[@media(min-width:_1001px)_and_(max-height:_800px)]:h-8${booked ? " booked" : selected ? " selected" : ""}`}
													disabled={booked || (atSeatLimit && !selected)}
													aria-describedby="seat-selection-limit"
													aria-pressed={selected}
													aria-label={`Row ${row}, Seat ${column}, ${booked ? "booked" : selected ? "selected" : "available"}`}
													onClick={() => toggleSeat(seat)}
												>{column}</button>
											);
										})}
										<span className="seat-selection-row-label text-[#747c8d] text-center text-[13px] font-semibold" aria-hidden="true">{row}</span>
									</div>
								))}
							</div>
						</div>
					</div>
					<div className="seat-selection-legend flex flex-wrap justify-center gap-[26px] mt-8 [&_>_span]:inline-flex
						[&_>_span]:items-center [&_>_span]:gap-[9px] [&_>_span]:text-[#777d8b] [&_>_span]:text-[13px] [&_i]:w-[18px]
						[&_i]:h-[18px] [&_i]:[border:1px_solid_#d0d5df] [&_i]:rounded-[3px] [&_i]:bg-white
						[&_i.selected]:[border-color:#111] [&_i.selected]:bg-[#111] [&_i.booked]:[border-color:#e3e5ea]
						[&_i.booked]:bg-[#e3e5ea] [@media(min-width:_1001px)_and_(max-height:_800px)]:mt-6 max-[600px]:gap-[18px]
						max-[600px]:mt-[22px] max-[600px]:[&_>_span]:text-[12px]" aria-label="Seat status legend">
						<span><i className="available" aria-hidden="true" />Available</span>
						<span><i className="selected" aria-hidden="true" />Selected</span>
						<span><i className="booked" aria-hidden="true" />Booked</span>
					</div>
					<p className="seat-selection-limit m-[14px_0_0] text-[#77716a] text-[12px] leading-[1.5] text-center
						[@media(min-width:_1001px)_and_(max-height:_800px)]:mt-[10px]" id="seat-selection-limit" role="status">
						{selectedSeats.length}/{maxSeatsPerBooking} seats selected.
						{atSeatLimit ? " Deselect a seat to choose another." : ` Maximum ${maxSeatsPerBooking} seats per booking.`}
					</p>
				</section>
				<aside className="seat-selection-summary [border:1px_solid_#e8e3db] rounded-[12px] bg-white min-w-0
					p-[24px_clamp(22px,_2.2vw,_32px)] [&_h1]:m-[12px_0_14px] [&_h1]:text-[clamp(25px,_2.2vw,_34px)]
					[&_h1]:font-normal [&_h1]:leading-[1.3] [&_h1]:tracking-[-.035em] [&_h1]:[overflow-wrap:anywhere] [&_dl]:m-0
					[&_dl_>_div]:flex [&_dl_>_div]:justify-between [&_dl_>_div]:items-baseline [&_dl_>_div]:gap-[15px]
					[&_dl_>_div]:p-[8px_0] [&_dl_>_div]:text-[13px] [&_dl_>_div]:leading-[1.6] [&_dt]:text-[#777d8b] [&_dd]:m-0
					[&_dd]:text-right [&_dd]:[overflow-wrap:anywhere] [&_.seat-selection-total]:mt-2
					[&_.seat-selection-total]:p-[14px_0_20px] [&_.seat-selection-total]:[border-top:1px_solid_#e8e3db]
					[@media(min-width:_1001px)_and_(max-height:_800px)]:p-5
					[@media(min-width:_1001px)_and_(max-height:_800px)]:[&_h1]:m-[8px_0_10px]
					[@media(min-width:_1001px)_and_(max-height:_800px)]:[&_h1]:text-[clamp(23px,_2.2vw,_28px)]
					[@media(min-width:_1001px)_and_(max-height:_800px)]:[&_dl_>_div]:pt-[5px]
					[@media(min-width:_1001px)_and_(max-height:_800px)]:[&_dl_>_div]:pb-[5px]
					[@media(min-width:_1001px)_and_(max-height:_800px)]:[&_.seat-selection-total]:p-[10px_0_12px] max-[600px]:p-6
					max-[600px]:[&_h1]:text-[28px]" aria-labelledby="seat-selection-title">
					<span className="seat-selection-experience inline-block p-[5px_9px] rounded-[4px] bg-[#f2f3f5] text-[10px] font-semibold">{cinema.experience.toUpperCase()}</span>
					<h1 id="seat-selection-title">{movie.title}</h1>
					<p className="seat-selection-venue m-[0_0_24px] text-[#777d8b] text-[12px] leading-[1.6]
						[@media(min-width:_1001px)_and_(max-height:_800px)]:mb-3">{cinema.name} · {cinema.district}</p>
					<dl className="seat-selection-details p-[16px_0] [border-top:1px_solid_#e8e3db] [border-bottom:1px_solid_#e8e3db]
						[&_dt]:flex-none [&_dd]:font-semibold [@media(min-width:_1001px)_and_(max-height:_800px)]:p-[10px_0]">
						<div><dt>Date &amp; Time</dt><dd>{dateLabel}</dd></div>
						<div><dt>Seats Chosen</dt><dd>{sortedSeats.length ? sortedSeats.join(", ") : "Select your seats"}</dd></div>
					</dl>
					<dl className="seat-selection-prices pt-[18px] [&_dd]:flex-none [@media(min-width:_1001px)_and_(max-height:_800px)]:pt-3">
						<div><dt>{selectedSeats.length}× {selectedSeats.length === 1 ? "Ticket" : "Tickets"} ({cinema.experience})</dt><dd>{formatPrice(ticketSubtotal)}</dd></div>
						<div><dt>Service fee</dt><dd>{formatPrice(serviceFee)}</dd></div>
						<div className="seat-selection-total [&.seat-selection-total_dt]:text-[#20232a] [&.seat-selection-total_dt]:text-[15px]
							[&.seat-selection-total_dt]:font-bold [&.seat-selection-total_dd]:text-[#171717]
							[&.seat-selection-total_dd]:text-[24px] [&.seat-selection-total_dd]:leading-[1.3]" aria-live="polite" aria-atomic="true"><dt>Total Price</dt><dd>{formatPrice(total)}</dd></div>
					</dl>
					<button className="seat-selection-checkout flex justify-center items-center gap-3 w-full min-h-13 p-[13px_15px]
						[border:1px_solid_#111] rounded-[5px] bg-[#111] text-white text-[12px] font-semibold [&_svg]:flex-none
						[&:hover:not(:disabled)]:bg-[#333] disabled:cursor-not-allowed disabled:[border-color:#e1ddd5]
						disabled:bg-[#e7e2d9] disabled:text-[#77716a]
						[@media(min-width:_1001px)_and_(max-height:_800px)]:min-h-[46px]" type="button" disabled={!selectedSeats.length || selectedSeats.length > maxSeatsPerBooking} aria-describedby="seat-selection-hint" onClick={() => { if (selectedSeats.length > 0 && selectedSeats.length <= maxSeatsPerBooking) window.location.href = ticketCheckoutPath(params, sortedSeats); }}>
						PROCEED TO CHECKOUT <ArrowRight size={17} aria-hidden="true" />
					</button>
					<p className="seat-selection-hint m-[14px_0_20px] text-[#77716a] text-[12px] leading-[1.6]
						[@media(min-width:_1001px)_and_(max-height:_800px)]:m-[10px_0_12px]
						[@media(min-width:_1001px)_and_(max-height:_800px)]:text-[11px]
						[@media(min-width:_1001px)_and_(max-height:_800px)]:leading-[1.5]" id="seat-selection-hint">{selectedSeats.length ? "Demo preview: selecting seats does not reserve them." : "Choose at least one available seat to continue."}</p>
					<a className="seat-selection-back inline-flex items-center gap-[7px] rounded-md border border-solid border-[#cbb89f] bg-[#fffdf9] px-4 py-2.5 text-[#77716a] text-[12px] no-underline
						transition-colors hover:border-[#a46a34] hover:bg-[#f1e6d4] hover:text-[#a46a34]" href={showtimeHref}><ArrowLeft size={14} aria-hidden="true" />Change showtime</a>
				</aside>
			</main>
		</div>
	);
}
