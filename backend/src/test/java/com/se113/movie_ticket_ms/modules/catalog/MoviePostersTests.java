package com.se113.movie_ticket_ms.modules.catalog;

import com.se113.movie_ticket_ms.modules.catalog.application.MoviePosters;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MoviePostersTests {
    final MoviePosters.Storage storage = mock(MoviePosters.Storage.class);
    final MoviePosters posters = new MoviePosters(storage);
    final byte[] png = new byte[] {(byte) 137, 80, 78, 71, 13, 10, 26, 10, 0};

    @Test void uploadUsesGeneratedObjectNameAndReturnsStoredPublicUrl() {
        when(storage.put(anyString(), same(png), eq("image/png"))).thenReturn("https://project.example/poster.png");
        assertEquals("https://project.example/poster.png", posters.upload(png, "image/png").posterUrl());
        verify(storage).put(matches("[a-f0-9-]{36}\\.png"), same(png), eq("image/png"));
    }
    @Test void supportsJpegAndWebpBySignatureWithoutTrustingTheFilename() {
        posters.upload(new byte[] {(byte) 255, (byte) 216, (byte) 255, 0}, "image/jpeg");
        posters.upload("RIFF0000WEBPVP8 0000".getBytes(StandardCharsets.US_ASCII), "image/webp");
        verify(storage).put(matches("[a-f0-9-]{36}\\.jpg"), any(), eq("image/jpeg"));
        verify(storage).put(matches("[a-f0-9-]{36}\\.webp"), any(), eq("image/webp"));
    }
    @Test void rejectsEmptyOversizedSvgAndSpoofedImageContentWithoutUploading() {
        for (byte[] image : new byte[][] {null, {}, new byte[MoviePosters.MAX_BYTES + 1], "<svg onload='alert(1)'/>".getBytes(StandardCharsets.UTF_8)})
            assertThrows(MoviePosters.InvalidPoster.class, () -> posters.upload(image, "image/png"));
        assertThrows(MoviePosters.InvalidPoster.class, () -> posters.upload(png, "image/jpeg"));
        verifyNoInteractions(storage);
    }
}
