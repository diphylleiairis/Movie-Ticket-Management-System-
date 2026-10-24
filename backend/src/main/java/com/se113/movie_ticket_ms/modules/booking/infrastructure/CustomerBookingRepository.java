package com.se113.movie_ticket_ms.modules.booking.infrastructure;

import com.se113.movie_ticket_ms.modules.booking.application.CustomerBookings.Purchase;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class CustomerBookingRepository {
    private final JdbcTemplate jdbc;
    public CustomerBookingRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public List<Purchase> confirmed(UUID customerId) {
        return jdbc.query("select id, showtime_id, seat_count from movie_app.bookings where customer_id = ? and status = 'CONFIRMED'",
            (rs, n) -> new Purchase(rs.getObject("id", UUID.class), rs.getObject("showtime_id", UUID.class), rs.getInt("seat_count")), customerId);
    }
}
