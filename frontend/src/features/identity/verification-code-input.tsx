import { useEffect, useRef } from "react";

type VerificationCodeInputProps = {
	digits: string[];
	onChange: (digits: string[]) => void;
	disabled: boolean;
};

export default function VerificationCodeInput({ digits, onChange, disabled }: VerificationCodeInputProps) {
	const inputs = useRef<Array<HTMLInputElement | null>>([]);
	useEffect(() => { if (!disabled) inputs.current[0]?.focus(); }, [disabled]);
	const fillDigits = (value: string, index: number) => {
		const numeric = value.replace(/[^0-9]/g, "");
		const start = numeric.length >= 6 ? 0 : index;
		const incoming = numeric.slice(0, 6 - start);
		const next = [...digits];
		if (!incoming) { next[index] = ""; onChange(next); return; }
		for (let offset = 0; offset < incoming.length; offset++) next[start + offset] = incoming[offset];
		onChange(next);
		inputs.current[Math.min(start + incoming.length, 5)]?.focus();
	};

	return (
		<fieldset className="auth-verification-code" disabled={disabled} aria-describedby="verification-code-hint">
			<legend>VERIFICATION CODE</legend>
			<div className="auth-code-digits">
				{Array.from({ length: 6 }, (_, index) => (
					<input
						key={index}
						id={`verification-digit-${index + 1}`}
						ref={(element) => { inputs.current[index] = element; }}
						type="text"
						inputMode="numeric"
						autoComplete={index === 0 ? "one-time-code" : "off"}
						maxLength={index === 0 ? 6 : 1}
						pattern="[0-9]"
						required
						aria-label={`Digit ${index + 1} of 6`}
						value={digits[index]}
						onFocus={(event) => event.currentTarget.select()}
						onChange={(event) => fillDigits(event.target.value, index)}
						onPaste={(event) => { event.preventDefault(); fillDigits(event.clipboardData.getData("text"), index); }}
						onKeyDown={(event) => {
							if (event.key === "Backspace" && !digits[index] && index > 0) {
								event.preventDefault();
								const next = [...digits]; next[index - 1] = "";
								onChange(next); inputs.current[index - 1]?.focus();
							} else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
								event.preventDefault();
								inputs.current[Math.max(0, Math.min(5, index + (event.key === "ArrowLeft" ? -1 : 1)))]?.focus();
							}
						}}
					/>
				))}
			</div>
			<p id="verification-code-hint">Enter the six-digit code sent to your email. You can paste the complete code.</p>
		</fieldset>
	);
}
