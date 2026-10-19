package com.se113.movie_ticket_ms.modules.identity.infrastructure;

import org.springframework.web.util.UriComponentsBuilder;

final class PasswordResetEmail {
    private PasswordResetEmail() {}

    static String text(String frontend, String token) {
        // Fragments reach the browser without putting the secret in HTTP request URLs.
        String link = UriComponentsBuilder.fromUriString(frontend.replaceAll("/$", ""))
            .path("/reset-password").fragment("token={token}")
            .encode().buildAndExpand(token).toUriString();
        return "Open this link to reset your password:\n" + link
            + "\n\nThis link expires in 30 minutes and can be used once. Ignore this email if you did not request a reset.";
    }
}
