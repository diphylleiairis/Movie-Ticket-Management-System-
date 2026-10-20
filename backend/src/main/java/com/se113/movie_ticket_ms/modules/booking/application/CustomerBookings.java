package com.se113.movie_ticket_ms.modules.booking.application;

import java.util.List;
import java.util.UUID;
import com.se113.movie_ticket_ms.modules.booking.infrastructure.CustomerBookingRepository;
import org.springframework.stereotype.Service;

/** Public Booking read contract. Only confirmed purchases belong in My Tickets. */
@Service
public class CustomerBookings {
    private final CustomerBookingRepository repository;
    public CustomerBookings(CustomerBookingRepository repository) { this.repository = repository; }
    public record Purchase(UUID id, UUID showtimeId, int seatCount) {}
    public List<Purchase> confirmed(UUID customerId) {
        return repository.confirmed(customerId);
    }
}
