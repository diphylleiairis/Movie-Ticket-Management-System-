package com.se113.movie_ticket_ms.modules.identity.application;

import com.se113.movie_ticket_ms.modules.identity.domain.Account;
import com.se113.movie_ticket_ms.modules.identity.infrastructure.IdentityRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class IdentityService {
    private final IdentityRepository accounts;
    private final PasswordEncoder passwords;
    private final IdentityMail mail;
    private final SecureRandom random = new SecureRandom();
    private final String dummyHash;

    public IdentityService(IdentityRepository accounts, PasswordEncoder passwords, IdentityMail mail) {
        this.accounts = accounts;
        this.passwords = passwords;
        this.mail = mail;
        this.dummyHash = passwords.encode(UUID.randomUUID().toString());
    }

    public static String normalizeEmail(String email) { return email.strip().toLowerCase(Locale.ROOT); }

    public static void validatePassword(String password) {
        if (password == null || password.length() < 8 || password.getBytes(StandardCharsets.UTF_8).length > 72
                || !password.matches("(?s).*\\d.*")) {
            throw new IdentityException(400, "INVALID_PASSWORD", "Use 8 or more characters including a number, up to 72 UTF-8 bytes.");
        }
    }

    @Transactional
    public UUID register(String name, String email, String password) {
        validatePassword(password);
        email = normalizeEmail(email);
        accounts.lockKeys("email:" + email);
        if (accounts.byEmail(email).isPresent()) throw new IdentityException(409, "EMAIL_EXISTS", "This email is already registered.");
        var now = accounts.now();
        var account = accounts.create(email, passwords.encode(password), name.strip(), false, now);
        String code = String.format(Locale.ROOT, "%06d", random.nextInt(1_000_000));
        UUID challenge = accounts.challenge(account.id(), email, passwords.encode(code), now);
        mail.verification(email, code);
        return challenge;
    }

    @Transactional
    public Account authenticate(String email, String password) {
        var account = accounts.byEmail(normalizeEmail(email)).orElse(null);
        String hash = account == null || account.passwordHash() == null ? dummyHash : account.passwordHash();
        boolean acceptable = password.getBytes(StandardCharsets.UTF_8).length <= 72;
        boolean matches = passwords.matches(acceptable ? password : "invalid-password", hash);
        if (!acceptable || !matches || account == null || account.passwordHash() == null || "DISABLED".equals(account.status()))
            throw new IdentityException(401, "INVALID_CREDENTIALS", "The email or password is incorrect.");
        if (!account.active()) throw new IdentityException(403, "EMAIL_NOT_VERIFIED", "Verify your email before signing in.");
        return account;
    }

    @Transactional(noRollbackFor = IdentityException.InvalidCode.class)
    public void verify(UUID id, String code) {
        var challenge = accounts.challenge(id).orElseThrow(IdentityService::invalidChallenge);
        var account = accounts.byId(challenge.userId()).orElseThrow(IdentityService::invalidChallenge);
        challenge = accounts.challenge(id).orElseThrow(IdentityService::invalidChallenge);
        if (challenge.closed() || !"PENDING_VERIFICATION".equals(account.status()) || !account.email().equals(challenge.email()))
            throw invalidChallenge();
        var now = accounts.now();
        if (!now.isBefore(challenge.expiresAt())) throw new IdentityException(400, "EXPIRED_VERIFICATION_CODE", "The verification code has expired.");
        if (challenge.failures() >= 5) throw new IdentityException(429, "TOO_MANY_ATTEMPTS", "Request a new verification code.");
        if (!passwords.matches(code, challenge.hash())) {
            accounts.failedCode(id);
            throw new IdentityException.InvalidCode();
        }
        accounts.activate(challenge, now);
    }

    @Transactional
    public UUID resend(UUID id) {
        var challenge = accounts.challenge(id).orElseThrow(IdentityService::invalidChallenge);
        var account = accounts.byId(challenge.userId()).orElseThrow(IdentityService::invalidChallenge);
        challenge = accounts.challenge(id).orElseThrow(IdentityService::invalidChallenge);
        if (challenge.closed() || !"PENDING_VERIFICATION".equals(account.status())) throw invalidChallenge();
        var now = accounts.now();
        if (now.isBefore(challenge.createdAt().plusSeconds(60)))
            throw new IdentityException(429, "TOO_MANY_ATTEMPTS", "Wait a minute before requesting another code.");
        String code = String.format(Locale.ROOT, "%06d", random.nextInt(1_000_000));
        UUID next = accounts.challenge(account.id(), account.email(), passwords.encode(code), now);
        mail.verification(account.email(), code);
        return next;
    }

    @Transactional
    public Account google(String subject, String email, String name, boolean verified, UUID linkAccountId) {
        if (!verified) throw new IdentityException(403, "GOOGLE_EMAIL_NOT_VERIFIED", "Google has not verified this email. Register using email and password.");
        if (subject == null || subject.isBlank() || email == null || !email.contains("@"))
            throw new IdentityException(401, "INVALID_GOOGLE_IDENTITY", "Google did not provide a valid identity.");
        email = normalizeEmail(email);
        accounts.lockKeys("email:" + email, "google:" + subject);
        var existing = accounts.byGoogleSubject(subject);
        if (existing.isPresent()) {
            var account = existing.get();
            requireGoogleCustomer(account);
            if (linkAccountId != null && !linkAccountId.equals(account.id()))
                throw new IdentityException(409, "GOOGLE_ALREADY_LINKED", "This Google identity is already linked.");
            return account;
        }
        if (linkAccountId != null) {
            var account = accounts.byId(linkAccountId).orElseThrow(IdentityService::invalidCredentials);
            requireGoogleCustomer(account);
            if (!account.email().equals(email))
                throw new IdentityException(409, "GOOGLE_EMAIL_MISMATCH", "Link a Google account with your current verified email.");
            if (accounts.hasGoogleIdentity(account.id()))
                throw new IdentityException(409, "GOOGLE_ALREADY_LINKED", "This Customer already has a Google identity.");
            accounts.linkGoogle(account.id(), subject);
            return account;
        }
        if (accounts.byEmail(email).isPresent())
            throw new IdentityException(409, "ACCOUNT_LINK_REQUIRED", "Sign in with your existing account before linking Google.");
        var account = accounts.create(email, null, name == null || name.isBlank() ? email : name.strip(), true, accounts.now());
        accounts.linkGoogle(account.id(), subject);
        return account;
    }

    private static void requireGoogleCustomer(Account account) {
        if (!account.active() || !"CUSTOMER".equals(account.role()))
            throw new IdentityException(403, "ACCOUNT_UNAVAILABLE", "This account cannot sign in using Google.");
    }

    @Transactional
    public Account current(UUID id) {
        var account = accounts.byId(id).orElseThrow(IdentityService::invalidCredentials);
        if (!account.active()) throw invalidCredentials();
        return account;
    }

    public record Profile(UUID id, String email, String fullName, String phone, String role) {}

    @Transactional
    public Profile profile(UUID id) {
        var account = current(id);
        return new Profile(account.id(), account.email(), account.fullName(), accounts.phone(id), account.role());
    }

    @Transactional
    public Account updateProfile(UUID id, String fullName, String phone) {
        var account = current(id);
        if (!"CUSTOMER".equals(account.role()))
            throw new IdentityException(403, "ACCESS_DENIED", "Only Customers may edit their personal profile.");
        if (fullName == null || fullName.isBlank() || fullName.strip().length() > 150)
            throw new IdentityException(400, "INVALID_PROFILE", "Enter a name of up to 150 characters.");
        phone = phone == null || phone.isBlank() ? null : phone.strip();
        if (phone != null && !phone.matches("\\+?[0-9][0-9 ()-]{6,24}"))
            throw new IdentityException(400, "INVALID_PROFILE", "Enter a valid phone number.");
        return accounts.updateProfile(id, fullName.strip(), phone);
    }

    @Transactional
    public void requestPasswordReset(String email) {
        email = normalizeEmail(email);
        accounts.lockKeys("email:" + email);
        var account = accounts.byEmail(email).orElseThrow(() ->
            new IdentityException(404, "ACCOUNT_NOT_FOUND", "This account does not exist."));
        if (!"ACTIVE".equals(account.status()))
            throw new IdentityException(403, "ACCOUNT_UNAVAILABLE", "This account is not active. Please contact an administrator.");
        // Verified Customers may create their first password through the same reset flow.
        if (!account.active() || !"CUSTOMER".equals(account.role())) return;
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        accounts.resetToken(account.id(), account.email(), tokenHash(token), accounts.now());
        mail.passwordReset(account.email(), token);
    }

    @Transactional
    public void resetPassword(String token, String password) {
        validatePassword(password);
        String hash = tokenHash(token);
        var reset = accounts.reset(hash).orElseThrow(IdentityService::invalidReset);
        var account = accounts.byId(reset.userId()).orElseThrow(IdentityService::invalidReset);
        reset = accounts.reset(hash).orElseThrow(IdentityService::invalidReset);
        var now = accounts.now();
        if (reset.consumed() || !now.isBefore(reset.expiresAt()) || !account.active()
                || !account.email().equals(reset.email()) || !"CUSTOMER".equals(account.role())) throw invalidReset();
        accounts.changePassword(account.id(), passwords.encode(password), now);
    }

    private static String tokenHash(String token) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8))); }
        catch (java.security.NoSuchAlgorithmException ex) { throw new IllegalStateException(ex); }
    }
    private static IdentityException invalidChallenge() { return new IdentityException(400, "INVALID_VERIFICATION_CODE", "The verification challenge is invalid."); }
    private static IdentityException invalidCredentials() { return new IdentityException(401, "INVALID_CREDENTIALS", "Sign in again."); }
    private static IdentityException invalidReset() { return new IdentityException(400, "INVALID_RESET_TOKEN", "The reset token is invalid or expired."); }
}
