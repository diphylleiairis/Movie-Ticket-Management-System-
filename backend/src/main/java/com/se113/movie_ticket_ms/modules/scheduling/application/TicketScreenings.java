package com.se113.movie_ticket_ms.modules.scheduling.application;

import java.time.Instant;
import java.util.UUID;
import com.se113.movie_ticket_ms.modules.scheduling.infrastructure.TicketScreeningRepository;
import org.springframework.stereotype.Service;

/** Public Scheduling read contract for confirmed ticket presentation. */
@Service
public class TicketScreenings {
    private final TicketScreeningRepository repository;
    public TicketScreenings(TicketScreeningRepository repository) { this.repository = repository; }
    public record Screening(UUID hallId, Instant startsAt) {}
    public Screening get(UUID id) {
        return repository.get(id);
    }
}
