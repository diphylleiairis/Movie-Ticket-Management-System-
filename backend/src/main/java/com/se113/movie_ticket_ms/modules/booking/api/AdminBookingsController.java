package com.se113.movie_ticket_ms.modules.booking.api;

import com.se113.movie_ticket_ms.modules.booking.application.AdminBookings;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.BAD_REQUEST;

@RestController
@RequestMapping("/api/v1/admin/bookings")
@PreAuthorize("hasRole('ADMIN')")
public class AdminBookingsController {
    private final AdminBookings bookings;
    public AdminBookingsController(AdminBookings bookings) { this.bookings = bookings; }
    @GetMapping
    public ResponseEntity<AdminBookings.Page> list(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        if (page < 0 || size < 1 || size > 100) throw new ResponseStatusException(BAD_REQUEST, "Choose a valid page and size (1–100).");
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(bookings.list(page, size));
    }
}
