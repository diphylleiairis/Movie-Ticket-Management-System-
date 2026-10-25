package com.se113.movie_ticket_ms.modules.catalog.application;

import com.se113.movie_ticket_ms.modules.catalog.infrastructure.AdminMovieRepository;
import java.net.URI;
import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminMovies {
    public record Create(String title, String slug, String description, BigDecimal durationMinutes,
        String ageRating, String posterUrl, LocalDate releaseDate, List<String> genres) {}
    public record Movie(UUID id, String title, String slug, String description, int durationMinutes,
        String ageRating, String posterUrl, LocalDate releaseDate, String status, Instant createdAt, List<String> genres) {}
    public record Page(List<Movie> items, long total, int page, int size) {}
    public record Genre(String name, String slug) {}
    private final AdminMovieRepository repository;
    public AdminMovies(AdminMovieRepository repository) { this.repository = repository; }

    public static class InvalidMovie extends RuntimeException {
        public InvalidMovie(String message) { super(message); }
    }

    private static String text(String value, int max, String label) {
        if (value == null || value.isBlank() || value.indexOf('\0') >= 0 || value.strip().length() > max)
            throw new InvalidMovie(label + " is required and must be at most " + max + " characters.");
        return value.strip();
    }

    private static String genreSlug(String value) {
        return Normalizer.normalize(value, Normalizer.Form.NFD).replaceAll("\\p{M}+", "")
            .toLowerCase(Locale.ROOT).replace('đ', 'd').replaceAll("[^\\p{L}\\p{N}]+", "-").replaceAll("^-|-$", "");
    }

    @Transactional
    public Movie create(Create input) {
        if (input == null) throw new InvalidMovie("Movie information is required.");
        String title = text(input.title(), 200, "Title"), slug = text(input.slug(), 200, "Slug");
        if (!slug.matches("[a-z0-9]+(?:-[a-z0-9]+)*")) throw new InvalidMovie("Slug must use lowercase letters, numbers and single hyphens.");
        String description = text(input.description(), 10000, "Description"), rating = text(input.ageRating(), 20, "Age rating");
        int duration;
        try { duration = input.durationMinutes() == null ? 0 : input.durationMinutes().intValueExact(); }
        catch (ArithmeticException ex) { throw new InvalidMovie("Duration must be a positive whole number of minutes."); }
        if (duration <= 0) throw new InvalidMovie("Duration must be a positive whole number of minutes.");
        String poster = text(input.posterUrl(), 2048, "Poster URL");
        try {
            var uri = URI.create(poster);
            if ((!"https".equalsIgnoreCase(uri.getScheme()) && !"http".equalsIgnoreCase(uri.getScheme())) || uri.getHost() == null || uri.getUserInfo() != null)
                throw new IllegalArgumentException();
        } catch (IllegalArgumentException ex) { throw new InvalidMovie("Poster must be a valid HTTP(S) URL without embedded credentials."); }
        if (input.genres() == null || input.genres().isEmpty() || input.genres().size() > 10)
            throw new InvalidMovie("Provide between 1 and 10 genres.");
        Map<String, Genre> genres = new TreeMap<>();
        for (String value : input.genres()) {
            String name = text(value, 80, "Genre"), genreSlug = genreSlug(name);
            if (genreSlug.isBlank()) throw new InvalidMovie("Genres must contain a letter or number usable in a URL.");
            genres.putIfAbsent(genreSlug, new Genre(name, genreSlug));
        }
        UUID id = repository.insert(title, slug, description, duration, rating, poster, input.releaseDate());
        for (var genre : genres.values()) repository.attachGenre(id, genre);
        return repository.find(id).orElseThrow();
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Page list(int page, int size, String query) {
        if (page < 0 || size < 1 || size > 100 || query == null || query.length() > 200)
            throw new InvalidMovie("Choose a valid page, size (1–100) and search (up to 200 characters).");
        String search = query.strip().toLowerCase(Locale.ROOT);
        return new Page(repository.list(search, size, (long) page * size), repository.count(search), page, size);
    }
}
