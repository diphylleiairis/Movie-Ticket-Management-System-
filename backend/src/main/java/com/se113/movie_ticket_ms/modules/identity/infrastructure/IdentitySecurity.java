package com.se113.movie_ticket_ms.modules.identity.infrastructure;

import com.se113.movie_ticket_ms.modules.identity.application.IdentityService;
import com.se113.movie_ticket_ms.modules.identity.infrastructure.GoogleAuthorizationRequests;
import com.se113.movie_ticket_ms.modules.identity.infrastructure.GoogleOidcUserService;
import java.net.URI;
import java.util.Set;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;

@Configuration
@EnableMethodSecurity
public class IdentitySecurity {
    @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }
    @Bean SecurityContextRepository securityContextRepository() { return new HttpSessionSecurityContextRepository(); }
    @Bean HttpSessionCsrfTokenRepository csrfTokenRepository() { return new HttpSessionCsrfTokenRepository(); }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, SecurityContextRepository contexts,
            HttpSessionCsrfTokenRepository csrf, IdentityService identity, GoogleOidcUserService google,
            ObjectProvider<ClientRegistrationRepository> clients,
            @Value("${identity.frontend-url:http://localhost:5173}") String frontend) throws Exception {
        var origin = URI.create(frontend);
        if (origin.getHost() == null || origin.getUserInfo() != null || origin.getQuery() != null
                || origin.getFragment() != null || !(origin.getPath().isEmpty() || "/".equals(origin.getPath()))
                || !("https".equals(origin.getScheme()) || ("http".equals(origin.getScheme())
                    && Set.of("localhost", "127.0.0.1").contains(origin.getHost()))))
            throw new IllegalArgumentException("identity.frontend-url must be an HTTPS origin (HTTP localhost is allowed).");
        String publicOrigin = frontend.replaceAll("/$", "");
        http.securityContext(config -> config.securityContextRepository(contexts))
            .addFilterAfter(new ActiveAccountFilter(identity), org.springframework.security.web.context.SecurityContextHolderFilter.class)
            .csrf(config -> config.csrfTokenRepository(csrf))
            .requestCache(cache -> cache.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/health", "/login", "/error", "/oauth2/authorization/google", "/login/oauth2/code/google").permitAll()
                .requestMatchers("/api/v1/identity/csrf", "/api/v1/identity/register", "/api/v1/identity/login",
                    "/api/v1/identity/email-verification/**", "/api/v1/identity/password-reset", "/api/v1/identity/password-reset/confirm").permitAll()
                .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/v1/ticket-validation/**").hasRole("CINEMA_STAFF")
                .anyRequest().authenticated())
            .exceptionHandling(errors -> errors
                .authenticationEntryPoint((request, response, ex) -> {
                    response.setStatus(401);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"code\":\"UNAUTHENTICATED\",\"message\":\"Sign in to continue.\"}");
                })
                .accessDeniedHandler((request, response, ex) -> {
                    response.setStatus(403);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"code\":\"ACCESS_DENIED\",\"message\":\"This request is not allowed.\"}");
                }))
            .logout(logout -> logout.logoutUrl("/api/v1/identity/logout")
                .invalidateHttpSession(true).deleteCookies("JSESSIONID")
                .logoutSuccessHandler((request, response, auth) -> {
                    response.setContentType("application/json");
                    response.getWriter().write("{\"status\":\"SIGNED_OUT\"}");
                }));
        var registrations = clients.getIfAvailable();
        if (registrations != null) {
            var requests = new GoogleAuthorizationRequests(registrations, identity);
            http.addFilterBefore(new org.springframework.web.filter.OncePerRequestFilter() {
                @Override
                protected void doFilterInternal(jakarta.servlet.http.HttpServletRequest request,
                        jakarta.servlet.http.HttpServletResponse response, jakarta.servlet.FilterChain chain)
                        throws java.io.IOException, jakarta.servlet.ServletException {
                    if ((request.getContextPath() + "/oauth2/authorization/google").equals(request.getRequestURI()) && "link".equals(request.getParameter("intent"))) {
                        var authentication = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
                        if (authentication == null || !(authentication.getPrincipal() instanceof com.se113.movie_ticket_ms.modules.identity.application.AccountIdentity)) {
                            response.sendRedirect(publicOrigin + "/login?oauthError=LINK_REQUIRES_LOGIN");
                            return;
                        }
                        if (authentication.getAuthorities().stream().noneMatch(a -> "ROLE_CUSTOMER".equals(a.getAuthority()))) {
                            response.sendRedirect(publicOrigin + "/login?oauthError=LINK_REQUIRES_CUSTOMER");
                            return;
                        }
                    }
                    chain.doFilter(request, response);
                }
            }, org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestRedirectFilter.class);
            http.oauth2Login(oauth -> oauth
                .authorizationEndpoint(endpoint -> endpoint.authorizationRequestResolver(requests).authorizationRequestRepository(requests))
                .userInfoEndpoint(info -> info.oidcUserService(google))
                .successHandler((request, response, auth) -> {
                    String path = GoogleAuthorizationRequests.safeReturnTo((String) request.getAttribute(GoogleAuthorizationRequests.RETURN_TO));
                    response.sendRedirect(publicOrigin + path);
                })
                .failureHandler((request, response, ex) -> {
                    String code = ex instanceof org.springframework.security.oauth2.core.OAuth2AuthenticationException oauthError
                        ? oauthError.getError().getErrorCode() : "GOOGLE_LOGIN_FAILED";
                    var allowed = Set.of("ACCOUNT_LINK_REQUIRED", "GOOGLE_EMAIL_NOT_VERIFIED", "ACCOUNT_UNAVAILABLE",
                        "GOOGLE_EMAIL_MISMATCH", "GOOGLE_ALREADY_LINKED", "LINK_REQUIRES_LOGIN", "LINK_REQUIRES_CUSTOMER");
                    response.sendRedirect(publicOrigin + "/login?oauthError=" + (allowed.contains(code) ? code : "GOOGLE_LOGIN_FAILED"));
                }));
        }
        return http.build();
    }
}
