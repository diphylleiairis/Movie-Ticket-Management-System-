package com.se113.movie_ticket_ms.modules.scheduling.application;

import com.se113.movie_ticket_ms.modules.scheduling.infrastructure.AdminScreeningRepository;
import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

/** Public Scheduling read contract for resolving movie references in reports. */
@Service
public class AdminScreenings {
    private final AdminScreeningRepository repository;
    public AdminScreenings(AdminScreeningRepository repository) { this.repository = repository; }
    public Map<UUID, UUID> movieIds(Collection<UUID> ids) { return repository.movieIds(ids); }
}
