package com.se113.movie_ticket_ms.modules.identity;

import com.se113.movie_ticket_ms.modules.identity.application.IdentityException;
import com.se113.movie_ticket_ms.modules.identity.application.IdentityMail;
import com.se113.movie_ticket_ms.modules.identity.application.IdentityService;
import com.se113.movie_ticket_ms.modules.identity.domain.Account;
import com.se113.movie_ticket_ms.modules.identity.infrastructure.IdentityRepository;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.security.crypto.password.PasswordEncoder;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class IdentityPasswordResetTests {
    private final IdentityRepository accounts = mock(IdentityRepository.class);
    private final IdentityMail mail = mock(IdentityMail.class);
    private final PasswordEncoder passwords = mock(PasswordEncoder.class);
    private IdentityService identity;
    private static final String EMAIL = "customer@example.com";

    @BeforeEach
    void setup() {
        identity = new IdentityService(accounts, passwords, mail);
    }

    @Test
    void missingAccountReportsNotFoundWithoutIssuingReset() {
        when(accounts.byEmail(EMAIL)).thenReturn(Optional.empty());

        var error = assertThrows(IdentityException.class, () -> identity.requestPasswordReset(EMAIL));

        assertEquals(404, error.status());
        assertEquals("ACCOUNT_NOT_FOUND", error.code());
        assertEquals("This account does not exist.", error.getMessage());
        verifyNoReset();
    }

    @ParameterizedTest
    @ValueSource(strings = {"PENDING_VERIFICATION", "DISABLED", "SUSPENSE"})
    void inactiveAccountMustContactAdministrator(String status) {
        when(accounts.byEmail(EMAIL)).thenReturn(Optional.of(account(status)));

        var error = assertThrows(IdentityException.class, () -> identity.requestPasswordReset(EMAIL));

        assertEquals(403, error.status());
        assertEquals("ACCOUNT_UNAVAILABLE", error.code());
        assertEquals("This account is not active. Please contact an administrator.", error.getMessage());
        verifyNoReset();
    }

    @Test
    void activeVerifiedCustomerWithoutPasswordStillReceivesReset() {
        var account = account("ACTIVE");
        when(accounts.byEmail(EMAIL)).thenReturn(Optional.of(account));
        when(accounts.now()).thenReturn(Instant.EPOCH);

        identity.requestPasswordReset("  CUSTOMER@example.com  ");

        verify(accounts).resetToken(eq(account.id()), eq(EMAIL), anyString(), eq(Instant.EPOCH));
        verify(mail).passwordReset(eq(EMAIL), anyString(), eq(account.fullName()));
    }

    @Test
    void activeVerifiedAdminResetReachesMailProvider() {
        var account = new Account(UUID.randomUUID(), EMAIL, "existing-hash", "Admin", "ADMIN", "ACTIVE",
            Instant.EPOCH, Instant.EPOCH);
        when(accounts.byEmail(EMAIL)).thenReturn(Optional.of(account));
        when(accounts.now()).thenReturn(Instant.EPOCH);

        identity.requestPasswordReset(EMAIL);

        verify(accounts).resetToken(eq(account.id()), eq(EMAIL), anyString(), eq(Instant.EPOCH));
        verify(mail).passwordReset(eq(EMAIL), anyString(), eq(account.fullName()));
    }

    @ParameterizedTest
    @ValueSource(strings = {"CINEMA_STAFF", "UNKNOWN"})
    void unsupportedRolesDoNotReceiveResetEmail(String role) {
        when(accounts.byEmail(EMAIL)).thenReturn(Optional.of(new Account(UUID.randomUUID(), EMAIL, "hash",
            "Account", role, "ACTIVE", Instant.EPOCH, Instant.EPOCH)));
        identity.requestPasswordReset(EMAIL);
        verifyNoReset();
    }

    @Test
    void unverifiedAdminDoesNotReceiveResetEmail() {
        when(accounts.byEmail(EMAIL)).thenReturn(Optional.of(new Account(UUID.randomUUID(), EMAIL, "hash",
            "Admin", "ADMIN", "ACTIVE", null, Instant.EPOCH)));
        identity.requestPasswordReset(EMAIL);
        verifyNoReset();
    }

    @ParameterizedTest
    @ValueSource(strings = {"CUSTOMER", "ADMIN"})
    void validResetChangesOnlyPasswordForTheSameVerifiedAccount(String role) {
        var account = new Account(UUID.randomUUID(), EMAIL, "old-hash", "Account", role, "ACTIVE",
            Instant.EPOCH, Instant.EPOCH);
        prepareReset(account, EMAIL, Instant.EPOCH.plusSeconds(1800), false);
        when(passwords.encode("ChangedPassword123")).thenReturn("new-bcrypt-hash");

        identity.resetPassword("opaque-test-token", "ChangedPassword123");

        verify(accounts).changePassword(account.id(), "new-bcrypt-hash", Instant.EPOCH);
        verify(accounts, never()).updateProfile(any(), any(), any());
        verifyNoInteractions(mail);
    }

    @ParameterizedTest
    @ValueSource(strings = {"CINEMA_STAFF", "UNKNOWN"})
    void unsupportedRoleCannotRedeemEvenAnUnexpiredReset(String role) {
        prepareReset(new Account(UUID.randomUUID(), EMAIL, "hash", "Account", role, "ACTIVE",
            Instant.EPOCH, Instant.EPOCH), EMAIL, Instant.EPOCH.plusSeconds(1800), false);
        assertInvalidReset();
    }

    @Test
    void unverifiedAdminCannotRedeemReset() {
        prepareReset(new Account(UUID.randomUUID(), EMAIL, "hash", "Admin", "ADMIN", "ACTIVE",
            null, Instant.EPOCH), EMAIL, Instant.EPOCH.plusSeconds(1800), false);
        assertInvalidReset();
    }

    @ParameterizedTest
    @ValueSource(strings = {"SUSPENSE", "DISABLED", "PENDING_VERIFICATION"})
    void inactiveAdminCannotRequestOrRedeemReset(String status) {
        var admin = new Account(UUID.randomUUID(), EMAIL, "hash", "Admin", "ADMIN", status,
            Instant.EPOCH, Instant.EPOCH);
        when(accounts.byEmail(EMAIL)).thenReturn(Optional.of(admin));
        assertEquals("ACCOUNT_UNAVAILABLE", assertThrows(IdentityException.class,
            () -> identity.requestPasswordReset(EMAIL)).code());
        verifyNoReset();
        prepareReset(admin, EMAIL, Instant.EPOCH.plusSeconds(1800), false);
        assertInvalidReset();
    }

    @Test
    void adminResetRejectsExpiredConsumedAndChangedEmailTokens() {
        var admin = new Account(UUID.randomUUID(), EMAIL, "hash", "Admin", "ADMIN", "ACTIVE",
            Instant.EPOCH, Instant.EPOCH);
        prepareReset(admin, EMAIL, Instant.EPOCH, false);
        assertInvalidReset();
        prepareReset(admin, EMAIL, Instant.EPOCH.plusSeconds(1800), true);
        assertInvalidReset();
        prepareReset(admin, "previous@example.test", Instant.EPOCH.plusSeconds(1800), false);
        assertInvalidReset();
    }

    private void prepareReset(Account account, String email, Instant expiresAt, boolean consumed) {
        when(accounts.reset(anyString())).thenReturn(Optional.of(new IdentityRepository.Reset(account.id(), email, expiresAt, consumed)));
        when(accounts.byId(account.id())).thenReturn(Optional.of(account));
        when(accounts.now()).thenReturn(Instant.EPOCH);
    }

    private void assertInvalidReset() {
        assertEquals("INVALID_RESET_TOKEN", assertThrows(IdentityException.class,
            () -> identity.resetPassword("opaque-test-token", "ChangedPassword123")).code());
        verify(accounts, never()).changePassword(any(), any(), any());
    }

    private Account account(String status) {
        return new Account(UUID.randomUUID(), EMAIL, null, "Customer", "CUSTOMER", status,
            "ACTIVE".equals(status) ? Instant.EPOCH : null, Instant.EPOCH);
    }

    private void verifyNoReset() {
        verify(accounts, never()).resetToken(any(), anyString(), anyString(), any());
        verifyNoInteractions(mail);
    }
}
