package com.se113.movie_ticket_ms.modules.booking.api;

import com.se113.movie_ticket_ms.modules.booking.application.AdminDashboard;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.BAD_REQUEST;

@RestController
@RequestMapping("/api/v1/admin/dashboard")
@PreAuthorize("hasRole('ADMIN')")
public class AdminDashboardController {
    private final AdminDashboard dashboard;
    public AdminDashboardController(AdminDashboard dashboard) { this.dashboard = dashboard; }
    @GetMapping
    public ResponseEntity<AdminDashboard.Overview> overview(@RequestParam(defaultValue = "30") int days) {
        if (days != 7 && days != 30 && days != 90) throw new ResponseStatusException(BAD_REQUEST, "Choose 7, 30 or 90 days.");
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(dashboard.overview(days));
    }
}
