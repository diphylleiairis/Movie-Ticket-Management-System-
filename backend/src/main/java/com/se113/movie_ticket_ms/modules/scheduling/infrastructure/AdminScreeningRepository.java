package com.se113.movie_ticket_ms.modules.scheduling.infrastructure;

import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AdminScreeningRepository {
    private final NamedParameterJdbcTemplate jdbc;
    public AdminScreeningRepository(NamedParameterJdbcTemplate jdbc) { this.jdbc = jdbc; }
    public Map<UUID, UUID> movieIds(Collection<UUID> ids) {
        Map<UUID, UUID> result = new HashMap<>();
        if (!ids.isEmpty()) jdbc.query("select id, movie_id from movie_app.showtimes where id in (:ids)",
            Map.of("ids", ids), rs -> { result.put(rs.getObject("id", UUID.class), rs.getObject("movie_id", UUID.class)); });
        return result;
    }
}
