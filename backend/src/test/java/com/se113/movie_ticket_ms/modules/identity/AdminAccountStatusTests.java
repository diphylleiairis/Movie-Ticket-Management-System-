package com.se113.movie_ticket_ms.modules.identity;

import com.se113.movie_ticket_ms.modules.identity.application.*;
import com.se113.movie_ticket_ms.modules.identity.domain.Account;
import com.se113.movie_ticket_ms.modules.identity.infrastructure.*;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.security.crypto.password.PasswordEncoder;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AdminAccountStatusTests {
    final IdentityRepository identities = mock(IdentityRepository.class);
    final AdminAccountRepository accounts = mock(AdminAccountRepository.class);
    final AdminAccountStatus service = new AdminAccountStatus(identities, accounts);
    final UUID actor = UUID.randomUUID(), target = UUID.randomUUID();
    Account account(String status, boolean verified) {
        return new Account(target, "customer@example.test", "hash", "Customer", "CUSTOMER", status,
            verified ? Instant.EPOCH : null, Instant.EPOCH);
    }
    @Test void adminSuspendsVerifiedCustomerAndCanRestoreTheSameIdentity() {
        when(identities.byId(target)).thenReturn(Optional.of(account("ACTIVE", true)));
        service.update(actor, target, "SUSPENSE");
        verify(accounts).status(target, "SUSPENSE");
        when(identities.byId(target)).thenReturn(Optional.of(account("SUSPENSE", true)));
        service.update(actor, target, "ACTIVE");
        verify(accounts).status(target, "ACTIVE");
    }
    @Test void repeatedStatusIsANoOp() {
        when(identities.byId(target)).thenReturn(Optional.of(account("SUSPENSE", true)));
        service.update(actor, target, "SUSPENSE");
        verifyNoInteractions(accounts);
    }
    @Test void selfSuspensionIsRejected() {
        assertEquals("SELF_UPDATE", assertThrows(IdentityException.class, () -> service.update(actor, actor, "SUSPENSE")).code());
        verifyNoInteractions(identities, accounts);
    }
    @ParameterizedTest @ValueSource(strings = {"PENDING_VERIFICATION", "ADMIN", "DISABLED", "", "suspense"})
    void unsupportedStatusNeverWrites(String status) {
        assertEquals(400, assertThrows(IdentityException.class, () -> service.update(actor, target, status)).status());
        verifyNoInteractions(identities, accounts);
    }
    @Test void cannotBypassRegistrationVerification() {
        when(identities.byId(target)).thenReturn(Optional.of(account("PENDING_VERIFICATION", false)));
        for (String status : List.of("ACTIVE", "SUSPENSE"))
            assertEquals("EMAIL_NOT_VERIFIED", assertThrows(IdentityException.class, () -> service.update(actor, target, status)).code());
        when(identities.byId(target)).thenReturn(Optional.of(account("DISABLED", false)));
        assertThrows(IdentityException.class, () -> service.update(actor, target, "ACTIVE"));
        verifyNoInteractions(accounts);
    }
    @Test void unknownAccountIsNotFound() {
        when(identities.byId(target)).thenReturn(Optional.empty());
        assertEquals(404, assertThrows(IdentityException.class, () -> service.update(actor, target, "SUSPENSE")).status());
        verifyNoInteractions(accounts);
    }
    @Test void suspenseBlocksPasswordGoogleAndCurrentSession() {
        var passwords = mock(PasswordEncoder.class);
        var identity = new IdentityService(identities, passwords, mock(IdentityMail.class));
        var suspended = account("SUSPENSE", true);
        when(identities.byEmail(suspended.email())).thenReturn(Optional.of(suspended));
        when(identities.byId(target)).thenReturn(Optional.of(suspended));
        when(identities.byGoogleSubject("google-subject")).thenReturn(Optional.of(suspended));
        when(passwords.matches(anyString(), eq("hash"))).thenReturn(true);
        assertEquals("ACCOUNT_SUSPENDED", assertThrows(IdentityException.class, () -> identity.authenticate(suspended.email(), "Password123")).code());
        assertEquals("ACCOUNT_UNAVAILABLE", assertThrows(IdentityException.class, () -> identity.google("google-subject", suspended.email(), "Customer", true, null)).code());
        assertEquals(401, assertThrows(IdentityException.class, () -> identity.current(target)).status());
        verify(identities, never()).create(anyString(), any(), anyString(), anyBoolean(), any());
    }
    @Test void userListUsesBoundedPagesAndNormalizedServerSearch() {
        var reads = new AdminAccounts(accounts);
        when(accounts.list("customer", 25, 25)).thenReturn(List.of());
        when(accounts.matchingCount("customer")).thenReturn(51L);
        var result = reads.list(1, 25, " CUSTOMER ");
        assertEquals(51, result.total());
        verify(accounts).list("customer", 25, 25);
        assertThrows(IdentityException.class, () -> reads.list(-1, 25, ""));
        assertThrows(IdentityException.class, () -> reads.list(0, 101, ""));
    }
}
