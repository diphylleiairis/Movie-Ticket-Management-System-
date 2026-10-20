package com.se113.movie_ticket_ms.modules.scheduling.infrastructure;

import com.se113.movie_ticket_ms.modules.scheduling.application.TicketScreenings.Screening;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class TicketScreeningRepository {
    private final JdbcTemplate jdbc;
    public TicketScreeningRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public Screening get(UUID id) {
        return jdbc.queryForObject("select hall_id, starts_at from movie_app.showtimes where id = ?",
            (rs, n) -> new Screening(rs.getObject("hall_id", UUID.class), rs.getTimestamp("starts_at").toInstant()), id);
    }
}
