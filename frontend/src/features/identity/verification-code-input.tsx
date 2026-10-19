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
		<fieldset className="auth-verification-code min-w-0 m-[24px_0_20px] p-0 border-0 [&_legend]:mb-3 [&_legend]:p-0
			[&_legend]:text-[#77716a] [&_legend]:text-[11px] [&_legend]:font-semibold [&_>_p]:m-[12px_0_0]
			[&_>_p]:text-[#80796f] [&_>_p]:text-[12px] [&_>_p]:leading-[1.6]" disabled={disabled} aria-describedby="verification-code-hint">
			<legend>VERIFICATION CODE</legend>
			<div className="auth-code-digits grid grid-cols-[repeat(6,_minmax(0,_1fr))] gap-[10px] [&_input]:min-w-0 [&_input]:w-full
				[&_input]:h-[58px] [&_input]:p-[8px_0] [&_input]:[border:1px_solid_#d8ccba] [&_input]:rounded-[8px]
				[&_input]:bg-white [&_input]:text-[#34312e] [&_input]:font-[inherit] [&_input]:text-[26px]
				[&_input]:font-medium [&_input]:[font-style:inherit] [&_input]:leading-[inherit] [&_input]:text-center
				[&_input]:[caret-color:#825b13] [&_input:focus-visible]:[border-color:#b78728]
				[&_input:focus-visible]:[outline:2px_solid_#b78728] [&_input:focus-visible]:outline-offset-[2px]
				[&_input:disabled]:bg-[#f2efe8] [&_input:disabled]:text-[#80796f] max-[600px]:gap-[7px]
				max-[600px]:[&_input]:h-[50px] max-[600px]:[&_input]:text-[23px]">
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
