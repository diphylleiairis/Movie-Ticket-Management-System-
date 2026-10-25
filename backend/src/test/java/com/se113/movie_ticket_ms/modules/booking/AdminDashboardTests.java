package com.se113.movie_ticket_ms.modules.booking;

import com.se113.movie_ticket_ms.modules.booking.application.AdminDashboard;
import com.se113.movie_ticket_ms.modules.booking.infrastructure.AdminBookingRepository;
import com.se113.movie_ticket_ms.modules.booking.infrastructure.AdminBookingRepository.*;
import com.se113.movie_ticket_ms.modules.catalog.application.AdminCatalog;
import com.se113.movie_ticket_ms.modules.identity.application.AdminAccounts;
import com.se113.movie_ticket_ms.modules.scheduling.application.AdminScreenings;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AdminDashboardTests {
    final AdminBookingRepository bookings = mock(AdminBookingRepository.class);
    final AdminAccounts accounts = mock(AdminAccounts.class);
    final AdminCatalog catalog = mock(AdminCatalog.class);
    final AdminScreenings screenings = mock(AdminScreenings.class);
    final AdminDashboard dashboard = new AdminDashboard(bookings, accounts, catalog, screenings);
    final Instant now = Instant.parse("2026-10-31T18:00:00Z"); // Nov 1 in Vietnam.
    @BeforeEach void setup() {
        when(bookings.now()).thenReturn(now);
        when(bookings.totals(any(), any())).thenReturn(new Totals(0, BigDecimal.ZERO));
    }
    @Test void emptyDatabaseReturnsEmptyOverviewAndVietnamCalendarBoundaries() {
        var result = dashboard.overview(7);
        assertEquals(LocalDate.parse("2026-10-26"), result.from());
        assertEquals(LocalDate.parse("2026-11-01"), result.through());
        assertEquals(0, result.current().bookings());
        assertTrue(result.topMovies().isEmpty());
        assertTrue(result.genres().isEmpty());
        verify(bookings).totals(Instant.parse("2026-10-25T17:00:00Z"), Instant.parse("2026-11-01T17:00:00Z"));
        verify(bookings).totals(Instant.parse("2026-10-18T17:00:00Z"), Instant.parse("2026-10-25T17:00:00Z"));
    }
    @Test void salesAcrossShowtimesAggregateByMovieAndRecentKeepsOriginalCurrencyAndStatus() {
        UUID movie = UUID.randomUUID(), first = UUID.randomUUID(), second = UUID.randomUUID(), customer = UUID.randomUUID();
        when(bookings.sales(any(), any())).thenReturn(List.of(new ScreeningSales(first, 2), new ScreeningSales(second, 3)));
        when(bookings.recent(any(), any())).thenReturn(List.of(new Recent(UUID.randomUUID(), customer, second, now,
            3, new BigDecimal("10.00"), "USD", "HELD")));
        when(screenings.movieIds(any())).thenReturn(Map.of(first, movie, second, movie));
        when(catalog.movies(any())).thenReturn(Map.of(movie, new AdminCatalog.Movie(movie, "Historical movie", "/poster.png", "Drama")));
        when(accounts.names(any())).thenReturn(Map.of(customer, "Alex"));
        var result = dashboard.overview(30);
        assertEquals(1, result.topMovies().size());
        assertEquals(5, result.topMovies().getFirst().seats());
        assertEquals(5, result.genres().getFirst().seats());
        assertEquals("Historical movie", result.recentBookings().getFirst().movie());
        assertEquals("USD", result.recentBookings().getFirst().currency());
        assertEquals("HELD", result.recentBookings().getFirst().status());
        assertEquals("Alex", result.recentBookings().getFirst().customer());
    }
    @Test void invalidPeriodDoesNotReadData() {
        assertThrows(IllegalArgumentException.class, () -> dashboard.overview(365));
        verifyNoInteractions(bookings, accounts, catalog, screenings);
    }
}
