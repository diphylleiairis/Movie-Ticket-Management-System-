package com.se113.movie_ticket_ms.modules.booking.application;

import com.se113.movie_ticket_ms.modules.booking.infrastructure.AdminBookingRepository;
import com.se113.movie_ticket_ms.modules.booking.infrastructure.AdminBookingRepository.Day;
import com.se113.movie_ticket_ms.modules.booking.infrastructure.AdminBookingRepository.Totals;
import com.se113.movie_ticket_ms.modules.catalog.application.AdminCatalog;
import com.se113.movie_ticket_ms.modules.identity.application.AdminAccounts;
import com.se113.movie_ticket_ms.modules.scheduling.application.AdminScreenings;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

/** Booking reporting composes module-owned read contracts; it never mutates business state. */
@Service
public class AdminDashboard {
    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private final AdminBookingRepository bookings;
    private final AdminAccounts accounts;
    private final AdminCatalog catalog;
    private final AdminScreenings screenings;
    public AdminDashboard(AdminBookingRepository bookings, AdminAccounts accounts, AdminCatalog catalog, AdminScreenings screenings) {
        this.bookings = bookings; this.accounts = accounts; this.catalog = catalog; this.screenings = screenings;
    }
    public record Recent(UUID id, String customer, String movie, Instant createdAt, int seats,
        BigDecimal amount, String currency, String status) {}
    public record Popular(UUID id, String title, String poster, String genre, long seats) {}
    public record Genre(String name, long seats) {}
    public record Overview(Instant generatedAt, LocalDate from, LocalDate through, long users, long activeMovies,
        Totals current, Totals previous, List<Day> revenue, List<Day> previousRevenue,
        List<Recent> recentBookings, List<Popular> topMovies, List<Genre> genres) {}

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Overview overview(int days) {
        if (days != 7 && days != 30 && days != 90) throw new IllegalArgumentException("Choose 7, 30 or 90 days.");
        var now = bookings.now();
        var today = now.atZone(ZONE).toLocalDate();
        var first = today.minusDays(days - 1);
        var start = first.atStartOfDay(ZONE).toInstant();
        var end = today.plusDays(1).atStartOfDay(ZONE).toInstant();
        var previousStart = first.minusDays(days).atStartOfDay(ZONE).toInstant();
        var recent = bookings.recent(start, end);
        var sales = bookings.sales(start, end);
        Set<UUID> showtimeIds = new HashSet<>();
        recent.forEach(row -> showtimeIds.add(row.showtimeId()));
        sales.forEach(row -> showtimeIds.add(row.showtimeId()));
        var movieIds = screenings.movieIds(showtimeIds);
        var movies = catalog.movies(new HashSet<>(movieIds.values()));
        var names = accounts.names(recent.stream().map(row -> row.customerId()).distinct().toList());
        Map<UUID, Long> seatsByMovie = new HashMap<>();
        sales.forEach(row -> seatsByMovie.merge(movieIds.get(row.showtimeId()), row.seats(), Long::sum));
        var popular = seatsByMovie.entrySet().stream().filter(entry -> movies.containsKey(entry.getKey()))
            .map(entry -> {
                var movie = movies.get(entry.getKey());
                return new Popular(movie.id(), movie.title(), movie.poster(), movie.genre(), entry.getValue());
            }).sorted(Comparator.comparingLong(Popular::seats).reversed().thenComparing(Popular::title)).toList();
        Map<String, Long> genres = new TreeMap<>();
        popular.forEach(movie -> genres.merge(movie.genre(), movie.seats(), Long::sum));
        var rows = recent.stream().map(row -> new Recent(row.id(), names.getOrDefault(row.customerId(), "Customer"),
            Optional.ofNullable(movies.get(movieIds.get(row.showtimeId()))).map(AdminCatalog.Movie::title).orElse("Movie"),
            row.createdAt(), row.seats(), row.amount(), row.currency(), row.status())).toList();
        return new Overview(now, first, today, accounts.count(), catalog.activeCount(), bookings.totals(start, end),
            bookings.totals(previousStart, start), bookings.revenue(start, end), bookings.revenue(previousStart, start), rows,
            popular.stream().limit(5).toList(), genres.entrySet().stream().map(e -> new Genre(e.getKey(), e.getValue()))
                .sorted(Comparator.comparingLong(Genre::seats).reversed().thenComparing(Genre::name)).toList());
    }
}
