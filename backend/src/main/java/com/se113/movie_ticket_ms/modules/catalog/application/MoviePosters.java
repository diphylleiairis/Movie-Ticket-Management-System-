package com.se113.movie_ticket_ms.modules.catalog.application;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class MoviePosters {
    public static final int MAX_BYTES = 5 * 1024 * 1024;
    public interface Storage { String put(String objectName, byte[] image, String contentType); }
    public record Uploaded(String posterUrl) {}
    public static class InvalidPoster extends RuntimeException {
        public InvalidPoster(String message) { super(message); }
    }
    public static class StorageUnavailable extends RuntimeException {
        public StorageUnavailable() { super("Poster upload is unavailable. Please try again or use a poster URL."); }
    }
    private final Storage storage;
    public MoviePosters(Storage storage) { this.storage = storage; }

    public Uploaded upload(byte[] image, String declaredType) {
        if (image == null || image.length == 0 || image.length > MAX_BYTES)
            throw new InvalidPoster("Choose a JPEG, PNG or WebP image up to 5 MB.");
        String type, extension;
        if (startsWith(image, new byte[] {(byte) 137, 80, 78, 71, 13, 10, 26, 10})) {
            type = "image/png"; extension = "png";
        } else if (startsWith(image, new byte[] {(byte) 255, (byte) 216, (byte) 255})) {
            type = "image/jpeg"; extension = "jpg";
        } else if (image.length >= 20 && startsWith(image, "RIFF".getBytes(StandardCharsets.US_ASCII))
                && Arrays.equals(Arrays.copyOfRange(image, 8, 12), "WEBP".getBytes(StandardCharsets.US_ASCII))) {
            type = "image/webp"; extension = "webp";
        } else throw new InvalidPoster("Choose a JPEG, PNG or WebP image. The file contents are not a supported image.");
        if (declaredType != null && !declaredType.isBlank() && !"application/octet-stream".equalsIgnoreCase(declaredType)
                && !type.equalsIgnoreCase(declaredType))
            throw new InvalidPoster("The image contents do not match its file type.");
        return new Uploaded(storage.put(UUID.randomUUID() + "." + extension, image, type));
    }

    private static boolean startsWith(byte[] value, byte[] prefix) {
        return value.length >= prefix.length && Arrays.equals(Arrays.copyOf(value, prefix.length), prefix);
    }
}
