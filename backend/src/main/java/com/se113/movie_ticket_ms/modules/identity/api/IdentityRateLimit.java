package com.se113.movie_ticket_ms.modules.identity.api;

import com.se113.movie_ticket_ms.modules.identity.application.IdentityException;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class IdentityRateLimit {
    private record Window(Instant until, int count) {}
    private final Map<String, Window> windows = new HashMap<>();

    public synchronized void check(String key, int limit) {
        var now = Instant.now();
        windows.entrySet().removeIf(entry -> !now.isBefore(entry.getValue().until()));
        var current = windows.get(key);
        if (current == null && windows.size() >= 10_000)
            throw new IdentityException(429, "TOO_MANY_ATTEMPTS", "Please try again later.");
        if (current != null && current.count() >= limit)
            throw new IdentityException(429, "TOO_MANY_ATTEMPTS", "Too many attempts. Please try again later.");
        windows.put(key, new Window(current == null ? now.plusSeconds(900) : current.until(), current == null ? 1 : current.count() + 1));
    }
}
