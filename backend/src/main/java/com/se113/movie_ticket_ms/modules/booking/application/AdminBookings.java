package com.se113.movie_ticket_ms.modules.booking.application;

import com.se113.movie_ticket_ms.modules.booking.infrastructure.AdminBookingRepository;
import com.se113.movie_ticket_ms.modules.catalog.application.AdminCatalog;
import com.se113.movie_ticket_ms.modules.identity.application.AdminAccounts;
import com.se113.movie_ticket_ms.modules.scheduling.application.AdminScreenings;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminBookings {
    private final AdminBookingRepository bookings;
    private final AdminAccounts accounts;
    private final AdminCatalog catalog;
    private final AdminScreenings screenings;
    public AdminBookings(AdminBookingRepository bookings, AdminAccounts accounts, AdminCatalog catalog, AdminScreenings screenings) {
        this.bookings = bookings; this.accounts = accounts; this.catalog = catalog; this.screenings = screenings;
    }
    public record Page(List<AdminDashboard.Recent> items, long total, int page, int size) {}

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Page list(int page, int size) {
        if (page < 0 || size < 1 || size > 100) throw new IllegalArgumentException("Choose a valid page and size (1–100).");
        var rows = bookings.list(size, (long) page * size);
        var movieIds = screenings.movieIds(rows.stream().map(row -> row.showtimeId()).distinct().toList());
        var movies = catalog.movies(new HashSet<>(movieIds.values()));
        var names = accounts.names(rows.stream().map(row -> row.customerId()).distinct().toList());
        var items = rows.stream().map(row -> new AdminDashboard.Recent(row.id(),
            names.getOrDefault(row.customerId(), "Customer"),
            Optional.ofNullable(movies.get(movieIds.get(row.showtimeId()))).map(AdminCatalog.Movie::title).orElse("Movie"),
            row.createdAt(), row.seats(), row.amount(), row.currency(), row.status())).toList();
        return new Page(items, bookings.count(), page, size);
    }
}
