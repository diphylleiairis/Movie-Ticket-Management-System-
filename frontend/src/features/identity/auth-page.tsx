import { useEffect, useRef, useState, type FormEvent } from "react";
import {
	Link,
	useNavigate,
	useOutletContext,
	useSearchParams,
} from "react-router-dom";
import { ArrowRight, CheckCircle2, Eye, EyeOff, Mail } from "lucide-react";
import type { AuthLayoutContext } from "./auth-layout";
import { authPagePath, safeReturnTo } from "./auth-navigation";
import {
	registerCustomer,
	resendVerificationCode,
	verifyRegistrationCode,
	requestPasswordReset,
	signIn,
	startSocialAuth,
	type AuthProvider,
} from "../../api/identity-api";
import VerificationCodeInput from "./verification-code-input";

type AuthMode = "login" | "register" | "forgot-password";

const googleErrors: Record<string, string> = {
	ACCOUNT_LINK_REQUIRED: "This email already has an account. Sign in with your password to link Google.",
	GOOGLE_EMAIL_NOT_VERIFIED: "Google has not verified your email. Register using email and password instead.",
	ACCOUNT_UNAVAILABLE: "This account cannot sign in using Google.",
	GOOGLE_EMAIL_MISMATCH: "Choose a Google account with your current verified email.",
	GOOGLE_ALREADY_LINKED: "This Google account is already linked.",
	LINK_REQUIRES_LOGIN: "Sign in with your existing account before linking Google.",
	GOOGLE_LOGIN_FAILED: "Google sign-in could not be completed. Please try again.",
};

function ProviderIcon({ provider }: { provider: AuthProvider }) {
	return provider === "google" ? (
		<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
			<path
				fill="#4285F4"
				d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.89-1.74 2.98-4.3 2.98-7.36Z"
			/>
			<path
				fill="#34A853"
				d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.81-1.76-5.6-4.13H3.06v2.6A10 10 0 0 0 12 22Z"
			/>
			<path
				fill="#FBBC05"
				d="M6.4 13.91a6 6 0 0 1 0-3.82v-2.6H3.06a10 10 0 0 0 0 9.02l3.34-2.6Z"
			/>
			<path
				fill="#EA4335"
				d="M12 5.96c1.47 0 2.79.51 3.83 1.51l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.94 5.49l3.34 2.6A5.95 5.95 0 0 1 12 5.96Z"
			/>
		</svg>
	) : (
		<svg
			viewBox="0 0 24 24"
			width="18"
			height="18"
			fill="currentColor"
			aria-hidden="true"
		>
			<path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.77 3.08.82 1.17-.24 2.29-.96 3.54-.87 1.5.12 2.63.72 3.38 1.8-3.1 1.89-2.36 6.04.48 7.2-.57 1.52-1.31 3.03-2.49 4.03ZM12.03 7.25c-.15-2.26 1.68-4.12 3.78-4.3.29 2.6-2.36 4.55-3.78 4.3Z" />
		</svg>
	);
}

function PasswordField({
	id,
	label,
	value,
	onChange,
	registration = false,
}: {
	id: string;
	label: string;
	value: string;
	onChange: (value: string) => void;
	registration?: boolean;
}) {
	const [visible, setVisible] = useState(false);
	return (
		<div
			className="auth-field min-w-0 [&_>_label]:block [&_>_label]:mb-[7px] [&_>_label]:text-[#77716a] [&_>_label]:text-[10px]
			[&_>_label]:font-semibold [&_input]:block [&_input]:w-full [&_input]:min-h-[42px] [&_input]:p-[11px_13px]
			[&_input]:[border:1px_solid_#e5ded4] [&_input]:rounded-[6px] [&_input]:bg-white [&_input]:text-[#34312e]
			[&_input]:font-[inherit] [&_input]:text-[13px] [&_input]:[font-weight:inherit] [&_input]:[font-style:inherit]
			[&_input]:leading-[inherit] [&_input::placeholder]:text-[#9b948b]
			[&_input:focus-visible]:[outline:2px_solid_#a46a34] [&_input:focus-visible]:outline-offset-[2px]
			[&_>_small]:block [&_>_small]:mt-2 [&_>_small]:text-[#80796f] [&_>_small]:text-[11px]
			[&_>_small]:leading-[1.5]"
		>
			<label htmlFor={id}>{label}</label>
			<div
				className="auth-password-wrap relative [&_input]:pr-[45px] [&_>_button]:absolute [&_>_button]:top-0
				[&_>_button]:right-[6px] [&_>_button]:grid [&_>_button]:place-items-center [&_>_button]:w-[34px]
				[&_>_button]:h-full [&_>_button]:p-0 [&_>_button]:border-0 [&_>_button]:rounded-[4px]
				[&_>_button]:bg-transparent [&_>_button]:text-[#80796f] [&_>_button:hover]:text-[#34312e]"
			>
				<input
					id={id}
					name={id}
					type={visible ? "text" : "password"}
					required
					autoComplete={registration ? "new-password" : "current-password"}
					value={value}
					onChange={(event) => onChange(event.target.value)}
					minLength={registration ? 8 : undefined}
					pattern={
						registration && id !== "confirm-password"
							? "(?=.*[0-9]).{8,}"
							: undefined
					}
					title={
						registration
							? "Use at least 8 characters, including a number."
							: undefined
					}
					placeholder={
						id === "confirm-password"
							? "Re-enter your password"
							: registration
								? "Create a password"
								: "Enter your password"
					}
				/>
				<button
					type="button"
					aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
					aria-pressed={visible}
					onClick={() => setVisible(!visible)}
				>
					{visible ? (
						<EyeOff size={17} aria-hidden="true" />
					) : (
						<Eye size={17} aria-hidden="true" />
					)}
				</button>
			</div>
			{registration && id !== "confirm-password" && (
				<small>Use at least 8 characters, including a number.</small>
			)}
		</div>
	);
}

export default function AuthPage({ mode }: { mode: AuthMode }) {
	const registration = mode === "register";
	const resetting = mode === "forgot-password";
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const { openInfo } = useOutletContext<AuthLayoutContext>();
	const returnTo = safeReturnTo(searchParams.get("returnTo"));
	const [fullName, setFullName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmation, setConfirmation] = useState("");
	const [rememberMe, setRememberMe] = useState(false);
	const [acceptedTerms, setAcceptedTerms] = useState(false);
	const [error, setError] = useState(() => {
		const code = searchParams.get("oauthError");
		return code ? googleErrors[code] ?? googleErrors.GOOGLE_LOGIN_FAILED : "";
	});
	const [completed, setCompleted] = useState(false);
	const [challengeId, setChallengeId] = useState<string | null>(null);
	const [codeDigits, setCodeDigits] = useState<string[]>(Array(6).fill(""));
	const [verificationAction, setVerificationAction] = useState<
		"verify" | "resend" | null
	>(null);
	const [verificationNotice, setVerificationNotice] = useState("");
	const [pending, setPending] = useState(false);
	const submitting = useRef(false);
	const active = useRef(true);
	useEffect(() => {
		active.current = true;
		return () => {
			active.current = false;
		};
	}, []);

	const submit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (submitting.current) return;
		setError("");
		if (registration && !fullName.trim()) {
			setError("Enter your full name.");
			return;
		}
		if (registration && password !== confirmation) {
			setError("The passwords do not match.");
			document.getElementById("confirm-password")?.focus();
			return;
		}
		if (registration && !acceptedTerms) {
			setError("Please agree to the Terms & Conditions and Privacy Policy.");
			return;
		}
		submitting.current = true;
		setPending(true);
		try {
			if (registration) {
				const challenge = await registerCustomer(
					fullName.trim(),
					email.trim(),
					password,
				);
				if (!active.current) return;
				setPassword("");
				setConfirmation("");
				setChallengeId(challenge);
				setCodeDigits(Array(6).fill(""));
				setVerificationNotice(
					`A six-digit verification code has been sent to ${email.trim()}.`,
				);
			} else if (resetting) {
				await requestPasswordReset(email.trim());
				if (!active.current) return;
				setCompleted(true);
			} else {
				await signIn(email.trim(), password, rememberMe);
				if (!active.current) return;
				setPassword("");
				if (searchParams.get("oauthError") === "ACCOUNT_LINK_REQUIRED") {
					startSocialAuth("google", "link", returnTo);
					return;
				}
				navigate(returnTo, { replace: true });
			}
		} catch (failure) {
			if (!active.current) return;
			setError(
				failure instanceof Error
					? failure.message
					: "The request could not be completed. Please try again.",
			);
		} finally {
			submitting.current = false;
			if (active.current) setPending(false);
		}
	};
	const handleVerification = async (action: "verify" | "resend") => {
		if (submitting.current || !challengeId) return;
		if (
			action === "verify" &&
			!codeDigits.every((digit) => /^[0-9]$/.test(digit))
		) {
			setError("Enter the complete six-digit verification code.");
			return;
		}
		submitting.current = true;
		setPending(true);
		setVerificationAction(action);
		setError("");
		setVerificationNotice("");
		try {
			if (action === "verify") {
				await verifyRegistrationCode(challengeId, codeDigits.join(""));
				if (!active.current) return;
				setCodeDigits(Array(6).fill(""));
				setCompleted(true);
			} else {
				const nextChallenge = await resendVerificationCode(challengeId);
				if (!active.current) return;
				setChallengeId(nextChallenge);
				setCodeDigits(Array(6).fill(""));
				setVerificationNotice(
					`A new six-digit code has been sent to ${email.trim()}.`,
				);
			}
		} catch (failure) {
			if (!active.current) return;
			setError(
				failure instanceof Error
					? failure.message
					: "Verification could not be completed. Please try again.",
			);
		} finally {
			submitting.current = false;
			if (active.current) setPending(false);
			setVerificationAction(null);
		}
	};
	const socialAuth = (provider: AuthProvider) => {
		setError("");
		if (registration && !acceptedTerms) {
			setError(
				"Please agree to the Terms & Conditions and Privacy Policy before continuing.",
			);
			return;
		}
		try {
			startSocialAuth(provider, registration ? "register" : "login", returnTo);
		} catch (failure) {
			if (!active.current) return;
			setError(
				failure instanceof Error
					? failure.message
					: "This sign-in method is unavailable.",
			);
		}
	};

	return (
		<section
			className="auth-form-panel w-full max-w-[440px] py-[10px] [&_h1]:m-[0_0_12px]
			[&_h1]:text-[clamp(29px,_3vw,_38px)] [&_h1]:font-normal [&_h1]:tracking-[-.025em] [&_h1]:leading-[1.15]
			[@media(min-width:_851px)_and_(max-height:_800px)]:py-[0] max-[850px]:max-w-[none]
			max-[600px]:[&_h1]:text-[30px]"
			aria-labelledby="auth-title"
		>
			<span className="auth-eyebrow block mb-3 text-[color:var(--auth-accent)] text-[10px] font-semibold">
				YOUR LUMIÈRE ACCOUNT
			</span>
			<h1 id="auth-title">
				{completed
					? registration
						? "Email verified"
						: "Check your inbox"
					: registration && challengeId
						? "Verify your email"
						: registration
							? "Create your account"
							: resetting
								? "Forgot your password?"
								: "Welcome back"}
			</h1>
			{registration && challengeId && !completed ? (
				<div
					className="auth-verification-panel [&_.auth-intro]:[overflow-wrap:anywhere] [&_.auth-submit:disabled]:cursor-not-allowed
					[&_form[aria-busy=true]_.auth-submit:disabled]:cursor-wait"
				>
					<p className="auth-intro m-[0_0_20px] text-[#80796f] text-[14px] leading-[1.6]">
						We sent a verification code to <strong>{email.trim()}</strong>.
					</p>
					{verificationNotice && (
						<p
							className="auth-verification-notice m-0 p-[10px_12px] [border:1px_solid_#e3d7ba] rounded-[6px] bg-[#fffaf0]
							text-[#825b13] text-[13px] leading-[1.6] [overflow-wrap:anywhere]"
							role="status"
						>
							{verificationNotice}
						</p>
					)}
					{error && (
						<p
							className="auth-error m-[0_0_14px] p-[10px_12px] [border:1px_solid_#e4c9c3] rounded-[6px] bg-[#fff4f0] text-[#8a3529]
							text-[13px] leading-[1.6]"
							role="alert"
						>
							{error}
						</p>
					)}
					<form
						onSubmit={(event) => {
							event.preventDefault();
							void handleVerification("verify");
						}}
						aria-busy={pending}
					>
						<VerificationCodeInput
							digits={codeDigits}
							disabled={pending}
							onChange={(digits) => {
								setCodeDigits(digits);
								setError("");
							}}
						/>
						<button
							className="auth-submit flex items-center justify-center gap-3 w-full min-h-[43px] p-[12px_16px] border-0 rounded-[6px]
								bg-[var(--auth-gold)] text-[#171717] text-[12px] font-semibold no-underline
								[&:hover:not(:disabled)]:bg-[#d9a326] disabled:cursor-wait disabled:opacity-[.65]"
							type="submit"
							disabled={
								pending || !codeDigits.every((digit) => /^[0-9]$/.test(digit))
							}
						>
							{verificationAction === "verify" ? "VERIFYING…" : "VERIFY EMAIL"}
							<ArrowRight size={16} aria-hidden="true" />
						</button>
					</form>
					<p
						className="auth-resend m-[20px_0_0] text-[#80796f] text-[13px] leading-[1.6] text-center [&_button]:p-0
						[&_button]:border-0 [&_button]:bg-transparent [&_button]:text-[color:var(--auth-accent)]
						[&_button]:font-[inherit] [&_button]:text-inherit [&_button]:[font-weight:inherit]
						[&_button]:[font-style:inherit] [&_button]:leading-[inherit] [&_button]:underline
						[&_button]:underline-offset-[3px] [&_button:disabled]:cursor-wait [&_button:disabled]:opacity-[.6]"
					>
						Didn’t receive a code?{" "}
						<button
							type="button"
							disabled={pending}
							onClick={() => {
								void handleVerification("resend");
							}}
						>
							{verificationAction === "resend" ? "SENDING…" : "Resend code"}
						</button>
					</p>
					<p
						className="auth-switch [&_a]:text-[color:var(--auth-accent)] [&_a]:underline [&_a]:underline-offset-[2px]
						[&_a:hover]:underline [&_a:hover]:underline-offset-[2px] m-[20px_0_0] text-[#80796f] text-[13px] text-center
						leading-[1.5]"
					>
						<Link to={authPagePath("login", returnTo)}>Back to sign in</Link>
					</p>
				</div>
			) : completed ? (
				<div
					className="auth-completed grid gap-[18px] pt-3 [&_>_svg]:text-[color:var(--auth-accent)] [&_p]:m-0 [&_p]:text-[#77716a]
					[&_p]:text-[15px] [&_p]:leading-[1.7] [&_p]:[overflow-wrap:anywhere] [&_small]:flex [&_small]:items-center
					[&_small]:gap-[7px] [&_small]:text-[#77716a] [&_small]:text-[12px] [&_small]:leading-[1.5]"
					role="status"
				>
					{registration ? (
						<CheckCircle2 size={36} aria-hidden="true" />
					) : (
						<Mail size={36} aria-hidden="true" />
					)}
					<p>
						{registration
							? `Your email ${email.trim()} has been verified. You can now sign in to your account.`
							: "If an account uses this verified email, you’ll receive instructions to reset your password."}
					</p>
					<Link
						className="auth-submit flex items-center justify-center gap-3 w-full min-h-[43px] p-[12px_16px] border-0 rounded-[6px]
						bg-[var(--auth-gold)] text-[#171717] text-[12px] font-semibold no-underline
						[&:hover:not(:disabled)]:bg-[#d9a326] disabled:cursor-wait disabled:opacity-[.65]"
						to={authPagePath("login", returnTo)}
					>
						BACK TO SIGN IN <ArrowRight size={16} aria-hidden="true" />
					</Link>
					{registration && (
						<small>
							<CheckCircle2 size={14} aria-hidden="true" />
							Your email was successfully verified.
						</small>
					)}
				</div>
			) : (
				<>
					<p className="auth-intro m-[0_0_20px] text-[#80796f] text-[14px] leading-[1.6]">
						{registration
							? "Your next favorite film is just a screening away."
							: resetting
								? "Enter your verified email and we’ll help you get back to the movies."
								: "Sign in to book your next screening and keep all your cinema moments in one place."}
					</p>
					{!resetting && (
						<>
							<div
								className="auth-providers grid grid-cols-1 gap-3 [&_button]:flex [&_button]:items-center
									[&_button]:justify-center [&_button]:gap-[9px] [&_button]:min-h-[42px] [&_button]:p-[10px]
									[&_button]:[border:1px_solid_#e5ded4] [&_button]:rounded-[6px] [&_button]:bg-white [&_button]:text-[#34312e]
									[&_button]:text-[13px] [&_button:hover:not(:disabled)]:[border-color:#bda36b]
									[&_button:hover:not(:disabled)]:bg-[#fffcf4] [&_svg]:flex-none [&_button:disabled]:cursor-wait
									[&_button:disabled]:opacity-[.65]"
								aria-label={
									registration
										? "Register with a provider"
										: "Sign in with a provider"
								}
							>
								{(["google"] as const).map((provider) => (
									<button
										key={provider}
										type="button"
										disabled={pending}
										onClick={() => socialAuth(provider)}
									>
										<ProviderIcon provider={provider} />
										<span>{provider === "google" ? "Google" : "Apple ID"}</span>
									</button>
								))}
							</div>
							<div
								className="auth-divider flex items-center gap-3 m-[16px_0] text-[#80796f] text-[11px] before:content-['']
								before:flex-1 before:[border-top:1px_solid_#e5ded4] after:content-[''] after:flex-1
								after:[border-top:1px_solid_#e5ded4]"
							>
								<span>or continue with email</span>
							</div>
						</>
					)}
					{error && (
						<p
							className="auth-error m-[0_0_14px] p-[10px_12px] [border:1px_solid_#e4c9c3] rounded-[6px] bg-[#fff4f0] text-[#8a3529]
							text-[13px] leading-[1.6]"
							role="alert"
						>
							{error}
						</p>
					)}
					<form onSubmit={submit} aria-busy={pending}>
						<fieldset
							className="auth-form-fields grid gap-4 min-w-0 m-0 p-0 border-0"
							disabled={pending}
						>
							{registration && (
								<div
									className="auth-field min-w-0 [&_>_label]:block [&_>_label]:mb-[7px] [&_>_label]:text-[#77716a] [&_>_label]:text-[10px]
									[&_>_label]:font-semibold [&_input]:block [&_input]:w-full [&_input]:min-h-[42px] [&_input]:p-[11px_13px]
									[&_input]:[border:1px_solid_#e5ded4] [&_input]:rounded-[6px] [&_input]:bg-white [&_input]:text-[#34312e]
									[&_input]:font-[inherit] [&_input]:text-[13px] [&_input]:[font-weight:inherit] [&_input]:[font-style:inherit]
									[&_input]:leading-[inherit] [&_input::placeholder]:text-[#9b948b]
									[&_input:focus-visible]:[outline:2px_solid_#a46a34] [&_input:focus-visible]:outline-offset-[2px]
									[&_>_small]:block [&_>_small]:mt-2 [&_>_small]:text-[#80796f] [&_>_small]:text-[11px]
									[&_>_small]:leading-[1.5]"
								>
									<label htmlFor="full-name">FULL NAME</label>
									<input
										id="full-name"
										name="fullName"
										autoComplete="name"
										required
										maxLength={100}
										placeholder="Enter your full name"
										value={fullName}
										onChange={(event) => setFullName(event.target.value)}
									/>
								</div>
							)}
							<div
								className="auth-field min-w-0 [&_>_label]:block [&_>_label]:mb-[7px] [&_>_label]:text-[#77716a] [&_>_label]:text-[10px]
								[&_>_label]:font-semibold [&_input]:block [&_input]:w-full [&_input]:min-h-[42px] [&_input]:p-[11px_13px]
								[&_input]:[border:1px_solid_#e5ded4] [&_input]:rounded-[6px] [&_input]:bg-white [&_input]:text-[#34312e]
								[&_input]:font-[inherit] [&_input]:text-[13px] [&_input]:[font-weight:inherit] [&_input]:[font-style:inherit]
								[&_input]:leading-[inherit] [&_input::placeholder]:text-[#9b948b]
								[&_input:focus-visible]:[outline:2px_solid_#a46a34] [&_input:focus-visible]:outline-offset-[2px]
								[&_>_small]:block [&_>_small]:mt-2 [&_>_small]:text-[#80796f] [&_>_small]:text-[11px]
								[&_>_small]:leading-[1.5]"
							>
								<label htmlFor="auth-email">EMAIL ADDRESS</label>
								<input
									id="auth-email"
									name="email"
									type="email"
									autoComplete={resetting ? "email" : "username"}
									required
									maxLength={254}
									placeholder="Enter your email address"
									value={email}
									onChange={(event) => setEmail(event.target.value)}
								/>
							</div>
							{!resetting && (
								<PasswordField
									id="auth-password"
									label="PASSWORD"
									value={password}
									onChange={setPassword}
									registration={registration}
								/>
							)}
							{registration && (
								<PasswordField
									id="confirm-password"
									label="CONFIRM PASSWORD"
									value={confirmation}
									onChange={setConfirmation}
									registration
								/>
							)}
							{registration ? (
								<label
									className="auth-terms flex items-start gap-2 text-[#80796f] text-[12px] leading-[1.6] [&_button]:inline [&_button]:p-0
									[&_button]:border-0 [&_button]:bg-none [&_button]:text-[#605746] [&_button]:text-inherit
									[&_button]:underline [&_button]:underline-offset-[2px]"
								>
									<input
										type="checkbox"
										required
										checked={acceptedTerms}
										onChange={(event) => setAcceptedTerms(event.target.checked)}
									/>
									<span>
										I agree to the{" "}
										<button
											type="button"
											onClick={() => openInfo("Terms & Conditions")}
										>
											Terms &amp; Conditions
										</button>{" "}
										and{" "}
										<button
											type="button"
											onClick={() => openInfo("Privacy Policy")}
										>
											Privacy Policy
										</button>
										.
									</span>
								</label>
							) : (
								!resetting && (
									<div
										className="auth-login-options flex justify-between items-center gap-3 text-[12px] [&_>_label]:flex
										[&_>_label]:items-start [&_>_label]:gap-2 [&_>_label]:text-[#80796f] [&_>_label]:text-[12px]
										[&_>_label]:leading-[1.6] [&_a]:text-[color:var(--auth-accent)] [&_a]:no-underline [&_a:hover]:underline
										[&_a:hover]:underline-offset-[2px]"
									>
										<label>
											<input
												type="checkbox"
												checked={rememberMe}
												onChange={(event) =>
													setRememberMe(event.target.checked)
												}
											/>
											Remember me
										</label>
										<Link to={authPagePath("forgot-password", returnTo)}>
											Forgot password?
										</Link>
									</div>
								)
							)}
							<button
								className="auth-submit flex items-center justify-center gap-3 w-full min-h-[43px] p-[12px_16px] border-0 rounded-[6px]
								bg-[var(--auth-gold)] text-[#171717] text-[12px] font-semibold no-underline
								[&:hover:not(:disabled)]:bg-[#d9a326] disabled:cursor-wait disabled:opacity-[.65]"
								type="submit"
								disabled={pending}
							>
								{pending
									? "PLEASE WAIT…"
									: registration
										? "SEND VERIFICATION CODE"
										: resetting
											? "SEND RESET LINK"
											: searchParams.get("oauthError") === "ACCOUNT_LINK_REQUIRED"
												? "SIGN IN AND LINK GOOGLE"
												: "SIGN IN"}
								<ArrowRight size={16} aria-hidden="true" />
							</button>
						</fieldset>
					</form>
					<p
						className="auth-switch [&_a]:text-[color:var(--auth-accent)] [&_a]:underline [&_a]:underline-offset-[2px]
						[&_a:hover]:underline [&_a:hover]:underline-offset-[2px] m-[20px_0_0] text-[#80796f] text-[13px] text-center
						leading-[1.5]"
					>
						{registration ? (
							<>
								Already have an account?{" "}
								<Link to={authPagePath("login", returnTo)}>Sign in</Link>
							</>
						) : resetting ? (
							<Link to={authPagePath("login", returnTo)}>Back to sign in</Link>
						) : (
							<>
								New to The Lumière?{" "}
								<Link to={authPagePath("register", returnTo)}>
									Create an account
								</Link>
							</>
						)}
					</p>
				</>
			)}
		</section>
	);
}
