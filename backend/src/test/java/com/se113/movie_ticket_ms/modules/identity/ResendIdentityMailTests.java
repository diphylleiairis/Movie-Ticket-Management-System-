package com.se113.movie_ticket_ms.modules.identity;

import com.se113.movie_ticket_ms.modules.identity.application.IdentityMail;
import com.se113.movie_ticket_ms.modules.identity.infrastructure.ResendIdentityMail;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import com.se113.movie_ticket_ms.modules.identity.infrastructure.SmtpIdentityMail;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import static org.junit.jupiter.api.Assertions.*;

class ResendIdentityMailTests {
    private HttpServer server;
    private String baseUrl;
    private final AtomicInteger requests = new AtomicInteger();
    private final AtomicReference<String> authorization = new AtomicReference<>();
    private final AtomicReference<String> contentType = new AtomicReference<>();
    private final AtomicReference<JsonNode> message = new AtomicReference<>();
    private int status = 200;
    private String response = "{\"id\":\"email-test-id\"}";

    @BeforeEach
    void startProvider() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/emails", exchange -> {
            requests.incrementAndGet();
            authorization.set(exchange.getRequestHeaders().getFirst("Authorization"));
            contentType.set(exchange.getRequestHeaders().getFirst("Content-Type"));
            message.set(JsonMapper.builder().build().readTree(exchange.getRequestBody()));
            byte[] body = response.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(status, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.start();
        baseUrl = "http://127.0.0.1:" + server.getAddress().getPort();
    }

    @AfterEach
    void stopProvider() { server.stop(0); }

    private ResendIdentityMail mail() {
        return new ResendIdentityMail("test-key", "Cinema <noreply@example.test>", baseUrl, "https://cinema.example.test/");
    }

    @Test
    void verificationUsesServerCredentialsAndPreservesLeadingZeroes() {
        mail().verification("customer@example.test", "012345");
        assertEquals(1, requests.get());
        assertEquals("Bearer test-key", authorization.get());
        assertEquals("application/json", contentType.get());
        assertEquals("Cinema <noreply@example.test>", message.get().get("from").asText());
        assertEquals("customer@example.test", message.get().get("to").get(0).asText());
        assertTrue(message.get().get("text").asText().contains("012345"));
        assertTrue(message.get().get("text").asText().contains("10 minutes"));
    }

    @Test
    void passwordResetUsesPublishedTemplateWithCustomerNameAndResetUrl() {
        mail().passwordReset("customer@example.test", "opaque-reset-token", "Nguyễn An");
        assertEquals(1, requests.get());
        assertEquals("Bearer test-key", authorization.get());
        assertEquals("customer@example.test", message.get().get("to").get(0).asText());
        assertTrue(message.get().get("subject").asText().contains("Reset"));
        var template = message.get().get("template");
        assertEquals("password-reset", template.get("id").asText());
        var variables = template.get("variables");
        assertEquals("https://cinema.example.test/reset-password#token=opaque-reset-token", variables.get("RESET_URL").asText());
        assertEquals("Nguyễn An", variables.get("USER_NAME").asText());
        assertFalse(message.get().has("text"));
        assertFalse(message.get().has("html"));
        assertFalse(message.get().has("react"));
    }

    @Test
    void rejectedTemplateIsDeliveryUnavailableWithoutRetrying() {
        status = 422;
        response = "{\"message\":\"private-template-details\"}";
        var error = assertThrows(IdentityMail.DeliveryUnavailable.class,
            () -> mail().passwordReset("customer@example.test", "opaque-reset-token", "Customer"));
        assertFalse(error.getMessage().contains("private-template-details"));
        assertNull(error.getCause());
        assertEquals(1, requests.get());
    }

    @ParameterizedTest
    @ValueSource(ints = {401, 403, 422, 429, 500})
    void providerFailureIsSanitizedWithoutRetrying(int providerStatus) {
        status = providerStatus;
        response = "{\"message\":\"private-provider-details\"}";
        var error = assertThrows(IdentityMail.DeliveryUnavailable.class,
            () -> mail().verification("customer@example.test", "012345"));
        assertFalse(error.getMessage().contains("private-provider-details"));
        assertNull(error.getCause());
        assertEquals(1, requests.get());
    }

    @ParameterizedTest
    @ValueSource(strings = {"{}", "{\"id\":\"\"}", "null", "not-json"})
    void invalidSuccessResponseDoesNotReportDelivery(String body) {
        response = body;
        assertThrows(IdentityMail.DeliveryUnavailable.class,
            () -> mail().verification("customer@example.test", "012345"));
    }

    @Test
    void missingCredentialsOrSenderDoesNotContactProvider() {
        for (var config : new String[][] {{"", "cinema@example.test"}, {"test-key", ""}}) {
            var mail = new ResendIdentityMail(config[0], config[1], baseUrl, "http://localhost:5173");
            assertThrows(IdentityMail.DeliveryUnavailable.class,
                () -> mail.verification("customer@example.test", "012345"));
        }
        assertEquals(0, requests.get());
    }

    @Test
    void connectionFailureIsDeliveryUnavailable() {
        server.stop(0);
        assertThrows(IdentityMail.DeliveryUnavailable.class,
            () -> mail().verification("customer@example.test", "012345"));
    }

    @Test
    void configurationSelectsExactlyOneMailAdapter() {
        var context = new ApplicationContextRunner().withUserConfiguration(ResendIdentityMail.class, SmtpIdentityMail.class);
        context.run(application -> assertInstanceOf(ResendIdentityMail.class, application.getBean(IdentityMail.class)));
        context.withPropertyValues("identity.mail-provider=smtp")
            .run(application -> assertInstanceOf(SmtpIdentityMail.class, application.getBean(IdentityMail.class)));
    }
}
