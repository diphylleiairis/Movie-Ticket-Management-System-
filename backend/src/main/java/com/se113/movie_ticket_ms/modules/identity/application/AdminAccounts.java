package com.se113.movie_ticket_ms.modules.identity.application;

import com.se113.movie_ticket_ms.modules.identity.infrastructure.AdminAccountRepository;
import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.stereotype.Service;

/** Identity owns administrative account reads and status changes. */
@Service
public class AdminAccounts {
    private final AdminAccountRepository repository;
    public AdminAccounts(AdminAccountRepository repository) { this.repository = repository; }
    public long count() { return repository.count(); }
    public Map<UUID, String> names(Collection<UUID> ids) { return repository.names(ids); }

    public record User(UUID id, String fullName, String email, String role, String status,
        boolean emailVerified, Instant createdAt) {}
    public record Page(List<User> items, long total, int page, int size) {}

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Page list(int page, int size, String query) {
        if (page < 0 || size < 1 || size > 100 || query == null || query.length() > 200)
            throw new IdentityException(400, "INVALID_INPUT", "Choose a valid page, size (1–100) and search (up to 200 characters).");
        String search = query.strip().toLowerCase(Locale.ROOT);
        return new Page(repository.list(search, size, (long) page * size), repository.matchingCount(search), page, size);
    }
}
