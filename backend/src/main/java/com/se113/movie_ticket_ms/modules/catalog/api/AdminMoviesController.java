package com.se113.movie_ticket_ms.modules.catalog.api;

import com.se113.movie_ticket_ms.modules.catalog.application.AdminMovies;
import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.converter.HttpMessageNotReadableException;

@RestController
@RequestMapping("/api/v1/admin/movies")
@PreAuthorize("hasRole('ADMIN')")
public class AdminMoviesController {
    private final AdminMovies movies;
    public AdminMoviesController(AdminMovies movies) { this.movies = movies; }

    @GetMapping
    public ResponseEntity<AdminMovies.Page> list(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size, @RequestParam(defaultValue = "") String q) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(movies.list(page, size, q));
    }
    @PostMapping
    public ResponseEntity<AdminMovies.Movie> create(@RequestBody AdminMovies.Create input) {
        return ResponseEntity.status(201).cacheControl(CacheControl.noStore()).body(movies.create(input));
    }
    @ExceptionHandler({AdminMovies.InvalidMovie.class, HttpMessageNotReadableException.class})
    public ResponseEntity<?> invalid(Exception ex) {
        String message = ex instanceof AdminMovies.InvalidMovie ? ex.getMessage() : "Check the submitted movie information and date.";
        return ResponseEntity.badRequest().body(Map.of("code", "INVALID_MOVIE", "message", message));
    }
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<?> conflict() {
        return ResponseEntity.status(409).body(Map.of("code", "MOVIE_CONFLICT", "message", "The movie could not be added. Its slug may already be in use."));
    }
}
