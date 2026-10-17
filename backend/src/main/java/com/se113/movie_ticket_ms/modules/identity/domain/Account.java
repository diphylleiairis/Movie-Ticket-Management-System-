package com.se113.movie_ticket_ms.modules.identity.domain;

import java.time.Instant;
import java.util.UUID;

public record Account(UUID id, String email, String passwordHash, String fullName,
                      String role, String status, Instant emailVerifiedAt, Instant updatedAt) {
    public boolean active() {
        return "ACTIVE".equals(status) && (!"CUSTOMER".equals(role) || emailVerifiedAt != null);
    }
}
