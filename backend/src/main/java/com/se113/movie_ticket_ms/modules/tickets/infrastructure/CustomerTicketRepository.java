package com.se113.movie_ticket_ms.modules.tickets.infrastructure;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class CustomerTicketRepository {
    private final JdbcTemplate jdbc;
    public CustomerTicketRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public record StoredTicket(UUID id, UUID bookingId, String customerName, String details,
        int admittedCount, Instant issuedAt, boolean used, byte[] ciphertext, String keyVersion, String tokenHash) {}
    public Instant now() {
        return jdbc.queryForObject("select clock_timestamp()", java.sql.Timestamp.class).toInstant();
    }
    public Optional<StoredTicket> forBooking(UUID bookingId) {
        return jdbc.query("select * from movie_app.tickets where booking_id = ?", (rs, n) ->
            new StoredTicket(rs.getObject("id", UUID.class), bookingId, rs.getString("customer_name_snapshot"),
                rs.getString("ticket_details_snapshot"), rs.getInt("admitted_count"), rs.getTimestamp("issued_at").toInstant(),
                rs.getTimestamp("used_at") != null, rs.getBytes("qr_token_ciphertext"), rs.getString("qr_key_version"),
                rs.getString("qr_token_hash")), bookingId).stream().findFirst();
    }
}
