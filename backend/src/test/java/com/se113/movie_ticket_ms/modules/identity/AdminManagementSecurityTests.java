package com.se113.movie_ticket_ms.modules.identity;

import com.se113.movie_ticket_ms.modules.identity.api.AdminUsersController;
import com.se113.movie_ticket_ms.modules.identity.application.*;
import com.se113.movie_ticket_ms.modules.identity.domain.Account;
import com.se113.movie_ticket_ms.modules.identity.infrastructure.GoogleOidcUserService;
import com.se113.movie_ticket_ms.modules.identity.infrastructure.IdentitySecurity;
import com.se113.movie_ticket_ms.modules.booking.api.AdminBookingsController;
import com.se113.movie_ticket_ms.modules.booking.application.AdminBookings;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest({AdminUsersController.class, AdminBookingsController.class})
@Import(IdentitySecurity.class)
class AdminManagementSecurityTests {
    @Autowired MockMvc mvc;
    @MockitoBean AdminAccounts accounts;
    @MockitoBean AdminAccountStatus statuses;
    @MockitoBean AdminBookings bookings;
    @MockitoBean IdentityService identity;
    @MockitoBean GoogleOidcUserService google;
    @Test void anonymousCannotReadEitherList() throws Exception {
        for (String path : List.of("users", "bookings")) mvc.perform(get("/api/v1/admin/" + path)).andExpect(status().isUnauthorized());
        verifyNoInteractions(accounts, bookings);
    }
    @ParameterizedTest @ValueSource(strings = {"CUSTOMER", "CINEMA_STAFF"})
    void otherRolesCannotListOrUpdate(String role) throws Exception {
        for (String path : List.of("users", "bookings"))
            mvc.perform(get("/api/v1/admin/" + path).with(user("actor").roles(role))).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/admin/users/" + UUID.randomUUID() + "/status").with(user("actor").roles(role)).with(csrf())
            .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"SUSPENSE\"}")).andExpect(status().isForbidden());
        verifyNoInteractions(accounts, bookings, statuses);
    }
    @Test @WithMockUser(roles = "ADMIN") void adminReadsUncachedBoundedPages() throws Exception {
        mvc.perform(get("/api/v1/admin/users?page=2&size=25&q=Alex")).andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"));
        verify(accounts).list(2, 25, "Alex");
        mvc.perform(get("/api/v1/admin/bookings?page=1&size=25")).andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"));
        verify(bookings).list(1, 25);
        mvc.perform(get("/api/v1/admin/bookings?size=1000")).andExpect(status().isBadRequest());
    }
    @Test @WithMockUser(roles = "ADMIN") void statusChangesRequireCsrf() throws Exception {
        mvc.perform(post("/api/v1/admin/users/" + UUID.randomUUID() + "/status").contentType(MediaType.APPLICATION_JSON)
            .content("{\"status\":\"SUSPENSE\"}")).andExpect(status().isForbidden());
        verifyNoInteractions(statuses);
    }
    @Test void statusUpdateUsesAuthenticatedActorAndOldSessionsAreRejected() throws Exception {
        UUID actor = UUID.randomUUID(), target = UUID.randomUUID();
        var account = new Account(actor, "admin@example.test", "hash", "Admin", "ADMIN", "ACTIVE", Instant.EPOCH, Instant.EPOCH);
        when(identity.current(actor)).thenReturn(account);
        var auth = new UsernamePasswordAuthenticationToken(new AccountIdentity.SessionUser(actor, Instant.EPOCH), null,
            List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
        mvc.perform(post("/api/v1/admin/users/" + target + "/status").with(authentication(auth)).with(csrf())
            .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"SUSPENSE\"}")).andExpect(status().isOk());
        verify(statuses).update(actor, target, "SUSPENSE");
        when(identity.current(actor)).thenThrow(new IdentityException(401, "UNAUTHENTICATED", "Sign in again."));
        mvc.perform(get("/api/v1/admin/users").with(authentication(auth))).andExpect(status().isUnauthorized());
        verifyNoInteractions(accounts);
    }
}
