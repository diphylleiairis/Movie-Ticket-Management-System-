package com.se113.movie_ticket_ms.modules.identity.infrastructure;

import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.List;
import com.se113.movie_ticket_ms.modules.identity.application.AdminAccounts.User;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AdminAccountRepository {
    private final NamedParameterJdbcTemplate jdbc;
    public AdminAccountRepository(NamedParameterJdbcTemplate jdbc) { this.jdbc = jdbc; }
    public long count() {
        return jdbc.queryForObject("select count(*) from movie_app.users", Map.of(), Long.class);
    }
    public Map<UUID, String> names(Collection<UUID> ids) {
        Map<UUID, String> result = new HashMap<>();
        if (!ids.isEmpty()) jdbc.query("select id, full_name from movie_app.users where id in (:ids)",
            Map.of("ids", ids), rs -> { result.put(rs.getObject("id", UUID.class), rs.getString("full_name")); });
        return result;
    }

    public long matchingCount(String query) {
        return jdbc.queryForObject("select count(*) from movie_app.users where position(:query in lower(full_name || ' ' || email)) > 0",
            Map.of("query", query), Long.class);
    }

    public List<User> list(String query, int size, long offset) {
        return jdbc.query("""
            select id, full_name, email, role, status, email_verified_at, created_at
            from movie_app.users where position(:query in lower(full_name || ' ' || email)) > 0
            order by created_at desc, id desc limit :size offset :offset
            """, Map.of("query", query, "size", size, "offset", offset), (rs, n) -> new User(
                rs.getObject("id", UUID.class), rs.getString("full_name"), rs.getString("email"),
                rs.getString("role"), rs.getString("status"), rs.getTimestamp("email_verified_at") != null,
                rs.getTimestamp("created_at").toInstant()));
    }

    public void status(UUID id, String status) {
        // V1's touch_updated_at trigger revokes sessions carrying the previous account version.
        jdbc.update("update movie_app.users set status = :status where id = :id",
            Map.of("id", id, "status", status));
    }
}
