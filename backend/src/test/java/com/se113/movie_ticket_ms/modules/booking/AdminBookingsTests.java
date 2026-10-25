package com.se113.movie_ticket_ms.modules.booking;

import com.se113.movie_ticket_ms.modules.booking.application.AdminBookings;
import com.se113.movie_ticket_ms.modules.booking.infrastructure.AdminBookingRepository;
import com.se113.movie_ticket_ms.modules.catalog.application.AdminCatalog;
import com.se113.movie_ticket_ms.modules.identity.application.AdminAccounts;
import com.se113.movie_ticket_ms.modules.scheduling.application.AdminScreenings;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AdminBookingsTests {
    final AdminBookingRepository bookings = mock(AdminBookingRepository.class);
    final AdminAccounts accounts = mock(AdminAccounts.class);
    final AdminCatalog catalog = mock(AdminCatalog.class);
    final AdminScreenings screenings = mock(AdminScreenings.class);
    final AdminBookings service = new AdminBookings(bookings, accounts, catalog, screenings);
    @Test void listIncludesOldUnconfirmedBookingsWithOriginalMoneyAndAllPages() {
        UUID customer = UUID.randomUUID(), showtime = UUID.randomUUID(), movie = UUID.randomUUID();
        var old = Instant.parse("2024-01-01T00:00:00Z");
        when(bookings.list(25, 25)).thenReturn(List.of(new AdminBookingRepository.Recent(UUID.randomUUID(), customer, showtime,
            old, 2, new BigDecimal("12.50"), "USD", "CANCELLED")));
        when(bookings.count()).thenReturn(80L);
        when(accounts.names(any())).thenReturn(Map.of(customer, "Customer"));
        when(screenings.movieIds(any())).thenReturn(Map.of(showtime, movie));
        when(catalog.movies(any())).thenReturn(Map.of(movie, new AdminCatalog.Movie(movie, "Archived movie", "", "Drama")));
        var result = service.list(1, 25);
        assertEquals(80, result.total());
        assertEquals("CANCELLED", result.items().getFirst().status());
        assertEquals("USD", result.items().getFirst().currency());
        assertEquals(new BigDecimal("12.50"), result.items().getFirst().amount());
        assertEquals(old, result.items().getFirst().createdAt());
        assertEquals("Archived movie", result.items().getFirst().movie());
        verify(bookings).list(25, 25);
        verify(bookings, never()).recent(any(), any());
    }
    @Test void invalidPagesDoNotReadRepositories() {
        assertThrows(IllegalArgumentException.class, () -> service.list(-1, 25));
        assertThrows(IllegalArgumentException.class, () -> service.list(0, 0));
        assertThrows(IllegalArgumentException.class, () -> service.list(0, 101));
        verifyNoInteractions(bookings, accounts, catalog, screenings);
    }
}
