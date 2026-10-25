package com.se113.movie_ticket_ms.modules.catalog.infrastructure;

import com.se113.movie_ticket_ms.modules.catalog.application.AdminMovies.Genre;
import com.se113.movie_ticket_ms.modules.catalog.application.AdminMovies.Movie;
import java.time.LocalDate;
import java.util.*;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AdminMovieRepository {
    private final NamedParameterJdbcTemplate jdbc;
    public AdminMovieRepository(NamedParameterJdbcTemplate jdbc) { this.jdbc = jdbc; }
    private static final String SELECT = """
        select m.*, array(select g.name
        from movie_app.movie_genres mg join movie_app.genres g on g.id = mg.genre_id
        where mg.movie_id = m.id order by g.name) as genre_names from movie_app.movies m
        """;
    private static final RowMapper<Movie> MOVIE = (rs, n) -> new Movie(rs.getObject("id", UUID.class), rs.getString("title"),
        rs.getString("slug"), rs.getString("description"), rs.getInt("duration_minutes"), rs.getString("age_rating"),
        rs.getString("poster_url"), rs.getObject("release_date", LocalDate.class), rs.getString("status"),
        rs.getTimestamp("created_at").toInstant(), List.of((String[]) rs.getArray("genre_names").getArray()));

    public long count(String query) {
        return jdbc.queryForObject("select count(*) from movie_app.movies where position(:q in lower(title || ' ' || slug)) > 0", Map.of("q", query), Long.class);
    }
    public List<Movie> list(String query, int size, long offset) {
        return jdbc.query(SELECT + " where position(:q in lower(m.title || ' ' || m.slug)) > 0 order by m.created_at desc, m.id desc limit :size offset :offset",
            Map.of("q", query, "size", size, "offset", offset), MOVIE);
    }
    public Optional<Movie> find(UUID id) {
        return jdbc.query(SELECT + " where m.id = :id", Map.of("id", id), MOVIE).stream().findFirst();
    }
    public UUID insert(String title, String slug, String description, int duration, String rating, String poster, LocalDate release) {
        Map<String, Object> params = new HashMap<>();
        params.put("title", title); params.put("slug", slug); params.put("description", description);
        params.put("duration", duration); params.put("rating", rating); params.put("poster", poster); params.put("release", release);
        return jdbc.queryForObject("""
            insert into movie_app.movies(title, slug, description, duration_minutes, age_rating, poster_url, release_date, status)
            values (:title, :slug, :description, :duration, :rating, :poster, :release, 'ACTIVE') returning id
            """, params, UUID.class);
    }
    public void attachGenre(UUID movie, Genre genre) {
        var params = Map.of("name", genre.name(), "slug", genre.slug());
        jdbc.update("insert into movie_app.genres(name, slug) values (:name, :slug) on conflict do nothing", params);
        UUID id = jdbc.queryForObject("""
            select id from movie_app.genres where lower(name) = lower(:name) or slug = :slug
            order by case when lower(name) = lower(:name) then 0 else 1 end, id limit 1
            """, params, UUID.class);
        jdbc.update("insert into movie_app.movie_genres(movie_id, genre_id) values (:movie, :genre) on conflict do nothing",
            Map.of("movie", movie, "genre", id));
    }
}
