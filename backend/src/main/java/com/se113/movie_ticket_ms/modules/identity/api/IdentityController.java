package com.se113.movie_ticket_ms.modules.identity.api;

import com.se113.movie_ticket_ms.modules.identity.application.AccountIdentity;
import com.se113.movie_ticket_ms.modules.identity.application.IdentityException;
import com.se113.movie_ticket_ms.modules.identity.application.IdentityService;
import com.se113.movie_ticket_ms.modules.identity.domain.Account;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/identity")
public class IdentityController {
    private final IdentityService identity;
    private final IdentityRateLimit limits;
    private final SecurityContextRepository contexts;
    private final HttpSessionCsrfTokenRepository csrf;

    public IdentityController(IdentityService identity, IdentityRateLimit limits,
            SecurityContextRepository contexts, HttpSessionCsrfTokenRepository csrf) {
        this.identity = identity; this.limits = limits; this.contexts = contexts; this.csrf = csrf;
    }

    public record Registration(@NotBlank @Size(max = 150) String fullName,
        @NotBlank @Email @Size(max = 254) String email, @NotBlank @Size(max = 72) String password,
        @NotNull @AssertTrue Boolean acceptedTerms) {}
    public record Login(@NotBlank @Email @Size(max = 254) String email,
        @NotBlank @Size(max = 72) String password, Boolean rememberMe) {}
    public record Verify(@NotNull UUID challengeId, @NotBlank @Pattern(regexp = "[0-9]{6}") String code) {}
    public record Challenge(@NotNull UUID challengeId) {}
    public record ResetRequest(@NotBlank @Email @Size(max = 254) String email) {}
    public record Reset(@NotBlank @Size(max = 200) String token, @NotBlank @Size(max = 72) String password) {}
    public record User(UUID id, String email, String fullName, String role) {
        static User from(Account account) { return new User(account.id(), account.email(), account.fullName(), account.role()); }
    }

    @GetMapping("/csrf")
    public Map<String, String> csrf(CsrfToken token, HttpServletResponse response) {
        response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
        return Map.of("token", token.getToken(), "headerName", token.getHeaderName());
    }

    @PostMapping("/register")
    public Map<String, Object> register(@Valid @RequestBody Registration input, HttpServletRequest request) {
        limits.check("register:" + request.getRemoteAddr(), 20);
        return Map.of("status", "VERIFICATION_REQUIRED", "challengeId", identity.register(input.fullName(), input.email(), input.password()));
    }

    @PostMapping("/email-verification/confirm")
    public Map<String, String> verify(@Valid @RequestBody Verify input) {
        identity.verify(input.challengeId(), input.code());
        return Map.of("status", "EMAIL_VERIFIED");
    }

    @PostMapping("/email-verification/resend")
    public Map<String, Object> resend(@Valid @RequestBody Challenge input, HttpServletRequest request) {
        limits.check("resend:" + request.getRemoteAddr(), 20);
        return Map.of("status", "VERIFICATION_REQUIRED", "challengeId", identity.resend(input.challengeId()));
    }

    @PostMapping("/login")
    public Map<String, Object> login(@Valid @RequestBody Login input, HttpServletRequest request, HttpServletResponse response) {
        limits.check("login:" + IdentityService.normalizeEmail(input.email()), 15);
        var account = identity.authenticate(input.email(), input.password());
        boolean remember = Boolean.TRUE.equals(input.rememberMe());
        var session = request.getSession(true);
        request.changeSessionId();
        session.setMaxInactiveInterval(remember ? 7 * 24 * 3600 : 30 * 60);
        var auth = UsernamePasswordAuthenticationToken.authenticated(new AccountIdentity.SessionUser(account.id(), account.updatedAt()), null,
            List.of(new SimpleGrantedAuthority("ROLE_" + account.role())));
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(auth);
        SecurityContextHolder.setContext(context);
        csrf.saveToken(null, request, response);
        contexts.saveContext(context, request, response);
        var cookie = ResponseCookie.from("JSESSIONID", session.getId()).path("/")
            .httpOnly(true).secure(request.isSecure()).sameSite("Lax");
        cookie.maxAge(remember ? Duration.ofDays(7) : Duration.ofSeconds(-1));
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.build().toString());
        response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
        return Map.of("status", "AUTHENTICATED", "user", User.from(account));
    }

    @GetMapping("/me")
    public Map<String, Object> me(Authentication authentication, HttpServletResponse response) {
        if (!(authentication.getPrincipal() instanceof AccountIdentity user))
            throw new IdentityException(401, "UNAUTHENTICATED", "Sign in to continue.");
        response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
        return Map.of("status", "AUTHENTICATED", "user", User.from(identity.current(user.accountId())));
    }

    @PostMapping("/password-reset")
    public Map<String, String> requestReset(@Valid @RequestBody ResetRequest input, HttpServletRequest request) {
        limits.check("reset:" + request.getRemoteAddr(), 10);
        limits.check("reset-email:" + IdentityService.normalizeEmail(input.email()), 3);
        identity.requestPasswordReset(input.email());
        return Map.of("status", "REQUEST_ACCEPTED");
    }

    @PostMapping("/password-reset/confirm")
    public Map<String, String> reset(@Valid @RequestBody Reset input, HttpServletRequest request) {
        limits.check("reset-confirm:" + request.getRemoteAddr(), 20);
        identity.resetPassword(input.token(), input.password());
        return Map.of("status", "PASSWORD_RESET");
    }
}
