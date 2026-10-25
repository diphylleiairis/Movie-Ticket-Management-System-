package com.se113.movie_ticket_ms.modules.identity.infrastructure;

import com.se113.movie_ticket_ms.modules.identity.application.IdentityMail;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
@ConditionalOnProperty(name = "identity.mail-provider", havingValue = "resend", matchIfMissing = true)
public class ResendIdentityMail implements IdentityMail {
    private final RestClient client;
    private final String apiKey;
    private final String from;
    private final String frontend;

    public ResendIdentityMail(@Value("${identity.resend-api-key:}") String apiKey,
            @Value("${identity.mail-from:}") String from,
            @Value("${identity.resend-api-url:https://api.resend.com}") String baseUrl,
            @Value("${identity.frontend-url:http://localhost:5173}") String frontend) {
        var factory = new JdkClientHttpRequestFactory(HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(3)).build());
        factory.setReadTimeout(Duration.ofSeconds(8));
        this.client = RestClient.builder().baseUrl(baseUrl).requestFactory(factory).build();
        this.apiKey = apiKey;
        this.from = from;
        this.frontend = frontend;
    }

    @Override
    public void verification(String email, String code) {
        send(email, "Verify your movie ticket account",
            Map.of("text", "Your verification code is " + code + ". It expires in 10 minutes."));
    }

    @Override
    public void passwordReset(String email, String token, String fullName) {
        send(email, "Reset your movie ticket password",
            Map.of("template", Map.of("id", "password-reset", "variables", Map.of(
                "RESET_URL", PasswordResetEmail.url(frontend, token), "USER_NAME", fullName))));
    }

    private void send(String email, String subject, Map<String, Object> content) {
        if (apiKey.isBlank() || from.isBlank()) throw new DeliveryUnavailable();
        var payload = new HashMap<String, Object>(content);
        payload.put("from", from);
        payload.put("to", List.of(email));
        payload.put("subject", subject);
        try {
            var response = client.post().uri("/emails")
                .headers(headers -> headers.setBearerAuth(apiKey))
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .retrieve().body(SentEmail.class);
            if (response == null || response.id() == null || response.id().isBlank()) throw new DeliveryUnavailable();
        } catch (RestClientException ex) {
            // Provider responses can contain private data; expose only a stable application error.
            throw new DeliveryUnavailable();
        }
    }

    private record SentEmail(String id) {}
}
