package com.se113.movie_ticket_ms.modules.identity.infrastructure;

import com.se113.movie_ticket_ms.modules.identity.application.AccountIdentity;
import com.se113.movie_ticket_ms.modules.identity.application.IdentityException;
import com.se113.movie_ticket_ms.modules.identity.application.IdentityService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

final class ActiveAccountFilter extends OncePerRequestFilter {
    private final IdentityService identity;
    ActiveAccountFilter(IdentityService identity) { this.identity = identity; }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof AccountIdentity principal) {
            boolean valid;
            try {
                var account = identity.current(principal.accountId());
                valid = account.updatedAt().equals(principal.accountVersion())
                    && authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_" + account.role()));
            } catch (IdentityException ex) { valid = false; }
            if (!valid) {
                SecurityContextHolder.clearContext();
                var session = request.getSession(false);
                if (session != null) session.invalidate();
                response.setStatus(401);
                response.setContentType("application/json");
                response.getWriter().write("{\"code\":\"SESSION_EXPIRED\",\"message\":\"Sign in again.\"}");
                return;
            }
        }
        chain.doFilter(request, response);
    }
}
