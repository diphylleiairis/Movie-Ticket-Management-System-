package com.se113.movie_ticket_ms.modules.identity;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.se113.movie_ticket_ms.modules.identity.application.IdentityMail;
import com.se113.movie_ticket_ms.modules.identity.application.IdentityService;
import com.se113.movie_ticket_ms.modules.identity.infrastructure.GoogleAuthorizationRequests;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.Callable;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@EnabledIfEnvironmentVariable(named = "TEST_DB_URL", matches = "jdbc:postgresql://127\\.0\\.0\\.1:15432/identity_tests.*")
class IdentityIntegrationTests {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired IdentityService identity;
    @MockitoBean IdentityMail mail;
    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final RSAKey KEY;
    private static final RSAKey WRONG_KEY;
    private static final HttpServer GOOGLE;
    private static String subject;
    private static String email;
    private static boolean verified;
    private static boolean includeVerification;
    private static String nonce;
    private static String audience;
    private static String issuer;
    private static boolean wrongSignature;
    private static String sentCode;
    private static String sentReset;

    static {
        try {
            KEY = new RSAKeyGenerator(2048).keyID("test-key").generate();
            WRONG_KEY = new RSAKeyGenerator(2048).keyID("test-key").generate();
            GOOGLE = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            GOOGLE.createContext("/jwks", exchange -> {
                byte[] body = new JWKSet(KEY.toPublicJWK()).toString().getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, body.length);
                exchange.getResponseBody().write(body); exchange.close();
            });
            GOOGLE.createContext("/token", exchange -> {
                try {
                    var claims = new JWTClaimsSet.Builder().issuer(issuer).subject(subject).audience(audience)
                        .issueTime(new Date()).expirationTime(Date.from(Instant.now().plusSeconds(300)))
                        .claim("email", email).claim("email_verified", includeVerification ? verified : null).claim("name", "Google Customer")
                        .claim("nonce", nonce).build();
                    var jwt = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256).keyID("test-key").build(), claims);
                    jwt.sign(new RSASSASigner(wrongSignature ? WRONG_KEY : KEY));
                    byte[] body = JSON.writeValueAsBytes(Map.of("access_token", "test-access-token", "token_type", "Bearer",
                        "expires_in", 300, "scope", "openid profile email", "id_token", jwt.serialize()));
                    exchange.getResponseHeaders().set("Content-Type", "application/json");
                    exchange.sendResponseHeaders(200, body.length);
                    exchange.getResponseBody().write(body);
                } catch (Exception ex) { throw new RuntimeException(ex); }
                finally { exchange.close(); }
            });
            GOOGLE.createContext("/userinfo", exchange -> {
                byte[] body = JSON.writeValueAsBytes(Map.of("sub", subject, "email", email, "email_verified", true, "name", "Google Customer"));
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, body.length);
                exchange.getResponseBody().write(body); exchange.close();
            });
            GOOGLE.start();
        } catch (Exception ex) { throw new ExceptionInInitializerError(ex); }
    }

    @DynamicPropertySource
    static void googleProperties(DynamicPropertyRegistry registry) {
        String provider = "http://127.0.0.1:" + GOOGLE.getAddress().getPort();
        registry.add("spring.security.oauth2.client.registration.google.client-id", () -> "test-client");
        registry.add("spring.security.oauth2.client.registration.google.client-secret", () -> "test-secret");
        registry.add("spring.security.oauth2.client.registration.google.scope", () -> "openid,profile,email");
        registry.add("spring.security.oauth2.client.registration.google.redirect-uri", () -> "http://localhost/login/oauth2/code/google");
        registry.add("spring.security.oauth2.client.provider.google.authorization-uri", () -> provider + "/auth");
        registry.add("spring.security.oauth2.client.provider.google.token-uri", () -> provider + "/token");
        registry.add("spring.security.oauth2.client.provider.google.jwk-set-uri", () -> provider + "/jwks");
        registry.add("spring.security.oauth2.client.provider.google.user-info-uri", () -> provider + "/userinfo");
        registry.add("identity.frontend-url", () -> "http://localhost:5173");
    }

    @BeforeAll
    static void schema(@Autowired JdbcTemplate jdbc) throws Exception {
        // The class is opt-in and can only mutate this dedicated loopback test database.
        assertEquals("identity_tests", jdbc.queryForObject("select current_database()", String.class));
        if (Boolean.FALSE.equals(jdbc.queryForObject("select exists(select 1 from pg_namespace where nspname='movie_app')", Boolean.class))) {
            String sql = new ClassPathResource("db/migration/V1__movie_ticket_schema.sql").getContentAsString(StandardCharsets.UTF_8);
            jdbc.execute(sql);
        }
    }

    @BeforeEach
    void freshIdentity() {
        jdbc.execute("truncate movie_app.users cascade");
        subject = UUID.randomUUID().toString(); email = UUID.randomUUID() + "@example.com";
        verified = true; includeVerification = true; audience = "test-client"; issuer = "https://accounts.google.com"; wrongSignature = false;
        reset(mail);
        doAnswer(call -> { sentCode = call.getArgument(1); return null; }).when(mail).verification(anyString(), anyString());
        doAnswer(call -> { sentReset = call.getArgument(1); return null; }).when(mail).passwordReset(anyString(), anyString());
    }

    @AfterAll static void stopGoogle() { GOOGLE.stop(0); }

    private JsonNode body(MvcResult result) throws Exception { return JSON.readTree(result.getResponse().getContentAsString()); }

    private record Csrf(MockHttpSession session, String value) {}
    private Csrf csrf(MockHttpSession session) throws Exception {
        var request = get("/api/v1/identity/csrf");
        if (session != null) request.session(session);
        var result = mvc.perform(request).andExpect(status().isOk()).andReturn();
        return new Csrf((MockHttpSession) result.getRequest().getSession(), body(result).get("token").asText());
    }

    private MvcResult postJson(String path, Object payload, MockHttpSession session) throws Exception {
        var csrf = csrf(session);
        return mvc.perform(post("/api/v1/identity/" + path).session(csrf.session())
            .header("X-CSRF-TOKEN", csrf.value()).contentType("application/json").content(JSON.writeValueAsString(payload))).andReturn();
    }

    private UUID register() { return identity.register("Customer", email, "Password123"); }
    private MockHttpSession passwordSession() throws Exception {
        var id = register(); identity.verify(id, sentCode);
        var login = postJson("login", Map.of("email", email, "password", "Password123", "rememberMe", true), null);
        assertEquals(200, login.getResponse().getStatus());
        return (MockHttpSession) login.getRequest().getSession();
    }

    private MvcResult startGoogle(MockHttpSession session, String intent, String returnTo) throws Exception {
        var request = get("/oauth2/authorization/google").param("intent", intent).param("returnTo", returnTo);
        if (session != null) request.session(session);
        return mvc.perform(request).andExpect(status().is3xxRedirection()).andReturn();
    }

    private Map<String, String> query(String url) {
        return Stream.of(URI.create(url).getRawQuery().split("&")).map(pair -> pair.split("=", 2)).collect(Collectors.toMap(
            pair -> URLDecoder.decode(pair[0], StandardCharsets.UTF_8), pair -> URLDecoder.decode(pair[1], StandardCharsets.UTF_8)));
    }

    private MvcResult callback(MvcResult start) throws Exception {
        var params = query(start.getResponse().getRedirectedUrl()); nonce = params.get("nonce");
        return mvc.perform(get("/login/oauth2/code/google").session((MockHttpSession) start.getRequest().getSession())
            .param("code", "test-code").param("state", params.get("state"))).andReturn();
    }

    @Test void emailRegistrationRequiresCodeThenLoginPersistsAndLogoutEndsSession() throws Exception {
        var result = postJson("register", Map.of("fullName", "Customer", "email", email, "password", "Password123", "acceptedTerms", true), null);
        assertEquals(200, result.getResponse().getStatus());
        String challenge = body(result).get("challengeId").asText();
        assertTrue(sentCode.matches("[0-9]{6}"));
        assertEquals("PENDING_VERIFICATION", jdbc.queryForObject("select status from movie_app.users", String.class));
        assertFalse(jdbc.queryForObject("select password_hash from movie_app.users", String.class).contains("Password123"));
        var login = postJson("login", Map.of("email", email, "password", "Password123"), null);
        assertEquals("EMAIL_NOT_VERIFIED", body(login).get("code").asText());
        assertEquals(200, postJson("email-verification/confirm", Map.of("challengeId", challenge, "code", sentCode), null).getResponse().getStatus());
        login = postJson("login", Map.of("email", email, "password", "Password123", "rememberMe", true), null);
        assertEquals(200, login.getResponse().getStatus());
        assertTrue(login.getResponse().getHeaders("Set-Cookie").stream().anyMatch(c -> c.contains("HttpOnly") && c.contains("Max-Age=604800")));
        var session = (MockHttpSession) login.getRequest().getSession();
        mvc.perform(get("/api/v1/identity/me").session(session)).andExpect(status().isOk())
            .andExpect(jsonPath("$.user.role").value("CUSTOMER")).andExpect(jsonPath("$.user.passwordHash").doesNotExist());
        assertEquals(200, postJson("logout", Map.of(), session).getResponse().getStatus());
        mvc.perform(get("/api/v1/identity/me")).andExpect(status().isUnauthorized());
    }

    @Test void csrfMissingAndInvalidInputAreRejected() throws Exception {
        mvc.perform(post("/api/v1/identity/register").contentType("application/json").content("{}"))
            .andExpect(status().isForbidden());
        assertEquals(400, postJson("register", Map.of("fullName", "Customer", "email", email, "password", "Password123", "acceptedTerms", false), null).getResponse().getStatus());
        assertEquals(0, jdbc.queryForObject("select count(*) from movie_app.users", Integer.class));
    }

    @Test void duplicateEmailAndInvalidLoginAreRejected() throws Exception {
        register();
        assertThrows(com.se113.movie_ticket_ms.modules.identity.application.IdentityException.class, () -> register());
        var result = postJson("login", Map.of("email", email, "password", "WrongPassword1"), null);
        assertEquals(401, result.getResponse().getStatus());
    }

    @Test void codeFailuresCommitAndLockOutAndExpiredCodesDoNotActivate() {
        UUID challenge = register();
        String wrong = "000000".equals(sentCode) ? "111111" : "000000";
        for (int i = 0; i < 5; i++) assertThrows(RuntimeException.class, () -> identity.verify(challenge, wrong));
        assertEquals(5, jdbc.queryForObject("select failed_attempts from movie_app.email_verifications", Integer.class));
        assertThrows(RuntimeException.class, () -> identity.verify(challenge, sentCode));
        assertEquals("PENDING_VERIFICATION", jdbc.queryForObject("select status from movie_app.users", String.class));
        jdbc.update("update movie_app.email_verifications set created_at=now()-interval '20 minutes', expires_at=now()-interval '10 minutes'");
        assertThrows(RuntimeException.class, () -> identity.verify(challenge, sentCode));
    }

    @Test void resendSupersedesOldChallengeAndCode() {
        UUID old = register(); String oldCode = sentCode;
        assertThrows(RuntimeException.class, () -> identity.resend(old));
        jdbc.update("update movie_app.email_verifications set created_at=now()-interval '2 minutes'");
        UUID next = identity.resend(old);
        assertNotEquals(old, next);
        assertThrows(RuntimeException.class, () -> identity.verify(old, oldCode));
        identity.verify(next, sentCode);
        assertEquals("ACTIVE", jdbc.queryForObject("select status from movie_app.users", String.class));
    }

    @Test void verifiedGoogleCreatesActiveCustomerWithoutCodeAndRestoresSession() throws Exception {
        var callback = callback(startGoogle(null, "register", "/movie-list"));
        assertEquals("http://localhost:5173/movie-list", callback.getResponse().getRedirectedUrl());
        var session = (MockHttpSession) callback.getRequest().getSession();
        var me = mvc.perform(get("/api/v1/identity/me").session(session)).andExpect(status().isOk()).andReturn();
        assertEquals("CUSTOMER", body(me).get("user").get("role").asText());
        assertEquals("ACTIVE", jdbc.queryForObject("select status from movie_app.users", String.class));
        assertEquals(0, jdbc.queryForObject("select count(*) from movie_app.email_verifications", Integer.class));
        verifyNoInteractions(mail);
        String id = body(me).get("user").get("id").asText();
        email = "changed-at-google@example.com";
        callback = callback(startGoogle(null, "login", "/"));
        me = mvc.perform(get("/api/v1/identity/me").session((MockHttpSession) callback.getRequest().getSession())).andExpect(status().isOk()).andReturn();
        assertEquals(id, body(me).get("user").get("id").asText());
        assertNotEquals(email, body(me).get("user").get("email").asText());
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void unverifiedGoogleClaimCannotBeOverriddenByUserInfo(boolean present) throws Exception {
        verified = false;
        includeVerification = present;
        var result = callback(startGoogle(null, "login", "/"));
        assertTrue(result.getResponse().getRedirectedUrl().contains("GOOGLE_EMAIL_NOT_VERIFIED"));
        assertEquals(0, jdbc.queryForObject("select count(*) from movie_app.users", Integer.class));
    }

    @Test void emailCollisionRequiresExplicitAuthenticatedLinkAndPreservesIdentity() throws Exception {
        var session = passwordSession();
        UUID id = jdbc.queryForObject("select id from movie_app.users", UUID.class);
        var collision = callback(startGoogle(null, "login", "/"));
        assertTrue(collision.getResponse().getRedirectedUrl().contains("ACCOUNT_LINK_REQUIRED"));
        assertEquals(0, jdbc.queryForObject("select count(*) from movie_app.user_identities", Integer.class));
        var linked = callback(startGoogle(session, "link", "/movie-list"));
        assertEquals("http://localhost:5173/movie-list", linked.getResponse().getRedirectedUrl());
        assertEquals(id, jdbc.queryForObject("select user_id from movie_app.user_identities", UUID.class));
        assertEquals(1, jdbc.queryForObject("select count(*) from movie_app.users", Integer.class));
    }

    @Test void differentEmailCannotLinkAndTamperedCallbackCannotSupplyLinkIntent() throws Exception {
        var session = passwordSession();
        email = "another@example.com";
        var mismatch = callback(startGoogle(session, "link", "/"));
        assertTrue(mismatch.getResponse().getRedirectedUrl().contains("GOOGLE_EMAIL_MISMATCH"));
        assertEquals(0, jdbc.queryForObject("select count(*) from movie_app.user_identities", Integer.class));
        mvc.perform(get("/oauth2/authorization/google").param("intent", "link"))
            .andExpect(status().is3xxRedirection());
    }

    @Test void invalidStateRejectsCallbackAndExternalReturnPathFallsBackHome() throws Exception {
        var start = startGoogle(null, "login", "//evil.example/path");
        mvc.perform(get("/login/oauth2/code/google").session((MockHttpSession) start.getRequest().getSession())
            .param("code", "test-code").param("state", "tampered"))
            .andExpect(status().is3xxRedirection()).andExpect(redirectedUrl("http://localhost:5173/login?oauthError=GOOGLE_LOGIN_FAILED"));
        assertEquals(0, jdbc.queryForObject("select count(*) from movie_app.users", Integer.class));
        var success = callback(startGoogle(null, "login", "https://evil.example"));
        assertEquals("http://localhost:5173/", success.getResponse().getRedirectedUrl());
    }

    @ParameterizedTest
    @ValueSource(strings = {"audience", "issuer", "signature", "nonce"})
    void invalidIdTokensNeverProvisionCustomer(String invalid) throws Exception {
        var start = startGoogle(null, "login", "/");
        var params = query(start.getResponse().getRedirectedUrl());
        nonce = "nonce".equals(invalid) ? "wrong-nonce" : params.get("nonce");
        if ("audience".equals(invalid)) audience = "wrong-client";
        if ("issuer".equals(invalid)) issuer = "https://evil.example";
        if ("signature".equals(invalid)) wrongSignature = true;
        mvc.perform(get("/login/oauth2/code/google").session((MockHttpSession) start.getRequest().getSession())
            .param("code", "test-code").param("state", params.get("state")))
            .andExpect(status().is3xxRedirection()).andExpect(redirectedUrl("http://localhost:5173/login?oauthError=GOOGLE_LOGIN_FAILED"));
        assertEquals(0, jdbc.queryForObject("select count(*) from movie_app.users", Integer.class));
    }

    @Test void concurrentGoogleCallbacksCreateOneCustomerAndOneLink() throws Exception {
        try (var workers = Executors.newFixedThreadPool(2)) {
            Callable<UUID> login = () -> identity.google(subject, email, "Customer", true, null).id();
            var results = workers.invokeAll(java.util.List.of(login, login));
            assertEquals(results.get(0).get(), results.get(1).get());
        }
        assertEquals(1, jdbc.queryForObject("select count(*) from movie_app.users", Integer.class));
        assertEquals(1, jdbc.queryForObject("select count(*) from movie_app.user_identities", Integer.class));
    }

    @Test void customerCannotUseAdminOrStaffRoutesAndDisabledSessionExpires() throws Exception {
        var session = passwordSession();
        mvc.perform(get("/api/v1/admin/movies").session(session)).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/ticket-validation/check-in").session(session)
            .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf())).andExpect(status().isForbidden());
        jdbc.update("update movie_app.users set status='DISABLED'");
        mvc.perform(get("/api/v1/identity/me").session(session)).andExpect(status().isUnauthorized());
    }

    @Test void googleNeverGrantsProvisionedRolesOrReactivatesDisabledCustomers() {
        var customer = identity.google(subject, email, "Customer", true, null);
        jdbc.update("update movie_app.users set status='DISABLED' where id=?", customer.id());
        assertThrows(RuntimeException.class, () -> identity.google(subject, email, "Customer", true, null));
        assertEquals("DISABLED", jdbc.queryForObject("select status from movie_app.users where id=?", String.class, customer.id()));
        jdbc.update("update movie_app.users set status='ACTIVE', role='ADMIN' where id=?", customer.id());
        assertThrows(RuntimeException.class, () -> identity.google(subject, email, "Customer", true, null));
        assertEquals("ADMIN", jdbc.queryForObject("select role from movie_app.users where id=?", String.class, customer.id()));
    }

    @Test void provisionedStaffPasswordLoginRetainsRoleAndCannotManageAdmin() throws Exception {
        var session = passwordSession();
        jdbc.update("update movie_app.users set role='CINEMA_STAFF'");
        var login = postJson("login", Map.of("email", email, "password", "Password123"), null);
        assertEquals("CINEMA_STAFF", body(login).get("user").get("role").asText());
        mvc.perform(get("/api/v1/admin/movies").session((MockHttpSession) login.getRequest().getSession())).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/identity/me").session(session)).andExpect(status().isUnauthorized());
    }

    @Test void passwordResetIsOneTimeAndRevokesExistingSession() throws Exception {
        var session = passwordSession();
        identity.requestPasswordReset(email);
        String token = sentReset;
        identity.resetPassword(token, "ChangedPassword123");
        assertThrows(RuntimeException.class, () -> identity.resetPassword(token, "AnotherPassword123"));
        assertThrows(RuntimeException.class, () -> identity.authenticate(email, "Password123"));
        assertTrue(identity.authenticate(email, "ChangedPassword123").active());
        mvc.perform(get("/api/v1/identity/me").session(session)).andExpect(status().isUnauthorized());
    }

    @Test void mailFailureRollsBackRegistration() {
        doThrow(new IdentityMail.DeliveryUnavailable())
            .when(mail).verification(anyString(), anyString());
        assertThrows(RuntimeException.class, () -> register());
        assertEquals(0, jdbc.queryForObject("select count(*) from movie_app.users", Integer.class));
    }

    @Test void mailFailureReturnsServiceUnavailableWithoutCreatingAccount() throws Exception {
        doThrow(new IdentityMail.DeliveryUnavailable()).when(mail).verification(anyString(), anyString());
        var result = postJson("register", Map.of("fullName", "Customer", "email", email,
            "password", "Password123", "acceptedTerms", true), null);
        assertEquals(503, result.getResponse().getStatus());
        assertEquals("EMAIL_UNAVAILABLE", body(result).get("code").asText());
        assertEquals(0, jdbc.queryForObject("select count(*) from movie_app.users", Integer.class));
        assertEquals(0, jdbc.queryForObject("select count(*) from movie_app.email_verifications", Integer.class));
    }

    @Test void failedResendPreservesPreviousChallenge() {
        UUID original = register();
        String originalCode = sentCode;
        jdbc.update("update movie_app.email_verifications set created_at=now()-interval '2 minutes'");
        doThrow(new IdentityMail.DeliveryUnavailable()).when(mail).verification(anyString(), anyString());
        assertThrows(IdentityMail.DeliveryUnavailable.class, () -> identity.resend(original));
        assertEquals(1, jdbc.queryForObject("select count(*) from movie_app.email_verifications", Integer.class));
        identity.verify(original, originalCode);
        assertTrue(identity.authenticate(email, "Password123").active());
    }

    @ParameterizedTest
    @ValueSource(strings = {"//evil.example", "/\\evil.example", "/%2f%2fevil.example", "https://evil.example", "/api/v1/identity/me", "/oauth2/authorization/google"})
    void unsafeReturnPathsAreRejected(String path) { assertEquals("/", GoogleAuthorizationRequests.safeReturnTo(path)); }
}
