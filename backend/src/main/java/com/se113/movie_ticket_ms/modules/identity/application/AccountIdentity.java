package com.se113.movie_ticket_ms.modules.identity.application;

import java.io.Serializable;
import java.security.Principal;
import java.util.UUID;
import java.time.Instant;

public interface AccountIdentity extends Principal, Serializable {
    UUID accountId();
    Instant accountVersion();

    record SessionUser(UUID accountId, Instant accountVersion) implements AccountIdentity {
        @Override public String getName() { return accountId.toString(); }
    }
}
