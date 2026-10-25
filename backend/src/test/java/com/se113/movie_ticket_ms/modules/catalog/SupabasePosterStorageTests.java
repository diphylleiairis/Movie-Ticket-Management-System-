package com.se113.movie_ticket_ms.modules.catalog;

import com.se113.movie_ticket_ms.modules.catalog.application.MoviePosters;
import com.se113.movie_ticket_ms.modules.catalog.infrastructure.SupabasePosterStorage;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import static org.junit.jupiter.api.Assertions.*;

class SupabasePosterStorageTests {
    HttpServer server;
    String origin;
    final String object = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.png";
    final AtomicInteger calls = new AtomicInteger();
    final AtomicReference<String> apiKey = new AtomicReference<>(), auth = new AtomicReference<>(), type = new AtomicReference<>(), upsert = new AtomicReference<>();
    final AtomicReference<byte[]> content = new AtomicReference<>();
    int status = 200;
    String body;

    @BeforeEach void start() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        body = "{\"Key\":\"movie-posters/" + object + "\"}";
        server.createContext("/storage/v1/object/movie-posters/", exchange -> {
            calls.incrementAndGet(); apiKey.set(exchange.getRequestHeaders().getFirst("apikey"));
            auth.set(exchange.getRequestHeaders().getFirst("Authorization"));
            type.set(exchange.getRequestHeaders().getFirst("Content-Type")); upsert.set(exchange.getRequestHeaders().getFirst("x-upsert"));
            content.set(exchange.getRequestBody().readAllBytes());
            byte[] response = body.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(status, response.length); exchange.getResponseBody().write(response); exchange.close();
        });
        server.start(); origin = "http://127.0.0.1:" + server.getAddress().getPort();
    }
    @AfterEach void stop() { server.stop(0); }
    SupabasePosterStorage storage(String secret, String legacy) { return new SupabasePosterStorage(origin, secret, legacy, "movie-posters"); }

    @Test void secretKeyStaysInApiKeyHeaderAndUploadReturnsStablePublicUrl() {
        byte[] image = {1, 2, 3};
        assertEquals(origin + "/storage/v1/object/public/movie-posters/" + object, storage("sb_secret_test", "").put(object, image, "image/png"));
        assertEquals("sb_secret_test", apiKey.get()); assertNull(auth.get());
        assertEquals("image/png", type.get()); assertEquals("false", upsert.get()); assertArrayEquals(image, content.get());
    }
    @Test void legacyServiceRoleKeyUsesCompatibleAuthentication() {
        storage("", "legacy-key").put(object, new byte[] {1}, "image/png");
        assertEquals("legacy-key", apiKey.get()); assertEquals("Bearer legacy-key", auth.get());
    }
    @ParameterizedTest @ValueSource(ints = {400, 401, 403, 429, 500})
    void providerErrorsAreSanitizedAndNeverAutomaticallyRetried(int providerStatus) {
        status = providerStatus; body = "{\"message\":\"private-provider-details\"}";
        var error = assertThrows(MoviePosters.StorageUnavailable.class, () -> storage("sb_secret_test", "").put(object, new byte[] {1}, "image/png"));
        assertFalse(error.getMessage().contains("private-provider")); assertNull(error.getCause()); assertEquals(1, calls.get());
    }
    @ParameterizedTest @ValueSource(strings = {"{}", "null", "{\"Key\":\"other/object.png\"}", "invalid-json"})
    void malformedSuccessDoesNotInventAnUploadedPoster(String response) {
        body = response;
        assertThrows(MoviePosters.StorageUnavailable.class, () -> storage("sb_secret_test", "").put(object, new byte[] {1}, "image/png"));
    }
    @Test void missingConfigurationAndUntrustedPathsNeverContactStorage() {
        assertThrows(MoviePosters.StorageUnavailable.class, () -> storage("", "").put(object, new byte[] {1}, "image/png"));
        assertThrows(MoviePosters.StorageUnavailable.class, () -> storage("sb_secret_test", "").put("../../other/file.png", new byte[] {1}, "image/png"));
        assertEquals(0, calls.get());
    }
}
