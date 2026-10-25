package com.se113.movie_ticket_ms.modules.catalog.application;

import com.se113.movie_ticket_ms.modules.catalog.infrastructure.AdminCatalogRepository;
import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

/** Public Catalog read contract, including historical movie references. */
@Service
public class AdminCatalog {
    public record Movie(UUID id, String title, String poster, String genre) {}
    private final AdminCatalogRepository repository;
    public AdminCatalog(AdminCatalogRepository repository) { this.repository = repository; }
    public long activeCount() { return repository.activeCount(); }
    public Map<UUID, Movie> movies(Collection<UUID> ids) { return repository.movies(ids); }
}
