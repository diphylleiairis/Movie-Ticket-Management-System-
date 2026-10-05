import { CreditCard } from "lucide-react";

export default function CardPaymentFields({
	onValidityChange,
}: {
	onValidityChange: (valid: boolean) => void;
}) {
	return (
		<fieldset
			className="checkout-card-fields"
			onChange={(event) => onValidityChange(
				Array.from(event.currentTarget.querySelectorAll("input")).every((input) => input.validity.valid),
			)}
		>
			<legend className="checkout-visually-hidden">Card details</legend>
			<div className="checkout-card-field checkout-card-number">
				<label htmlFor="checkout-card-number">CARD NUMBER</label>
				<div className="checkout-card-input-wrap">
					<input
						id="checkout-card-number"
						type="text"
						inputMode="numeric"
						autoComplete="cc-number"
						placeholder="1234 5678 9012 3456"
						required
						maxLength={23}
						pattern="(?:[0-9] ?){12,18}[0-9]"
						title="Enter a card number with 13 to 19 digits."
						onChange={(event) => {
							const digits = event.target.value.replace(/\D/g, "").slice(0, 19);
							event.target.value = digits.replace(/(.{4})(?=.)/g, "$1 ");
						}}
					/>
					<CreditCard size={19} aria-hidden="true" />
				</div>
			</div>
			<div className="checkout-card-field">
				<label htmlFor="checkout-card-expiry">EXPIRATION DATE</label>
				<input
					id="checkout-card-expiry"
					type="text"
					inputMode="numeric"
					autoComplete="cc-exp"
					placeholder="MM / YY"
					required
					maxLength={7}
					pattern="(0[1-9]|1[0-2]) / [0-9]{2}"
					title="Enter a valid expiration date in MM / YY format."
					onChange={(event) => {
						const input = event.target;
						const digits = input.value.replace(/\D/g, "").slice(0, 4);
						input.value = digits.length > 2
							? `${digits.slice(0, 2)} / ${digits.slice(2)}`
							: digits;
						input.setCustomValidity("");
						if (digits.length === 4) {
							const month = Number(digits.slice(0, 2));
							const year = 2000 + Number(digits.slice(2));
							const now = new Date();
							if (month < 1 || month > 12) {
								input.setCustomValidity("Enter a month between 01 and 12.");
							} else if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) {
								input.setCustomValidity("The card has expired.");
							}
						}
					}}
				/>
			</div>
			<div className="checkout-card-field">
				<label htmlFor="checkout-card-security-code">SECURITY CODE</label>
				<input
					id="checkout-card-security-code"
					type="password"
					inputMode="numeric"
					autoComplete="off"
					placeholder="CVV / CVC"
					required
					maxLength={4}
					pattern="[0-9]{3,4}"
					title="Enter the 3 or 4 digit security code."
					onChange={(event) => {
						event.target.value = event.target.value.replace(/\D/g, "").slice(0, 4);
					}}
				/>
			</div>
			<p className="checkout-card-hint">Demo fields. Use test card details only.</p>
		</fieldset>
	);
}
