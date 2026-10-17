import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
	ArrowLeft,
	ArrowUpRight,
	CreditCard,
	LockKeyhole,
	Popcorn,
	ShieldCheck,
	Smartphone,
	Wine,
	X,
} from "lucide-react";
import { demoConcessions, demoSeatLayout } from "../../demo-movie-data";
import { readDemoSeatSelection } from "../booking/selection";
import SiteHeader from "../../site-header";
import BookingRecovery from "../../shared/booking-recovery";
import CardPaymentFields from "./card-payment-fields";

const formatPrice = (amount: number) =>
	new Intl.NumberFormat("vi-VN", {
		style: "currency",
		currency: "VND",
		maximumFractionDigits: 0,
	}).format(amount);

function ConcessionImage({ item }: { item: (typeof demoConcessions)[number] }) {
	const [unavailable, setUnavailable] = useState(false);
	const Icon = item.id === "popcorn" ? Popcorn : Wine;
	return unavailable ? (
		<span
			className="checkout-concession-image block w-17 h-19 rounded-[5px] object-cover max-[1200px]:[grid-row:span_2]
				max-[1200px]:w-15 max-[1200px]:h-20 max-[600px]:[grid-row:auto] max-[600px]:w-17 max-[600px]:h-19
				checkout-concession-fallback grid place-items-center text-[color:var(--checkout-accent)] bg-[#f5edda]"
			role="img"
			aria-label={item.name}
		>
			<Icon size={30} aria-hidden="true" />
		</span>
	) : (
		<img
			className="checkout-concession-image block w-17 h-19 rounded-[5px] object-cover max-[1200px]:[grid-row:span_2]
				max-[1200px]:w-15 max-[1200px]:h-20 max-[600px]:[grid-row:auto] max-[600px]:w-17 max-[600px]:h-19"
			src={item.image}
			alt={item.name}
			onError={() => setUnavailable(true)}
		/>
	);
}

export default function TicketCheckout() {
	const params = new URLSearchParams(window.location.search);
	const selection = readDemoSeatSelection(params);
	const [extras, setExtras] = useState<string[]>([]);
	const [paymentMethod, setPaymentMethod] = useState("");
	const [cardValid, setCardValid] = useState(false);
	const [paymentStep, setPaymentStep] = useState<"confirm" | "preview">(
		"confirm",
	);
	const [scrolled, setScrolled] = useState(false);
	const paymentPreview = useRef<HTMLDialogElement>(null);

	if (!selection) {
		return <BookingRecovery params={params} checkout />;
	}

	const { movie, cinema, date, time, seats } = selection;
	const seatSelectionHref = `/seat-selection?${params}`;
	const showtimeParams = new URLSearchParams(params);
	showtimeParams.delete("seats");
	const showtimeHref = `/movie-showtime?${showtimeParams}`;
	const selectedExtras = demoConcessions.filter((item) =>
		extras.includes(item.id),
	);
	const ticketSubtotal = seats.length * demoSeatLayout.ticketPrice;
	const extrasSubtotal = selectedExtras.reduce(
		(total, item) => total + item.price,
		0,
	);
	const total = ticketSubtotal + extrasSubtotal + demoSeatLayout.serviceFee;
	const canContinue =
		paymentMethod === "wallet" || (paymentMethod === "card" && cardValid);
	const dateLabel = new Intl.DateTimeFormat("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
	}).format(date);
	const toggleExtra = (id: string) =>
		setExtras((selected) =>
			selected.includes(id)
				? selected.filter((item) => item !== id)
				: [...selected, id],
		);

	return (
		<div
			className="ticket-checkout-page [--checkout-gold:#e4b333] [--checkout-accent:#946717] w-full h-dvh overflow-y-auto
				bg-[#f8f5ef] text-[#34312e] [&_.brand-mark]:bg-[var(--checkout-gold)] [&_.brand-mark]:text-[#171717]
				[&_.brand_small]:text-[color:var(--checkout-accent)] [&_.steps_.current_b]:text-[color:var(--checkout-accent)]
				[&_.location-button_>_svg:first-child]:text-[color:var(--checkout-accent)]"
			onScroll={(event) => setScrolled(event.currentTarget.scrollTop > 20)}
		>
			<SiteHeader
				currentStep={4}
				scrolled={scrolled}
				showtimeHref={showtimeHref}
				seatSelectionHref={seatSelectionHref}
			/>
			<main className="ticket-checkout-content grid grid-cols-[minmax(0,_2fr)_minmax(280px,_1fr)] items-start
				gap-[clamp(24px,_3.4vw,_48px)] max-w-[1320px] m-auto p-[122px_clamp(24px,_4.5vw,_72px)_32px]
				max-[850px]:grid-cols-[1fr] max-[850px]:gap-7 max-[850px]:pt-[110px] max-[600px]:p-[88px_20px_24px]">
				<div className="checkout-sections min-w-0 [&_h1]:m-[0_0_16px] [&_h1]:text-[26px] [&_h1]:font-normal [&_h1]:tracking-[-.025em]
					[&_h2]:m-[0_0_16px] [&_h2]:text-[26px] [&_h2]:font-normal [&_h2]:tracking-[-.025em]
					max-[600px]:[&_h1]:text-[24px] max-[600px]:[&_h2]:text-[24px]">
					<section
						className="checkout-concessions"
						aria-labelledby="checkout-concessions-title"
					>
						<h1 id="checkout-concessions-title">Concession Upgrades</h1>
						<p className="checkout-intro m-[0_0_18px] text-[#80796f] text-[13px] leading-[1.6]">
							Enhance your experience with curated gourmet treats and fine
							champagne delivered directly to your seat row.
						</p>
						<div className="checkout-concession-grid grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[14px] max-[600px]:grid-cols-[1fr]">
							{demoConcessions.map((item) => {
								const added = extras.includes(item.id);
								return (
									<article
										className={`checkout-concession grid grid-cols-[68px_minmax(0,_1fr)_auto] items-center gap-3 min-w-0 p-3
											[border:1px_solid_#e8e0d5] rounded-[9px] bg-white [&.added]:[border-color:#d0ac58]
											[&.added]:shadow-[0_0_0_1px_#d0ac5820] [&_>_button]:p-[9px_10px] [&_>_button]:border-0
											[&_>_button]:rounded-[5px] [&_>_button]:bg-[var(--checkout-gold)] [&_>_button]:text-[#171717]
											[&_>_button]:text-[10px] [&_>_button]:font-bold [&_>_button:hover]:bg-[#d9a326]
											max-[1200px]:grid-cols-[60px_minmax(0,_1fr)] max-[1200px]:gap-[10px]
											max-[1200px]:[&_>_button]:justify-self-start max-[600px]:grid-cols-[68px_minmax(0,_1fr)_auto]${added ? " added" : ""}`}
										key={item.id}
									>
										<ConcessionImage item={item} />
										<div className="checkout-concession-info [&.checkout-concession-info_h2]:m-[0_0_5px]
											[&.checkout-concession-info_h2]:text-[11px] [&.checkout-concession-info_h2]:font-bold
											[&.checkout-concession-info_h2]:leading-[1.4] [&.checkout-concession-info_h2]:tracking-[0]
											[&.checkout-concession-info_p]:m-[0_0_5px] [&.checkout-concession-info_p]:text-[#80796f]
											[&.checkout-concession-info_p]:text-[11px] [&.checkout-concession-info_p]:leading-[1.4]
											[&.checkout-concession-info_>_span]:text-[color:var(--checkout-accent)]
											[&.checkout-concession-info_>_span]:text-[13px] [&.checkout-concession-info_>_span]:whitespace-nowrap">
											<h2>{item.name}</h2>
											<p>{item.description}</p>
											<span>{formatPrice(item.price)}</span>
										</div>
										<button
											type="button"
											aria-pressed={added}
											aria-label={`${added ? "Remove" : "Add"} ${item.name}`}
											onClick={() => toggleExtra(item.id)}
										>
											{added ? "REMOVE" : "ADD"}
										</button>
									</article>
								);
							})}
						</div>
					</section>
					<section
						className="checkout-payment mt-[26px] pt-7 [border-top:1px_solid_#e6dfd4]"
						aria-labelledby="checkout-payment-title"
					>
						<h2 id="checkout-payment-title">Secure Payment</h2>
						<form
							id="ticket-checkout-form"
							onSubmit={(event) => {
								event.preventDefault();
								if (
									canContinue &&
									event.currentTarget.checkValidity() &&
									!paymentPreview.current?.open
								) {
									setPaymentStep("confirm");
									paymentPreview.current?.showModal();
								}
							}}
						>
							<fieldset className="checkout-payment-methods [&_legend]:block [&_legend]:mb-[9px] [&_legend]:text-[#77716a]
								[&_legend]:text-[11px] [&_legend]:font-semibold [&_legend]:p-0
								[&_input:focus-visible]:[outline:2px_solid_#a46a34] [&_input:focus-visible]:outline-offset-[3px] grid
								grid-cols-[repeat(2,_minmax(0,_1fr))] gap-3 min-w-0 m-0 p-0 border-0 [&_label]:flex [&_label]:items-center
								[&_label]:gap-[10px] [&_label]:min-w-0 [&_label]:p-[16px_12px] [&_label]:[border:1px_solid_#e5ded4]
								[&_label]:rounded-[7px] [&_label]:bg-white [&_label]:cursor-pointer
								[&_label.selected]:[border-color:#c79b31] [&_label.selected]:bg-[#fffcf3] [&_label_>_svg]:flex-none
								[&_input]:flex-none [&_input]:m-0 [&_input]:[accent-color:#946717] [&_label_>_span]:grid
								[&_label_>_span]:gap-[5px] [&_strong]:text-[13px] [&_strong]:font-medium [&_strong]:leading-[1.4]
								[&_small]:text-[#80796f] [&_small]:text-[11px] [&_small]:leading-[1.5] max-[1200px]:grid-cols-[1fr]
								max-[850px]:grid-cols-[repeat(2,_minmax(0,_1fr))] max-[600px]:grid-cols-[1fr]">
								<legend>PAYMENT METHOD</legend>
								<label className={paymentMethod === "card" ? "selected" : ""}>
									<input
										type="radio"
										name="paymentMethod"
										value="card"
										required
										checked={paymentMethod === "card"}
										onChange={(event) => {
											setPaymentMethod(event.target.value);
											setCardValid(false);
										}}
									/>
									<CreditCard size={22} aria-hidden="true" />
									<span>
										<strong>Credit or debit card</strong>
										<small>Pay through the payment provider</small>
									</span>
								</label>
								<label className={paymentMethod === "wallet" ? "selected" : ""}>
									<input
										type="radio"
										name="paymentMethod"
										value="wallet"
										required
										checked={paymentMethod === "wallet"}
										onChange={(event) => {
											setPaymentMethod(event.target.value);
											setCardValid(false);
										}}
									/>
									<Smartphone size={22} aria-hidden="true" />
									<span>
										<strong>E-wallet</strong>
										<small>Pay through the payment provider</small>
									</span>
								</label>
							</fieldset>
							{paymentMethod === "card" && (
								<CardPaymentFields onValidityChange={setCardValid} />
							)}
							<div className="checkout-secure-note flex items-center gap-3 mt-[18px] p-[14px_16px] [border:1px_solid_#e5ded4] rounded-[7px]
								bg-[#f2efe8] text-[#77716a] [&_>_svg]:flex-none [&_>_svg]:text-[color:var(--checkout-accent)] [&_p]:flex-1
								[&_p]:m-0 [&_p]:text-[13px] [&_p]:leading-[1.6]">
								<ShieldCheck size={24} aria-hidden="true" />
								<p>
									Payments are processed by the payment provider. This demo
									checkout does not send or save payment details.
								</p>
								<LockKeyhole size={17} aria-hidden="true" />
							</div>
						</form>
						<a className="checkout-back inline-flex items-center gap-[7px] mt-[22px] text-[#77716a] text-[13px] no-underline
							hover:text-[#171717] hover:underline hover:underline-offset-[3px]" href={seatSelectionHref}>
							<ArrowLeft size={15} aria-hidden="true" />
							Back to seat selection
						</a>
					</section>
				</div>
				<aside
					className="checkout-summary min-w-0 p-[clamp(22px,_2.3vw,_32px)] [border:1px_solid_#e8e0d5] rounded-[10px] bg-white
						[&_>_h2]:m-0 [&_>_h2]:pb-6 [&_>_h2]:[border-bottom:1px_solid_#e8e0d5] [&_>_h2]:text-[clamp(24px,_2.1vw,_31px)]
						[&_>_h2]:font-normal [&_>_h2]:tracking-[-.03em] max-[600px]:p-[22px]"
					aria-labelledby="checkout-summary-title"
				>
					<h2 id="checkout-summary-title">Booking Summary</h2>
					<div className="checkout-movie-info p-[22px_0] [border-bottom:1px_solid_#e8e0d5] [&_h3]:m-[0_0_7px] [&_h3]:text-[14px]
						[&_h3]:leading-[1.4] [&_p]:m-[0_0_14px] [&_p]:text-[#80796f] [&_p]:text-[12px] [&_p]:leading-[1.5] [&_dl]:m-0
						[&_dl_>_div]:flex [&_dl_>_div]:items-baseline [&_dl_>_div]:gap-[5px] [&_dl_>_div]:p-[3px_0]
						[&_dl_>_div]:text-[13px] [&_dl_>_div]:leading-[1.6] [&_dt]:flex-none [&_dt]:text-[#80796f] [&_dd]:m-0
						[&_dd]:font-medium [&_dd]:[overflow-wrap:anywhere]">
						<h3>{movie.title}</h3>
						<p>
							{cinema.name} · {cinema.district}
						</p>
						<dl>
							<div>
								<dt>Date:</dt>
								<dd>{dateLabel}</dd>
							</div>
							<div>
								<dt>Time:</dt>
								<dd>{time}</dd>
							</div>
							<div>
								<dt>Seats:</dt>
								<dd>{seats.join(", ")}</dd>
							</div>
						</dl>
					</div>
					<dl className="checkout-line-items m-0 pt-[18px] [&_>_div]:flex [&_>_div]:justify-between [&_>_div]:items-baseline
						[&_>_div]:gap-3 [&_>_div]:p-[7px_0] [&_>_div]:text-[13px] [&_>_div]:leading-[1.5] [&_dt]:text-[#80796f]
						[&_dd]:flex-none [&_dd]:m-0 [&_dd]:text-right [&_dd]:text-[#34312e] [&_>_.checkout-total]:items-center
						[&_>_.checkout-total]:mt-[10px] [&_>_.checkout-total]:p-[18px_0_24px]
						[&_>_.checkout-total]:[border-top:1px_solid_#e8e0d5]">
						<div>
							<dt>
								{seats.length}x {seats.length === 1 ? "Ticket" : "Tickets"}
							</dt>
							<dd>{formatPrice(ticketSubtotal)}</dd>
						</div>
						{selectedExtras.map((item) => (
							<div key={item.id}>
								<dt>
									{item.name}
									<button
										className="checkout-remove-extra inline-grid place-items-center w-[22px] h-[22px] ml-1 p-0 border-0 rounded-[50%]
											bg-[#f2efe8] text-[#77716a] [vertical-align:middle] hover:bg-[#e8e0d5]"
										type="button"
										aria-label={`Remove ${item.name}`}
										onClick={() => toggleExtra(item.id)}
									>
										<X size={12} aria-hidden="true" />
									</button>
								</dt>
								<dd>{formatPrice(item.price)}</dd>
							</div>
						))}
						<div>
							<dt>Service Booking Fee</dt>
							<dd>{formatPrice(demoSeatLayout.serviceFee)}</dd>
						</div>
						<div className="checkout-total [&.checkout-total_dt]:text-[#34312e] [&.checkout-total_dt]:text-[15px]
							[&.checkout-total_dt]:font-bold [&.checkout-total_dd]:text-[color:var(--checkout-accent)]
							[&.checkout-total_dd]:text-[clamp(22px,_2vw,_28px)] [&.checkout-total_dd]:font-normal" role="status" aria-atomic="true">
							<dt>Total Bill</dt>
							<dd>{formatPrice(total)}</dd>
						</div>
					</dl>
					<button
						className="checkout-pay-button flex justify-center items-center gap-2 w-full min-h-11 p-3 [border:1px_solid_transparent]
							rounded-[6px] bg-[var(--checkout-gold)] text-[#171717] text-[11px] font-bold
							[&:hover:not(:disabled)]:bg-[#d9a326] disabled:cursor-not-allowed disabled:bg-[#e8e2d6]
							disabled:text-[#898174]"
						type="submit"
						form="ticket-checkout-form"
						disabled={!canContinue}
						aria-describedby="checkout-demo-note"
					>
						CONTINUE TO PAYMENT <ArrowUpRight size={16} aria-hidden="true" />
					</button>
					<p className="checkout-demo-note m-[12px_0_0] text-[#80796f] text-[11px] leading-[1.6]" id="checkout-demo-note">
						Demo preview. Seats are not reserved and no payment will be
						processed.
					</p>
				</aside>
			</main>
			<dialog
				className="checkout-provider-preview w-[min(480px,_calc(100%_-_32px))] max-h-[calc(100dvh_-_32px)] overflow-y-auto p-8
					[border:1px_solid_#e8e0d5] rounded-[12px] bg-[#f8f5ef] text-[#34312e] shadow-[0_24px_70px_#0003]
					backdrop:bg-[#0008] [&_h2]:m-[14px_0_18px] [&_h2]:text-[27px] [&_h2]:font-normal [&_p]:text-[#77716a]
					[&_p]:text-[14px] [&_p]:leading-[1.6] [&_dl]:p-[12px_0] [&_dl]:[border-block:1px_solid_#e8e0d5]
					[&_dl_>_div]:flex [&_dl_>_div]:justify-between [&_dl_>_div]:gap-5 [&_dl_>_div]:p-[8px_0]
					[&_dl_>_div]:text-[14px] [&_dt]:text-[#77716a] [&_dd]:min-w-0 [&_dd]:m-0 [&_dd]:text-right
					[&_dd]:[overflow-wrap:anywhere] [&_.checkout-wallet-panel]:grid-cols-[1fr]
					[&_.checkout-wallet-panel]:justify-items-center [&_.checkout-wallet-info]:text-center
					max-[600px]:p-[28px_22px]"
				ref={paymentPreview}
				aria-labelledby="checkout-provider-title"
				aria-describedby="checkout-provider-note"
				onClose={() => setPaymentStep("confirm")}
			>
				<button
					className="checkout-preview-close absolute top-3 right-3 grid place-items-center w-[30px] h-[30px] p-0 border-0
						rounded-[50%] bg-white text-[#34312e]"
					type="button"
					aria-label="Close payment preview"
					onClick={() => paymentPreview.current?.close()}
				>
					<X size={20} aria-hidden="true" />
				</button>
				<ShieldCheck
					size={32}
					className="checkout-preview-icon text-[color:var(--checkout-accent)]"
					aria-hidden="true"
				/>
				<h2 id="checkout-provider-title">
					{paymentStep === "confirm"
						? "Confirm payment"
						: paymentMethod === "wallet"
							? "QR banking"
							: "Payment preview"}
				</h2>
				<p>
					{paymentStep === "confirm"
						? "Please confirm your booking details and total before continuing to payment."
						: "Your checkout details are ready to review."}
				</p>
				<dl>
					<div>
						<dt>Movie</dt>
						<dd>{movie.title}</dd>
					</div>
					<div>
						<dt>Seats</dt>
						<dd>{seats.join(", ")}</dd>
					</div>
					<div>
						<dt>Payment method</dt>
						<dd>
							{paymentMethod === "card" ? "Credit or debit card" : "E-wallet"}
						</dd>
					</div>
					<div>
						<dt>Total Bill</dt>
						<dd>{formatPrice(total)}</dd>
					</div>
				</dl>
				{paymentMethod === "wallet" && paymentStep === "preview" && (
					<div
						className="checkout-wallet-panel grid grid-cols-[auto_minmax(0,_1fr)] items-center gap-[22px] mt-[22px] p-5
							[border:1px_solid_#e5ded4] rounded-[9px] bg-white max-[600px]:grid-cols-[1fr]
							max-[600px]:justify-items-center max-[600px]:p-[20px_16px]"
						aria-labelledby="checkout-wallet-title"
					>
						<div className="checkout-wallet-qr grid place-items-center p-[6px] [border:1px_solid_#e8e0d5] rounded-[7px] bg-white
							[&_svg]:block [&_svg]:max-w-[100%] [&_svg]:h-auto">
							<QRCodeSVG
								value={JSON.stringify({
									type: "DEMO_ONLY_NOT_A_PAYMENT",
									amount: total,
									currency: "VND",
								})}
								size={180}
								marginSize={4}
								level="M"
								role="img"
								title="Demo QR banking code. Not valid for payment."
							/>
						</div>
						<div className="checkout-wallet-info min-w-0 [&_h3]:m-[0_0_8px] [&_h3]:text-[19px] [&_h3]:font-medium [&_p]:m-[0_0_16px]
							[&_p]:text-[#80796f] [&_p]:text-[13px] [&_p]:leading-[1.6] [&_>_span]:block [&_>_span]:mb-[5px]
							[&_>_span]:text-[#80796f] [&_>_span]:text-[12px] [&_>_strong]:block
							[&_>_strong]:text-[color:var(--checkout-accent)] [&_>_strong]:text-[23px] [&_>_strong]:font-medium
							[&_>_strong]:[overflow-wrap:anywhere] [&_small]:block [&_small]:mt-3 [&_small]:text-[#80796f]
							[&_small]:text-[12px] [&_small]:leading-[1.5] max-[600px]:text-center">
							<h3 id="checkout-wallet-title">Scan QR code</h3>
							<p>Pay using your banking or e-wallet app.</p>
							<span>Total amount</span>
							<strong>{formatPrice(total)}</strong>
							<small>
								Demo QR only. No bank transfer can be made with this code.
							</small>
						</div>
					</div>
				)}
				<p id="checkout-provider-note">
					This is a demo checkout. No payment will be taken and no tickets will
					be issued.
				</p>
				{paymentStep === "confirm" ? (
					<div className="checkout-confirm-actions grid grid-cols-[auto_minmax(0,_1fr)] gap-3 mt-5">
						<button
							className="checkout-cancel-button min-h-11 p-[12px_20px] [border:1px_solid_#e5ded4] rounded-[6px] bg-white
								text-[#34312e] text-[11px] font-bold hover:bg-[#f2efe8]"
							type="button"
							onClick={() => paymentPreview.current?.close()}
						>
							CANCEL
						</button>
						<button
							className="checkout-pay-button flex justify-center items-center gap-2 w-full min-h-11 p-3 [border:1px_solid_transparent]
								rounded-[6px] bg-[var(--checkout-gold)] text-[#171717] text-[11px] font-bold
								[&:hover:not(:disabled)]:bg-[#d9a326] disabled:cursor-not-allowed disabled:bg-[#e8e2d6]
								disabled:text-[#898174]"
							type="button"
							disabled={!canContinue}
							onClick={() => {
								if (canContinue) setPaymentStep("preview");
							}}
						>
							CONFIRM &amp; CONTINUE
						</button>
					</div>
				) : (
					<button
						className="checkout-pay-button flex justify-center items-center gap-2 w-full min-h-11 p-3 [border:1px_solid_transparent]
							rounded-[6px] bg-[var(--checkout-gold)] text-[#171717] text-[11px] font-bold
							[&:hover:not(:disabled)]:bg-[#d9a326] disabled:cursor-not-allowed disabled:bg-[#e8e2d6]
							disabled:text-[#898174]"
						type="button"
						onClick={() => paymentPreview.current?.close()}
					>
						BACK TO CHECKOUT
					</button>
				)}
			</dialog>
		</div>
	);
}
