package com.se113.movie_ticket_ms.modules.catalog;

import com.se113.movie_ticket_ms.modules.catalog.api.AdminMoviesController;
import com.se113.movie_ticket_ms.modules.catalog.application.AdminMovies;
import com.se113.movie_ticket_ms.modules.identity.application.IdentityService;
import com.se113.movie_ticket_ms.modules.identity.infrastructure.GoogleOidcUserService;
import com.se113.movie_ticket_ms.modules.identity.infrastructure.IdentitySecurity;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AdminMoviesController.class)
@Import(IdentitySecurity.class)
class AdminMoviesSecurityTests {
    @Autowired MockMvc mvc;
    @MockitoBean AdminMovies movies;
    @MockitoBean IdentityService identity;
    @MockitoBean GoogleOidcUserService google;
    final String payload = """
        {"title":"Movie","slug":"movie","description":"Description","durationMinutes":120,
         "ageRating":"T13","posterUrl":"https://example.test/poster.jpg","releaseDate":null,"genres":["Drama"]}
        """;
    @Test void anonymousCannotListOrCreate() throws Exception {
        mvc.perform(get("/api/v1/admin/movies")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/admin/movies").with(csrf()).contentType("application/json").content(payload)).andExpect(status().isUnauthorized());
        verifyNoInteractions(movies);
    }
    @ParameterizedTest @ValueSource(strings = {"CUSTOMER", "CINEMA_STAFF"})
    void otherRolesCannotListOrCreate(String role) throws Exception {
        mvc.perform(get("/api/v1/admin/movies").with(user("actor").roles(role))).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/admin/movies").with(user("actor").roles(role)).with(csrf())
            .contentType("application/json").content(payload)).andExpect(status().isForbidden());
        verifyNoInteractions(movies);
    }
    @Test @WithMockUser(roles = "ADMIN") void csrfIsRequired() throws Exception {
        mvc.perform(post("/api/v1/admin/movies").contentType("application/json").content(payload)).andExpect(status().isForbidden());
        verifyNoInteractions(movies);
    }
    @Test @WithMockUser(roles = "ADMIN") void adminCreatesAndListsUncachedMovies() throws Exception {
        var movie = new AdminMovies.Movie(UUID.randomUUID(), "Movie", "movie", "Description", 120, "T13", "https://example.test/poster.jpg", null, "ACTIVE", Instant.EPOCH, List.of("Drama"));
        when(movies.create(any())).thenReturn(movie);
        mvc.perform(post("/api/v1/admin/movies").with(csrf()).contentType("application/json").content(payload))
            .andExpect(status().isCreated()).andExpect(header().string("Cache-Control", "no-store"))
            .andExpect(jsonPath("$.status").value("ACTIVE"));
        mvc.perform(get("/api/v1/admin/movies?page=1&q=Movie")).andExpect(status().isOk());
        verify(movies).list(1, 25, "Movie");
    }
    @Test @WithMockUser(roles = "ADMIN") void duplicateSlugAndInvalidInputHaveSanitizedErrors() throws Exception {
        when(movies.create(any())).thenThrow(new DataIntegrityViolationException("private-database-details"));
        mvc.perform(post("/api/v1/admin/movies").with(csrf()).contentType("application/json").content(payload))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("MOVIE_CONFLICT"));
        doThrow(new AdminMovies.InvalidMovie("Duration must be positive.")).when(movies).create(any());
        mvc.perform(post("/api/v1/admin/movies").with(csrf()).contentType("application/json").content(payload))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_MOVIE"));
        mvc.perform(post("/api/v1/admin/movies").with(csrf()).contentType("application/json").content("{\"releaseDate\":\"invalid\"}"))
            .andExpect(status().isBadRequest());
    }
}
