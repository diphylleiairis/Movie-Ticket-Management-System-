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
import {
	demoConcessions,
	demoSeatLayout,
	readDemoScreening,
} from "../../demo-movie-data";
import { readDemoSeatSelection } from "../booking/selection";
import SiteHeader from "../../site-header";
import CardPaymentFields from "./card-payment-fields";
import "./ticket-checkout.css";

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
			className="checkout-concession-image checkout-concession-fallback"
			role="img"
			aria-label={item.name}
		>
			<Icon size={30} aria-hidden="true" />
		</span>
	) : (
		<img
			className="checkout-concession-image"
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
	const [paymentStep, setPaymentStep] = useState<"confirm" | "preview">("confirm");
	const [scrolled, setScrolled] = useState(false);
	const paymentPreview = useRef<HTMLDialogElement>(null);

	if (!selection) {
		const screening = readDemoScreening(params);
		const backParams = new URLSearchParams(params);
		backParams.delete("seats");
		return (
			<main className="checkout-missing">
				<h1>Select your seats first</h1>
				<p>
					Choose a valid showtime and between 1 and 10 available seats to
					continue.
				</p>
				<a href={screening ? `/seat-selection?${backParams}` : "/movie-list"}>
					<ArrowLeft size={16} aria-hidden="true" />
					{screening ? "Back to seat selection" : "Browse movies"}
				</a>
			</main>
		);
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
	const canContinue = paymentMethod === "wallet" || (paymentMethod === "card" && cardValid);
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
			className="ticket-checkout-page"
			onScroll={(event) => setScrolled(event.currentTarget.scrollTop > 20)}
		>
			<SiteHeader
				currentStep={4}
				scrolled={scrolled}
				showtimeHref={showtimeHref}
				seatSelectionHref={seatSelectionHref}
			/>
			<main className="ticket-checkout-content">
				<div className="checkout-sections">
					<section
						className="checkout-concessions"
						aria-labelledby="checkout-concessions-title"
					>
						<h1 id="checkout-concessions-title">Concession Upgrades</h1>
						<p className="checkout-intro">
							Enhance your experience with curated gourmet treats and fine
							champagne delivered directly to your seat row.
						</p>
						<div className="checkout-concession-grid">
							{demoConcessions.map((item) => {
								const added = extras.includes(item.id);
								return (
									<article
										className={`checkout-concession${added ? " added" : ""}`}
										key={item.id}
									>
										<ConcessionImage item={item} />
										<div className="checkout-concession-info">
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
						className="checkout-payment"
						aria-labelledby="checkout-payment-title"
					>
						<h2 id="checkout-payment-title">Secure Payment</h2>
						<form
							id="ticket-checkout-form"
							onSubmit={(event) => {
								event.preventDefault();
								if (canContinue && event.currentTarget.checkValidity() && !paymentPreview.current?.open) {
									setPaymentStep("confirm");
									paymentPreview.current?.showModal();
								}
							}}
						>
							<fieldset className="checkout-payment-methods">
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
							<div className="checkout-secure-note">
								<ShieldCheck size={24} aria-hidden="true" />
								<p>
									Payments are processed by the payment provider. This demo
									checkout does not send or save payment details.
								</p>
								<LockKeyhole size={17} aria-hidden="true" />
							</div>
						</form>
						<a className="checkout-back" href={seatSelectionHref}>
							<ArrowLeft size={15} aria-hidden="true" />
							Back to seat selection
						</a>
					</section>
				</div>
				<aside
					className="checkout-summary"
					aria-labelledby="checkout-summary-title"
				>
					<h2 id="checkout-summary-title">Booking Summary</h2>
					<div className="checkout-movie-info">
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
					<dl className="checkout-line-items">
						<div>
							<dt>
								{seats.length}× {seats.length === 1 ? "Ticket" : "Tickets"}
							</dt>
							<dd>{formatPrice(ticketSubtotal)}</dd>
						</div>
						{selectedExtras.map((item) => (
							<div key={item.id}>
								<dt>
									{item.name}
									<button
										className="checkout-remove-extra"
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
						<div className="checkout-total" role="status" aria-atomic="true">
							<dt>Total Bill</dt>
							<dd>{formatPrice(total)}</dd>
						</div>
					</dl>
					<button
						className="checkout-pay-button"
						type="submit"
						form="ticket-checkout-form"
						disabled={!canContinue}
						aria-describedby="checkout-demo-note"
					>
						CONTINUE TO PAYMENT <ArrowUpRight size={16} aria-hidden="true" />
					</button>
					<p className="checkout-demo-note" id="checkout-demo-note">
						Demo preview. Seats are not reserved and no payment will be
						processed.
					</p>
				</aside>
			</main>
			<dialog
				className="checkout-provider-preview"
				ref={paymentPreview}
				aria-labelledby="checkout-provider-title"
				aria-describedby="checkout-provider-note"
				onClose={() => setPaymentStep("confirm")}
			>
				<button
					className="checkout-preview-close"
					type="button"
					aria-label="Close payment preview"
					onClick={() => paymentPreview.current?.close()}
				>
					<X size={20} aria-hidden="true" />
				</button>
				<ShieldCheck
					size={32}
					className="checkout-preview-icon"
					aria-hidden="true"
				/>
				<h2 id="checkout-provider-title">
					{paymentStep === "confirm" ? "Confirm payment" : paymentMethod === "wallet" ? "QR banking" : "Payment preview"}
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
					<div className="checkout-wallet-panel" aria-labelledby="checkout-wallet-title">
						<div className="checkout-wallet-qr">
							<QRCodeSVG
								value={JSON.stringify({ type: "DEMO_ONLY_NOT_A_PAYMENT", amount: total, currency: "VND" })}
								size={180}
								marginSize={4}
								level="M"
								role="img"
								title="Demo QR banking code. Not valid for payment."
							/>
						</div>
						<div className="checkout-wallet-info">
							<h3 id="checkout-wallet-title">Scan QR code</h3>
							<p>Pay using your banking or e-wallet app.</p>
							<span>Total amount</span>
							<strong>{formatPrice(total)}</strong>
							<small>Demo QR only. No bank transfer can be made with this code.</small>
						</div>
					</div>
				)}
				<p id="checkout-provider-note">
					This is a demo checkout. No payment will be taken and no tickets will
					be issued.
				</p>
				{paymentStep === "confirm" ? (
					<div className="checkout-confirm-actions">
						<button
							className="checkout-cancel-button"
							type="button"
							onClick={() => paymentPreview.current?.close()}
						>
							CANCEL
						</button>
						<button
							className="checkout-pay-button"
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
						className="checkout-pay-button"
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
