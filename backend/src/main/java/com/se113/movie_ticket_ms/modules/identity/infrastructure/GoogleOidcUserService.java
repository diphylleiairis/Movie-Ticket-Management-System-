package com.se113.movie_ticket_ms.modules.identity.infrastructure;

import com.se113.movie_ticket_ms.modules.identity.application.AccountIdentity;
import com.se113.movie_ticket_ms.modules.identity.application.IdentityException;
import com.se113.movie_ticket_ms.modules.identity.application.IdentityService;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.OidcUserInfo;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Component
public class GoogleOidcUserService implements OAuth2UserService<OidcUserRequest, OidcUser> {
    private final IdentityService identity;
    private final OidcUserService delegate = new OidcUserService();

    public GoogleOidcUserService(IdentityService identity) { this.identity = identity; }

    @Override
    public OidcUser loadUser(OidcUserRequest request) {
        if (!"google".equals(request.getClientRegistration().getRegistrationId()))
            throw new OAuth2AuthenticationException(new OAuth2Error("UNSUPPORTED_PROVIDER"));
        // Spring's OIDC provider has already validated the ID token signature, issuer,
        // audience, expiration and nonce. Never take verification from browser input.
        var google = delegate.loadUser(request);
        var token = request.getIdToken();
        var attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        UUID linkId = attributes == null ? null : (UUID) attributes.getRequest().getAttribute(GoogleAuthorizationRequests.LINK_ACCOUNT);
        try {
            var account = identity.google(token.getSubject(), token.getEmail(), google.getFullName(),
                Boolean.TRUE.equals(token.getEmailVerified()), linkId);
            return new GoogleUser(account.id(), account.updatedAt(), token, google.getUserInfo());
        } catch (IdentityException ex) {
            throw new OAuth2AuthenticationException(new OAuth2Error(ex.code()), ex.getMessage());
        }
    }

    public static final class GoogleUser extends DefaultOidcUser implements AccountIdentity {
        private final UUID accountId;
        private final java.time.Instant accountVersion;

        public GoogleUser(UUID accountId, java.time.Instant accountVersion, OidcIdToken token, OidcUserInfo info) {
            super(List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER")), token, info);
            this.accountId = accountId;
            this.accountVersion = accountVersion;
        }

        @Override public UUID accountId() { return accountId; }
        @Override public java.time.Instant accountVersion() { return accountVersion; }
        @Override public String getName() { return accountId.toString(); }
    }
}
