package com.se113.movie_ticket_ms.modules.identity.infrastructure;

import com.se113.movie_ticket_ms.modules.identity.application.AccountIdentity;
import com.se113.movie_ticket_ms.modules.identity.application.IdentityService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.net.URI;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.AuthorizationRequestRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.HttpSessionOAuth2AuthorizationRequestRepository;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;

public final class GoogleAuthorizationRequests implements OAuth2AuthorizationRequestResolver,
        AuthorizationRequestRepository<OAuth2AuthorizationRequest> {
    public static final String RETURN_TO = GoogleAuthorizationRequests.class.getName() + ".returnTo";
    public static final String LINK_ACCOUNT = GoogleAuthorizationRequests.class.getName() + ".linkAccount";
    private final DefaultOAuth2AuthorizationRequestResolver resolver;
    private final HttpSessionOAuth2AuthorizationRequestRepository repository = new HttpSessionOAuth2AuthorizationRequestRepository();
    private final IdentityService identity;

    public GoogleAuthorizationRequests(ClientRegistrationRepository clients, IdentityService identity) {
        resolver = new DefaultOAuth2AuthorizationRequestResolver(clients, "/oauth2/authorization");
        this.identity = identity;
    }

    @Override public OAuth2AuthorizationRequest resolve(HttpServletRequest request) { return customize(resolver.resolve(request), request); }
    @Override public OAuth2AuthorizationRequest resolve(HttpServletRequest request, String id) { return customize(resolver.resolve(request, id), request); }

    private OAuth2AuthorizationRequest customize(OAuth2AuthorizationRequest authorization, HttpServletRequest request) {
        if (authorization == null) return null;
        var builder = OAuth2AuthorizationRequest.from(authorization);
        builder.attributes(values -> values.put(RETURN_TO, safeReturnTo(request.getParameter("returnTo"))));
        if ("link".equals(request.getParameter("intent"))) {
            var authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !(authentication.getPrincipal() instanceof AccountIdentity principal))
                throw new OAuth2AuthenticationException(new OAuth2Error("LINK_REQUIRES_LOGIN"));
            var account = identity.current(principal.accountId());
            if (!"CUSTOMER".equals(account.role())) throw new OAuth2AuthenticationException(new OAuth2Error("LINK_REQUIRES_CUSTOMER"));
            // Bound to Spring's saved OAuth state, never read from callback query parameters.
            builder.attributes(values -> values.put(LINK_ACCOUNT, account.id()));
        }
        return builder.build();
    }

    public static String safeReturnTo(String path) {
        if (path == null || !path.startsWith("/") || path.startsWith("//") || path.contains("\\")
                || path.chars().anyMatch(c -> c < 32 || c == 127) || path.length() > 2048) return "/";
        try {
            var uri = URI.create(path);
            if (uri.getHost() != null || uri.getScheme() != null || uri.getRawFragment() != null
                    || !java.util.Set.of("/", "/movie-list", "/movie-showtime", "/seat-selection", "/ticket-checkout", "/account")
                        .contains(uri.getRawPath())) return "/";
            return uri.toString();
        } catch (IllegalArgumentException ex) { return "/"; }
    }

    @Override public OAuth2AuthorizationRequest loadAuthorizationRequest(HttpServletRequest request) { return repository.loadAuthorizationRequest(request); }
    @Override public void saveAuthorizationRequest(OAuth2AuthorizationRequest value, HttpServletRequest request, HttpServletResponse response) {
        repository.saveAuthorizationRequest(value, request, response);
    }
    @Override public OAuth2AuthorizationRequest removeAuthorizationRequest(HttpServletRequest request, HttpServletResponse response) {
        var saved = repository.removeAuthorizationRequest(request, response);
        if (saved != null) {
            request.setAttribute(RETURN_TO, saved.getAttribute(RETURN_TO));
            var linkId = saved.getAttribute(LINK_ACCOUNT);
            // Linking must still have the same active application session on callback.
            if (linkId != null) {
                var auth = SecurityContextHolder.getContext().getAuthentication();
                if (auth == null || !(auth.getPrincipal() instanceof AccountIdentity principal) || !linkId.equals(principal.accountId()))
                    throw new OAuth2AuthenticationException(new OAuth2Error("LINK_REQUIRES_LOGIN"));
                request.setAttribute(LINK_ACCOUNT, linkId);
            }
        }
        return saved;
    }
}
