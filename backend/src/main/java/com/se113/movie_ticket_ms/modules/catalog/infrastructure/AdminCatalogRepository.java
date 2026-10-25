package com.se113.movie_ticket_ms.modules.catalog.infrastructure;

import com.se113.movie_ticket_ms.modules.catalog.application.AdminCatalog.Movie;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AdminCatalogRepository {
    private final NamedParameterJdbcTemplate jdbc;
    public AdminCatalogRepository(NamedParameterJdbcTemplate jdbc) { this.jdbc = jdbc; }
    public long activeCount() {
        return jdbc.queryForObject("select count(*) from movie_app.movies where status = 'ACTIVE'", Map.of(), Long.class);
    }
    public Map<UUID, Movie> movies(Collection<UUID> ids) {
        Map<UUID, Movie> result = new HashMap<>();
        if (!ids.isEmpty()) jdbc.query("""
            select m.id, m.title, m.poster_url, coalesce(min(g.name), 'Other') as genre
            from movie_app.movies m left join movie_app.movie_genres mg on mg.movie_id = m.id
            left join movie_app.genres g on g.id = mg.genre_id
            where m.id in (:ids) group by m.id, m.title, m.poster_url
            """, Map.of("ids", ids), rs -> {
                var id = rs.getObject("id", UUID.class);
                result.put(id, new Movie(id, rs.getString("title"), rs.getString("poster_url"), rs.getString("genre")));
            });
        return result;
    }
}
