package com.se113.movie_ticket_ms.modules.identity.infrastructure;

import com.se113.movie_ticket_ms.modules.identity.domain.Account;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.Arrays;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
public class IdentityRepository {
    private final JdbcTemplate jdbc;
    private static final RowMapper<Account> ACCOUNT = (rs, n) -> new Account(
        rs.getObject("id", UUID.class), rs.getString("email"), rs.getString("password_hash"),
        rs.getString("full_name"), rs.getString("role"), rs.getString("status"), instant(rs, "email_verified_at"), instant(rs, "updated_at"));

    public IdentityRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public record Challenge(UUID id, UUID userId, String email, String hash, Instant expiresAt,
                            Instant createdAt, int failures, boolean closed) {}
    public record Reset(UUID userId, String email, Instant expiresAt, boolean consumed) {}

    private static Instant instant(ResultSet rs, String column) throws SQLException {
        var value = rs.getTimestamp(column);
        return value == null ? null : value.toInstant();
    }

    public Instant now() {
        return jdbc.queryForObject("select clock_timestamp()", java.sql.Timestamp.class).toInstant();
    }

    // Stable lock order serializes new identities/email collisions across backend instances.
    public void lockKeys(String... keys) {
        Arrays.stream(keys).distinct().sorted().forEach(key -> jdbc.query(
            "select pg_advisory_xact_lock(hashtextextended(?, 0))", rs -> {}, "identity:" + key));
    }

    public Optional<Account> byEmail(String email) {
        return jdbc.query("select * from movie_app.users where email = ?", ACCOUNT, email).stream().findFirst();
    }

    public Optional<Account> byId(UUID id) {
        return jdbc.query("select * from movie_app.users where id = ? for update", ACCOUNT, id).stream().findFirst();
    }

    public Optional<Account> byGoogleSubject(String subject) {
        return jdbc.query("""
            select u.* from movie_app.users u join movie_app.user_identities i on i.user_id = u.id
            where i.provider = 'GOOGLE' and i.provider_subject = ? for update of u
            """, ACCOUNT, subject).stream().findFirst();
    }

    public boolean hasGoogleIdentity(UUID id) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
            select exists(select 1 from movie_app.user_identities where user_id = ? and provider = 'GOOGLE')
            """, Boolean.class, id));
    }

    public Account create(String email, String hash, String name, boolean verified, Instant now) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
            insert into movie_app.users(id, email, password_hash, full_name, role, status, email_verified_at)
            values (?, ?, ?, ?, 'CUSTOMER', ?, ?)
            """, id, email, hash, name, verified ? "ACTIVE" : "PENDING_VERIFICATION",
            verified ? java.sql.Timestamp.from(now) : null);
        return byId(id).orElseThrow();
    }

    public void linkGoogle(UUID id, String subject) {
        jdbc.update("insert into movie_app.user_identities(user_id, provider, provider_subject) values (?, 'GOOGLE', ?)", id, subject);
    }

    public UUID challenge(UUID userId, String email, String hash, Instant now) {
        jdbc.update("""
            update movie_app.email_verifications set superseded_at = ?
            where user_id = ? and purpose = 'REGISTRATION' and consumed_at is null and superseded_at is null
            """, java.sql.Timestamp.from(now), userId);
        UUID id = UUID.randomUUID();
        jdbc.update("""
            insert into movie_app.email_verifications(id, user_id, target_email, purpose, token_hash, expires_at, created_at)
            values (?, ?, ?, 'REGISTRATION', ?, ?, ?)
            """, id, userId, email, hash, java.sql.Timestamp.from(now.plusSeconds(600)), java.sql.Timestamp.from(now));
        return id;
    }

    public Optional<Challenge> challenge(UUID id) {
        return jdbc.query("select * from movie_app.email_verifications where id = ? and purpose = 'REGISTRATION'", (rs, n) ->
            new Challenge(id, rs.getObject("user_id", UUID.class), rs.getString("target_email"), rs.getString("token_hash"),
                instant(rs, "expires_at"), instant(rs, "created_at"), rs.getInt("failed_attempts"),
                rs.getTimestamp("consumed_at") != null || rs.getTimestamp("superseded_at") != null), id).stream().findFirst();
    }

    public void failedCode(UUID id) {
        jdbc.update("update movie_app.email_verifications set failed_attempts = failed_attempts + 1 where id = ?", id);
    }

    public void activate(Challenge challenge, Instant now) {
        jdbc.update("""
            update movie_app.users set status = 'ACTIVE', email_verified_at = ? where id = ?
            """, java.sql.Timestamp.from(now), challenge.userId());
        jdbc.update("update movie_app.email_verifications set consumed_at = ? where id = ?", java.sql.Timestamp.from(now), challenge.id());
    }

    public void resetToken(UUID userId, String email, String hash, Instant now) {
        jdbc.update("update movie_app.password_reset_tokens set consumed_at = ? where user_id = ? and consumed_at is null",
            java.sql.Timestamp.from(now), userId);
        jdbc.update("""
            insert into movie_app.password_reset_tokens(user_id, verified_email_snapshot, token_hash, expires_at)
            values (?, ?, ?, ?)
            """, userId, email, hash, java.sql.Timestamp.from(now.plusSeconds(1800)));
    }

    public Optional<Reset> reset(String hash) {
        return jdbc.query("select * from movie_app.password_reset_tokens where token_hash = ?", (rs, n) ->
            new Reset(rs.getObject("user_id", UUID.class), rs.getString("verified_email_snapshot"),
                instant(rs, "expires_at"), rs.getTimestamp("consumed_at") != null), hash).stream().findFirst();
    }

    public void changePassword(UUID id, String password, Instant now) {
        jdbc.update("update movie_app.users set password_hash = ? where id = ?", password, id);
        jdbc.update("update movie_app.password_reset_tokens set consumed_at = ? where user_id = ? and consumed_at is null",
            java.sql.Timestamp.from(now), id);
    }
}
