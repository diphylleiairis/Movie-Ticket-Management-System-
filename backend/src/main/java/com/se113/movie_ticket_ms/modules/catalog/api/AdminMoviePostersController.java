package com.se113.movie_ticket_ms.modules.catalog.api;

import com.se113.movie_ticket_ms.modules.catalog.application.MoviePosters;
import java.io.IOException;
import java.util.Map;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/admin/movies/posters")
@PreAuthorize("hasRole('ADMIN')")
public class AdminMoviePostersController {
    private final MoviePosters posters;
    public AdminMoviePostersController(MoviePosters posters) { this.posters = posters; }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<MoviePosters.Uploaded> upload(@RequestParam("image") MultipartFile image) throws IOException {
        if (image.getSize() > MoviePosters.MAX_BYTES) throw new MoviePosters.InvalidPoster("Choose an image up to 5 MB.");
        return ResponseEntity.status(201).cacheControl(CacheControl.noStore()).body(posters.upload(image.getBytes(), image.getContentType()));
    }

    @ExceptionHandler(MoviePosters.InvalidPoster.class)
    ResponseEntity<?> invalid(MoviePosters.InvalidPoster ex) {
        return ResponseEntity.badRequest().body(Map.of("code", "INVALID_POSTER", "message", ex.getMessage()));
    }
    @ExceptionHandler({MoviePosters.StorageUnavailable.class, IOException.class})
    ResponseEntity<?> unavailable() {
        return ResponseEntity.status(503).body(Map.of("code", "POSTER_UPLOAD_UNAVAILABLE", "message", new MoviePosters.StorageUnavailable().getMessage()));
    }
}
