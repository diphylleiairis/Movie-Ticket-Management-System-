package com.se113.movie_ticket_ms.modules.catalog;

import com.se113.movie_ticket_ms.modules.catalog.application.AdminMovies;
import com.se113.movie_ticket_ms.modules.catalog.infrastructure.AdminMovieRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AdminMoviesTests {
    final AdminMovieRepository repository = mock(AdminMovieRepository.class);
    final AdminMovies movies = new AdminMovies(repository);
    AdminMovies.Create input(String slug, String duration, String poster, List<String> genres) {
        return new AdminMovies.Create(" Movie ", slug, " Description ", new BigDecimal(duration), " T13 ", poster, null, genres);
    }
    @Test void createsMovieUsingNormalizedFieldsAndOneLinkPerGenre() {
        UUID id = UUID.randomUUID();
        var stored = new AdminMovies.Movie(id, "Movie", "movie", "Description", 120, "T13", "https://cinema.example.test/poster.jpg", null, "ACTIVE", Instant.EPOCH, List.of("Drama"));
        when(repository.insert(anyString(), anyString(), anyString(), anyInt(), anyString(), anyString(), any())).thenReturn(id);
        when(repository.find(id)).thenReturn(Optional.of(stored));
        assertEquals(stored, movies.create(input("movie", "120", stored.posterUrl(), List.of(" Drama ", "drama", "Drama"))));
        verify(repository).insert("Movie", "movie", "Description", 120, "T13", stored.posterUrl(), null);
        verify(repository).attachGenre(id, new AdminMovies.Genre("Drama", "drama"));
    }
    @ParameterizedTest @ValueSource(strings = {"0", "-1", "1.5", "2147483648"})
    void invalidDurationDoesNotWrite(String duration) {
        assertThrows(AdminMovies.InvalidMovie.class, () -> movies.create(input("movie", duration, "https://example.test/poster.jpg", List.of("Drama"))));
        verifyNoInteractions(repository);
    }
    @ParameterizedTest @ValueSource(strings = {"javascript:alert(1)", "file:///tmp/poster.jpg", "https://name:secret@example.test/poster.jpg", "not-a-url"})
    void invalidPosterDoesNotWrite(String poster) {
        assertThrows(AdminMovies.InvalidMovie.class, () -> movies.create(input("movie", "120", poster, List.of("Drama"))));
        verifyNoInteractions(repository);
    }
    @Test void missingGenresOrInvalidSlugDoesNotWrite() {
        assertThrows(AdminMovies.InvalidMovie.class, () -> movies.create(input("movie", "120", "https://example.test/poster.jpg", List.of())));
        assertThrows(AdminMovies.InvalidMovie.class, () -> movies.create(input("Bad Slug", "120", "https://example.test/poster.jpg", List.of("Drama"))));
        verifyNoInteractions(repository);
    }
    @Test void listsAllStatusesWithBoundedServerSearch() {
        when(repository.list("movie", 25, 25)).thenReturn(List.of());
        when(repository.count("movie")).thenReturn(30L);
        assertEquals(30, movies.list(1, 25, " Movie ").total());
        verify(repository).list("movie", 25, 25);
        assertThrows(AdminMovies.InvalidMovie.class, () -> movies.list(-1, 25, ""));
        assertThrows(AdminMovies.InvalidMovie.class, () -> movies.list(0, 101, ""));
    }
}
