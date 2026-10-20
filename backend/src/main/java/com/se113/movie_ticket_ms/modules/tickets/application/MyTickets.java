package com.se113.movie_ticket_ms.modules.tickets.application;

import com.se113.movie_ticket_ms.modules.booking.application.CustomerBookings;
import com.se113.movie_ticket_ms.modules.scheduling.application.TicketScreenings;
import com.se113.movie_ticket_ms.modules.venue.application.TicketVenues;
import com.se113.movie_ticket_ms.modules.tickets.infrastructure.CustomerTicketRepository;
import com.se113.movie_ticket_ms.modules.tickets.infrastructure.TicketQrTokens;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@Service
public class MyTickets {
    private final CustomerBookings bookings;
    private final TicketScreenings screenings;
    private final TicketVenues venues;
    private final CustomerTicketRepository tickets;
    private final TicketQrTokens qr;
    public MyTickets(CustomerBookings bookings, TicketScreenings screenings, TicketVenues venues,
            CustomerTicketRepository tickets, TicketQrTokens qr) {
        this.bookings = bookings; this.screenings = screenings; this.venues = venues; this.tickets = tickets; this.qr = qr;
    }
    public record Ticket(UUID id, UUID bookingId, String customerName, JsonNode details, Instant startsAt,
        Instant checkInOpensAt, Instant checkInClosesAt, int seatCount, int admittedCount, int remainingAdmissions,
        String status, String qrToken) {}
    public record Result(Instant serverTime, List<Ticket> tickets) {}

    @Transactional(readOnly = true)
    public Result forCustomer(UUID customerId) {
        var now = tickets.now();
        var result = new ArrayList<Ticket>();
        for (var purchase : bookings.confirmed(customerId)) {
            var stored = tickets.forBooking(purchase.id()).orElse(null);
            if (stored == null) continue;
            var screening = screenings.get(purchase.showtimeId());
            var window = venues.forHall(screening.hallId());
            var opens = screening.startsAt().minus(window.opensBeforeMinutes(), ChronoUnit.MINUTES);
            var closes = screening.startsAt().plus(window.closesAfterMinutes(), ChronoUnit.MINUTES);
            if (now.isAfter(closes) && stored.issuedAt().isBefore(now.minus(30, ChronoUnit.DAYS))) continue;
            int remaining = Math.max(0, purchase.seatCount() - stored.admittedCount());
            String status = remaining == 0 || stored.used() ? "USED" : now.isAfter(closes) ? "EXPIRED"
                : stored.admittedCount() > 0 ? "PARTIALLY_USED" : "VALID";
            result.add(new Ticket(stored.id(), stored.bookingId(), stored.customerName(),
                JsonMapper.builder().build().readTree(stored.details()), screening.startsAt(), opens, closes,
                purchase.seatCount(), stored.admittedCount(), remaining, status,
                qr.recover(stored.ciphertext(), stored.keyVersion(), stored.tokenHash())));
        }
        result.sort(Comparator.comparing(Ticket::startsAt).reversed());
        return new Result(now, result);
    }
}
