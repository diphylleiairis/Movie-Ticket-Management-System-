package com.se113.movie_ticket_ms.modules.identity;

import com.se113.movie_ticket_ms.modules.identity.application.*;
import com.se113.movie_ticket_ms.modules.identity.domain.Account;
import com.se113.movie_ticket_ms.modules.identity.infrastructure.IdentityRepository;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.security.crypto.password.PasswordEncoder;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class IdentityProfileTests {
    final IdentityRepository repository = mock(IdentityRepository.class);
    final IdentityService identity = new IdentityService(repository, mock(PasswordEncoder.class), mock(IdentityMail.class));
    final UUID id = UUID.randomUUID();
    Account account(String role) { return new Account(id, "customer@example.com", null, "Customer", role, "ACTIVE", Instant.EPOCH, Instant.EPOCH); }

    @ParameterizedTest @ValueSource(strings = {"CUSTOMER", "ADMIN", "CINEMA_STAFF"})
    void updatesOnlyTheAuthenticatedAccountAndNormalizesFields(String role) {
        when(repository.byId(id)).thenReturn(Optional.of(account(role)));
        when(repository.updateProfile(id, "New name", "+84 901234567")).thenReturn(account(role));
        var updated = identity.updateProfile(id, "  New name  ", "  +84 901234567  ");
        assertEquals(id, updated.id());
        assertEquals(role, updated.role());
        assertEquals("customer@example.com", updated.email());
        verify(repository).updateProfile(id, "New name", "+84 901234567");
        verify(repository, never()).changePassword(any(), any(), any());
    }

    @ParameterizedTest @ValueSource(strings = {"CUSTOMER", "ADMIN", "CINEMA_STAFF"})
    void invalidNameOrPhoneDoesNotWrite(String role) {
        when(repository.byId(id)).thenReturn(Optional.of(account(role)));
        assertThrows(IdentityException.class, () -> identity.updateProfile(id, " ", ""));
        assertThrows(IdentityException.class, () -> identity.updateProfile(id, "Customer", "not-a-phone"));
        assertThrows(IdentityException.class, () -> identity.updateProfile(id, "x".repeat(151), ""));
        verify(repository, never()).updateProfile(any(), any(), any());
    }

    @Test void unknownRoleCannotEdit() {
        when(repository.byId(id)).thenReturn(Optional.of(account("UNKNOWN")));
        assertEquals(403, assertThrows(IdentityException.class, () -> identity.updateProfile(id, "Customer", "")).status());
        verify(repository, never()).updateProfile(any(), any(), any());
    }

    @ParameterizedTest @ValueSource(strings = {"CUSTOMER", "ADMIN", "CINEMA_STAFF"})
    void suspendedAccountsCannotEdit(String role) {
        when(repository.byId(id)).thenReturn(Optional.of(new Account(id, "customer@example.com", null,
            "Account", role, "SUSPENSE", Instant.EPOCH, Instant.EPOCH)));
        assertEquals(401, assertThrows(IdentityException.class, () -> identity.updateProfile(id, "Changed", "")).status());
        verify(repository, never()).updateProfile(any(), any(), any());
    }
}
