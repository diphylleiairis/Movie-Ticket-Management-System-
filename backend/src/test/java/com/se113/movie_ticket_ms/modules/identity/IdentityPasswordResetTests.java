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
    private IdentityService identity;
    private static final String EMAIL = "customer@example.com";

    @BeforeEach
    void setup() {
        identity = new IdentityService(accounts, mock(PasswordEncoder.class), mail);
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
    @ValueSource(strings = {"PENDING_VERIFICATION", "DISABLED"})
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
        verify(mail).passwordReset(eq(EMAIL), anyString());
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
