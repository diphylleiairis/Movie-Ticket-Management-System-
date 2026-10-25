package com.se113.movie_ticket_ms.modules.identity.application;

import com.se113.movie_ticket_ms.modules.identity.infrastructure.AdminAccountRepository;
import com.se113.movie_ticket_ms.modules.identity.infrastructure.IdentityRepository;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminAccountStatus {
    private final IdentityRepository identities;
    private final AdminAccountRepository accounts;

    public AdminAccountStatus(IdentityRepository identities, AdminAccountRepository accounts) {
        this.identities = identities; this.accounts = accounts;
    }

    @Transactional
    public void update(UUID actor, UUID target, String status) {
        if (status == null || !Set.of("ACTIVE", "SUSPENSE").contains(status))
            throw new IdentityException(400, "INVALID_STATUS", "Choose ACTIVE or SUSPENSE.");
        if (actor.equals(target))
            throw new IdentityException(409, "SELF_UPDATE", "You cannot change your own account status.");
        var account = identities.byId(target).orElseThrow(() ->
            new IdentityException(404, "ACCOUNT_NOT_FOUND", "This account does not exist."));
        if ("PENDING_VERIFICATION".equals(account.status())
                || ("ACTIVE".equals(status) && "CUSTOMER".equals(account.role()) && account.emailVerifiedAt() == null))
            throw new IdentityException(409, "EMAIL_NOT_VERIFIED", "Registration email verification must be completed first.");
        if (!status.equals(account.status())) accounts.status(target, status);
    }
}
