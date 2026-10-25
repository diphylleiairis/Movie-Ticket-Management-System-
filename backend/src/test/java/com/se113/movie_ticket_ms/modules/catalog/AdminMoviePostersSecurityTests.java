package com.se113.movie_ticket_ms.modules.catalog;

import com.se113.movie_ticket_ms.modules.catalog.api.AdminMoviePostersController;
import com.se113.movie_ticket_ms.modules.catalog.application.MoviePosters;
import com.se113.movie_ticket_ms.modules.identity.application.IdentityService;
import com.se113.movie_ticket_ms.modules.identity.infrastructure.GoogleOidcUserService;
import com.se113.movie_ticket_ms.modules.identity.infrastructure.IdentitySecurity;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AdminMoviePostersController.class)
@Import(IdentitySecurity.class)
class AdminMoviePostersSecurityTests {
    @Autowired MockMvc mvc;
    @MockitoBean MoviePosters posters;
    @MockitoBean IdentityService identity;
    @MockitoBean GoogleOidcUserService google;
    final MockMultipartFile image = new MockMultipartFile("image", "poster.png", "image/png", new byte[] {1, 2, 3});

    @Test void anonymousCannotUpload() throws Exception {
        mvc.perform(multipart("/api/v1/admin/movies/posters").file(image).with(csrf())).andExpect(status().isUnauthorized());
        verifyNoInteractions(posters);
    }
    @ParameterizedTest @ValueSource(strings = {"CUSTOMER", "CINEMA_STAFF"})
    void otherRolesCannotUpload(String role) throws Exception {
        mvc.perform(multipart("/api/v1/admin/movies/posters").file(image).with(user("actor").roles(role)).with(csrf())).andExpect(status().isForbidden());
        verifyNoInteractions(posters);
    }
    @Test @WithMockUser(roles = "ADMIN") void csrfIsRequired() throws Exception {
        mvc.perform(multipart("/api/v1/admin/movies/posters").file(image)).andExpect(status().isForbidden());
        verifyNoInteractions(posters);
    }
    @Test @WithMockUser(roles = "ADMIN") void adminReceivesTheUploadedPublicUrlWithoutCaching() throws Exception {
        when(posters.upload(any(), eq("image/png"))).thenReturn(new MoviePosters.Uploaded("https://project.example/poster.png"));
        mvc.perform(multipart("/api/v1/admin/movies/posters").file(image).with(csrf())).andExpect(status().isCreated())
            .andExpect(header().string("Cache-Control", "no-store")).andExpect(jsonPath("$.posterUrl").value("https://project.example/poster.png"));
    }
    @Test @WithMockUser(roles = "ADMIN") void invalidImagesAndProviderFailureReturnUsefulErrors() throws Exception {
        when(posters.upload(any(), any())).thenThrow(new MoviePosters.InvalidPoster("Choose a supported image."));
        mvc.perform(multipart("/api/v1/admin/movies/posters").file(image).with(csrf())).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_POSTER"));
        doThrow(new MoviePosters.StorageUnavailable()).when(posters).upload(any(), any());
        mvc.perform(multipart("/api/v1/admin/movies/posters").file(image).with(csrf())).andExpect(status().isServiceUnavailable()).andExpect(jsonPath("$.code").value("POSTER_UPLOAD_UNAVAILABLE"));
    }
}
