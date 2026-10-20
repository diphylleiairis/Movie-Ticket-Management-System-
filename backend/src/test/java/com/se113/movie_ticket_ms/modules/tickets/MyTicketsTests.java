package com.se113.movie_ticket_ms.modules.tickets;

import com.se113.movie_ticket_ms.modules.booking.application.CustomerBookings;
import com.se113.movie_ticket_ms.modules.scheduling.application.TicketScreenings;
import com.se113.movie_ticket_ms.modules.venue.application.TicketVenues;
import com.se113.movie_ticket_ms.modules.tickets.application.MyTickets;
import com.se113.movie_ticket_ms.modules.tickets.infrastructure.*;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class MyTicketsTests {
    final CustomerBookings bookings = mock(CustomerBookings.class);
    final TicketScreenings screenings = mock(TicketScreenings.class);
    final TicketVenues venues = mock(TicketVenues.class);
    final CustomerTicketRepository repository = mock(CustomerTicketRepository.class);
    final TicketQrTokens qr = mock(TicketQrTokens.class);
    final MyTickets service = new MyTickets(bookings, screenings, venues, repository, qr);
    final UUID customer = UUID.randomUUID(), booking = UUID.randomUUID(), showtime = UUID.randomUUID(), hall = UUID.randomUUID();
    final Instant starts = Instant.parse("2026-10-20T12:00:00Z");
    @BeforeEach void setup() {
        when(bookings.confirmed(customer)).thenReturn(List.of(new CustomerBookings.Purchase(booking, showtime, 5)));
        when(screenings.get(showtime)).thenReturn(new TicketScreenings.Screening(hall, starts));
        when(venues.forHall(hall)).thenReturn(new TicketVenues.AdmissionWindow(30, 15));
        when(repository.now()).thenReturn(starts);
        stored(0, starts);
    }
    void stored(int admitted, Instant issued) {
        when(repository.forBooking(booking)).thenReturn(Optional.of(new CustomerTicketRepository.StoredTicket(
            UUID.randomUUID(), booking, "Original customer name", "{}", admitted, issued, admitted == 5, new byte[0], "v1", "hash")));
    }
    @Test void partialCheckInStaysUsableAndClosingBoundaryIsInclusive() {
        stored(3, starts);
        when(repository.now()).thenReturn(starts.plusSeconds(15 * 60));
        var ticket = service.forCustomer(customer).tickets().getFirst();
        assertEquals("PARTIALLY_USED", ticket.status());
        assertEquals(2, ticket.remainingAdmissions());
        assertEquals(starts.minusSeconds(30 * 60), ticket.checkInOpensAt());
        when(repository.now()).thenReturn(starts.plusSeconds(15 * 60 + 1));
        assertEquals("EXPIRED", service.forCustomer(customer).tickets().getFirst().status());
    }
    @Test void fullyAdmittedTicketIsUsed() {
        stored(5, starts);
        var ticket = service.forCustomer(customer).tickets().getFirst();
        assertEquals("USED", ticket.status());
        assertEquals(0, ticket.remainingAdmissions());
    }
    @Test void oldPurchaseKeepsUpcomingTicketButHidesOldPastTicketWithoutDeleting() {
        stored(0, starts.minus(60, ChronoUnit.DAYS));
        assertEquals(1, service.forCustomer(customer).tickets().size());
        when(repository.now()).thenReturn(starts.plus(1, ChronoUnit.DAYS));
        assertTrue(service.forCustomer(customer).tickets().isEmpty());
    }
    @Test void emptyConfirmedBookingsDoNotReadOtherCustomersTickets() {
        when(bookings.confirmed(customer)).thenReturn(List.of());
        assertTrue(service.forCustomer(customer).tickets().isEmpty());
        verify(repository, never()).forBooking(any());
    }
}
