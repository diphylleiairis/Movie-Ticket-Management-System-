package com.se113.movie_ticket_ms.modules.venue.application;

import java.util.UUID;
import com.se113.movie_ticket_ms.modules.venue.infrastructure.TicketVenueRepository;
import org.springframework.stereotype.Service;

/** Public Venue read contract; check-in windows always use this Cinema's configuration. */
@Service
public class TicketVenues {
    private final TicketVenueRepository repository;
    public TicketVenues(TicketVenueRepository repository) { this.repository = repository; }
    public record AdmissionWindow(int opensBeforeMinutes, int closesAfterMinutes) {}
    public AdmissionWindow forHall(UUID hallId) {
        return repository.forHall(hallId);
    }
}
