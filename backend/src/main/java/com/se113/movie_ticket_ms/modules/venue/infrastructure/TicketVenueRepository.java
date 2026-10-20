package com.se113.movie_ticket_ms.modules.venue.infrastructure;

import com.se113.movie_ticket_ms.modules.venue.application.TicketVenues.AdmissionWindow;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class TicketVenueRepository {
    private final JdbcTemplate jdbc;
    public TicketVenueRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public AdmissionWindow forHall(UUID hallId) {
        return jdbc.queryForObject("""
            select c.check_in_opens_before_minutes, c.check_in_closes_after_minutes
            from movie_app.halls h join movie_app.cinemas c on c.id = h.cinema_id where h.id = ?
            """, (rs, n) -> new AdmissionWindow(rs.getInt(1), rs.getInt(2)), hallId);
    }
}
