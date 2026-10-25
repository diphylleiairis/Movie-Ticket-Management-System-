package com.se113.movie_ticket_ms.modules.identity.api;

import com.se113.movie_ticket_ms.modules.identity.application.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/users")
@PreAuthorize("hasRole('ADMIN')")
public class AdminUsersController {
    private final AdminAccounts accounts;
    private final AdminAccountStatus statuses;
    public AdminUsersController(AdminAccounts accounts, AdminAccountStatus statuses) {
        this.accounts = accounts; this.statuses = statuses;
    }

    @GetMapping
    public ResponseEntity<AdminAccounts.Page> list(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size, @RequestParam(defaultValue = "") String q) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(accounts.list(page, size, q));
    }

    public record Update(@NotBlank String status) {}

    @PostMapping("/{id}/status")
    public ResponseEntity<Map<String, String>> update(@PathVariable UUID id, @Valid @RequestBody Update input,
            Authentication authentication) {
        if (!(authentication.getPrincipal() instanceof AccountIdentity principal))
            throw new IdentityException(401, "UNAUTHENTICATED", "Sign in to continue.");
        statuses.update(principal.accountId(), id, input.status());
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(Map.of("status", "UPDATED"));
    }
}
