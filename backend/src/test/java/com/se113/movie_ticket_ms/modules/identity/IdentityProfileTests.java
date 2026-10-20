package com.se113.movie_ticket_ms.modules.identity;

import com.se113.movie_ticket_ms.modules.identity.application.*;
import com.se113.movie_ticket_ms.modules.identity.domain.Account;
import com.se113.movie_ticket_ms.modules.identity.infrastructure.IdentityRepository;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class IdentityProfileTests {
    final IdentityRepository repository = mock(IdentityRepository.class);
    final IdentityService identity = new IdentityService(repository, mock(PasswordEncoder.class), mock(IdentityMail.class));
    final UUID id = UUID.randomUUID();
    Account account(String role) { return new Account(id, "customer@example.com", null, "Customer", role, "ACTIVE", Instant.EPOCH, Instant.EPOCH); }

    @Test void updatesOnlyTheAuthenticatedCustomerAndNormalizesFields() {
        when(repository.byId(id)).thenReturn(Optional.of(account("CUSTOMER")));
        when(repository.updateProfile(id, "New name", "+84 901234567")).thenReturn(account("CUSTOMER"));
        identity.updateProfile(id, "  New name  ", "  +84 901234567  ");
        verify(repository).updateProfile(id, "New name", "+84 901234567");
        verify(repository, never()).changePassword(any(), any(), any());
    }

    @Test void invalidNameOrPhoneDoesNotWriteAndStaffCannotEdit() {
        when(repository.byId(id)).thenReturn(Optional.of(account("CUSTOMER")));
        assertThrows(IdentityException.class, () -> identity.updateProfile(id, " ", ""));
        assertThrows(IdentityException.class, () -> identity.updateProfile(id, "Customer", "not-a-phone"));
        when(repository.byId(id)).thenReturn(Optional.of(account("CINEMA_STAFF")));
        assertEquals(403, assertThrows(IdentityException.class, () -> identity.updateProfile(id, "Customer", "")).status());
        verify(repository, never()).updateProfile(any(), any(), any());
    }
}
