package com.se113.movie_ticket_ms.modules.identity.infrastructure;

import org.springframework.web.util.UriComponentsBuilder;

final class PasswordResetEmail {
    private PasswordResetEmail() {}

    static String url(String frontend, String token) {
        // Fragments reach the browser without putting the secret in HTTP request URLs.
        return UriComponentsBuilder.fromUriString(frontend.replaceAll("/$", ""))
            .path("/reset-password").fragment("token={token}")
            .encode().buildAndExpand(token).toUriString();
    }

    static String text(String frontend, String token) {
        return "Open this link to reset your password:\n" + url(frontend, token)
            + "\n\nThis link expires in 30 minutes and can be used once. Ignore this email if you did not request a reset.";
    }
}
