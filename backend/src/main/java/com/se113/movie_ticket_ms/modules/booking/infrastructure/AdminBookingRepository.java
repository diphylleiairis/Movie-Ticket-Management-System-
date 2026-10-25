package com.se113.movie_ticket_ms.modules.booking.infrastructure;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AdminBookingRepository {
    public record Totals(long bookings, BigDecimal revenue) {}
    public record Day(LocalDate date, BigDecimal revenue) {}
    public record ScreeningSales(UUID showtimeId, long seats) {}
    public record Recent(UUID id, UUID customerId, UUID showtimeId, Instant createdAt,
        int seats, BigDecimal amount, String currency, String status) {}
    private final JdbcTemplate jdbc;
    public AdminBookingRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public Instant now() { return jdbc.queryForObject("select clock_timestamp()", Timestamp.class).toInstant(); }
    public long count() { return jdbc.queryForObject("select count(*) from movie_app.bookings", Long.class); }
    public List<Recent> list(int size, long offset) {
        return jdbc.query("""
            select id, customer_id, showtime_id, created_at, seat_count, total_amount, currency, status
            from movie_app.bookings order by created_at desc, id desc limit ? offset ?
            """, (rs, n) -> new Recent(rs.getObject("id", UUID.class), rs.getObject("customer_id", UUID.class),
                rs.getObject("showtime_id", UUID.class), rs.getTimestamp("created_at").toInstant(), rs.getInt("seat_count"),
                rs.getBigDecimal("total_amount"), rs.getString("currency"), rs.getString("status")), size, offset);
    }
    public Totals totals(Instant start, Instant end) {
        long bookings = jdbc.queryForObject("select count(*) from movie_app.bookings where created_at >= ? and created_at < ?",
            Long.class, Timestamp.from(start), Timestamp.from(end));
        BigDecimal revenue = jdbc.queryForObject("""
            select coalesce(sum(total_amount), 0) from movie_app.bookings
            where status = 'CONFIRMED' and currency = 'VND' and confirmed_at >= ? and confirmed_at < ?
            """, BigDecimal.class, Timestamp.from(start), Timestamp.from(end));
        return new Totals(bookings, revenue);
    }
    public List<Day> revenue(Instant start, Instant end) {
        return jdbc.query("""
            select (confirmed_at at time zone 'Asia/Ho_Chi_Minh')::date as day, sum(total_amount) as revenue
            from movie_app.bookings where status = 'CONFIRMED' and currency = 'VND'
            and confirmed_at >= ? and confirmed_at < ? group by day order by day
            """, (rs, n) -> new Day(rs.getDate("day").toLocalDate(), rs.getBigDecimal("revenue")),
            Timestamp.from(start), Timestamp.from(end));
    }
    public List<ScreeningSales> sales(Instant start, Instant end) {
        return jdbc.query("""
            select showtime_id, sum(seat_count) as seats from movie_app.bookings
            where status = 'CONFIRMED' and confirmed_at >= ? and confirmed_at < ? group by showtime_id
            """, (rs, n) -> new ScreeningSales(rs.getObject("showtime_id", UUID.class), rs.getLong("seats")),
            Timestamp.from(start), Timestamp.from(end));
    }
    public List<Recent> recent(Instant start, Instant end) {
        return jdbc.query("""
            select id, customer_id, showtime_id, created_at, seat_count, total_amount, currency, status
            from movie_app.bookings where created_at >= ? and created_at < ? order by created_at desc, id desc limit 8
            """, (rs, n) -> new Recent(rs.getObject("id", UUID.class), rs.getObject("customer_id", UUID.class),
                rs.getObject("showtime_id", UUID.class), rs.getTimestamp("created_at").toInstant(), rs.getInt("seat_count"),
                rs.getBigDecimal("total_amount"), rs.getString("currency"), rs.getString("status")),
            Timestamp.from(start), Timestamp.from(end));
    }
}
