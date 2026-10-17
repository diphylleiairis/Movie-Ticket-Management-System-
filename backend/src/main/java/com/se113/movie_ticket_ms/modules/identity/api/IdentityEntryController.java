package com.se113.movie_ticket_ms.modules.identity.api;

import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class IdentityEntryController {
    private final String frontend;
    public IdentityEntryController(@Value("${identity.frontend-url:http://localhost:5173}") String frontend) {
        this.frontend = frontend.replaceAll("/$", "");
    }
    @GetMapping("/api/v1/health")
    Map<String, String> health() { return Map.of("status", "UP"); }
    @GetMapping("/login")
    ResponseEntity<Void> login() { return ResponseEntity.status(302).header("Location", frontend + "/login").build(); }
}
