package com.se113.movie_ticket_ms.modules.catalog.infrastructure;

import com.se113.movie_ticket_ms.modules.catalog.application.MoviePosters;
import java.net.URI;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Map;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
public class SupabasePosterStorage implements MoviePosters.Storage {
    private final RestClient client;
    private final String origin, key, bucket;
    public SupabasePosterStorage(@Value("${catalog.poster-storage.url:}") String url,
            @Value("${catalog.poster-storage.secret-key:}") String secretKey,
            @Value("${catalog.poster-storage.service-role-key:}") String serviceRoleKey,
            @Value("${catalog.poster-storage.bucket:movie-posters}") String bucket) {
        var factory = new JdkClientHttpRequestFactory(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build());
        factory.setReadTimeout(Duration.ofSeconds(30));
        this.client = RestClient.builder().requestFactory(factory).build();
        this.origin = url.strip().replaceAll("/$", "");
        this.key = secretKey.isBlank() ? serviceRoleKey : secretKey;
        this.bucket = bucket;
    }

    @Override public String put(String objectName, byte[] image, String contentType) {
        if (!configured() || !objectName.matches("[a-f0-9-]{36}\\.(jpg|png|webp)")) throw new MoviePosters.StorageUnavailable();
        String path = bucket + "/" + objectName;
        try {
            var result = client.post().uri(origin + "/storage/v1/object/" + path)
                .headers(headers -> {
                    headers.set("apikey", key);
                    if (!key.startsWith("sb_secret_")) headers.setBearerAuth(key);
                }).header("x-upsert", "false").header("Cache-Control", "public, max-age=31536000")
                .contentType(MediaType.parseMediaType(contentType)).body(image).retrieve().body(Map.class);
            if (result == null || !path.equals(result.get("Key"))) throw new MoviePosters.StorageUnavailable();
            return origin + "/storage/v1/object/public/" + path;
        } catch (RestClientException ex) {
            // Provider bodies may contain credentials or internal details. Do not return or log them.
            throw new MoviePosters.StorageUnavailable();
        }
    }

    private boolean configured() {
        if (key.isBlank() || !bucket.matches("[a-z0-9][a-z0-9-]{0,62}")) return false;
        try {
            var uri = URI.create(origin);
            return uri.getHost() != null && uri.getUserInfo() == null && uri.getQuery() == null && uri.getFragment() == null
                && uri.getPath().isEmpty() && ("https".equals(uri.getScheme()) || ("http".equals(uri.getScheme())
                    && Set.of("localhost", "127.0.0.1").contains(uri.getHost())));
        } catch (IllegalArgumentException ex) { return false; }
    }
}
