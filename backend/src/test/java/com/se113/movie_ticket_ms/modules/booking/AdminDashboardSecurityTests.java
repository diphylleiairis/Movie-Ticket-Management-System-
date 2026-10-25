package com.se113.movie_ticket_ms.modules.booking;

import com.se113.movie_ticket_ms.modules.booking.api.AdminDashboardController;
import com.se113.movie_ticket_ms.modules.booking.application.AdminDashboard;
import com.se113.movie_ticket_ms.modules.identity.application.IdentityService;
import com.se113.movie_ticket_ms.modules.identity.infrastructure.GoogleOidcUserService;
import com.se113.movie_ticket_ms.modules.identity.infrastructure.IdentitySecurity;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AdminDashboardController.class)
@Import(IdentitySecurity.class)
class AdminDashboardSecurityTests {
    @Autowired MockMvc mvc;
    @MockitoBean AdminDashboard dashboard;
    @MockitoBean IdentityService identity;
    @MockitoBean GoogleOidcUserService google;

    @Test void anonymousCannotReadDashboard() throws Exception {
        mvc.perform(get("/api/v1/admin/dashboard")).andExpect(status().isUnauthorized());
        verifyNoInteractions(dashboard);
    }
    @Test @WithMockUser(roles = "CUSTOMER") void customerCannotReadDashboard() throws Exception {
        mvc.perform(get("/api/v1/admin/dashboard")).andExpect(status().isForbidden());
        verifyNoInteractions(dashboard);
    }
    @Test @WithMockUser(roles = "CINEMA_STAFF") void staffCannotReadDashboard() throws Exception {
        mvc.perform(get("/api/v1/admin/dashboard")).andExpect(status().isForbidden());
        verifyNoInteractions(dashboard);
    }
    @Test @WithMockUser(roles = "ADMIN") void adminReadsUncachedOverviewWithDefaultPeriod() throws Exception {
        mvc.perform(get("/api/v1/admin/dashboard")).andExpect(status().isOk())
            .andExpect(header().string("Cache-Control", "no-store"));
        verify(dashboard).overview(30);
    }
    @Test @WithMockUser(roles = "ADMIN") void adminCanChooseWeek() throws Exception {
        mvc.perform(get("/api/v1/admin/dashboard?days=7")).andExpect(status().isOk());
        verify(dashboard).overview(7);
    }
    @Test @WithMockUser(roles = "ADMIN") void unboundedPeriodIsRejected() throws Exception {
        mvc.perform(get("/api/v1/admin/dashboard?days=36500")).andExpect(status().isBadRequest());
        verifyNoInteractions(dashboard);
    }
}
