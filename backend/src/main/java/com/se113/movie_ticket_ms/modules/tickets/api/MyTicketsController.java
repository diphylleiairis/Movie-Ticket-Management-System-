package com.se113.movie_ticket_ms.modules.tickets.api;

import com.se113.movie_ticket_ms.modules.identity.application.AccountIdentity;
import com.se113.movie_ticket_ms.modules.tickets.application.MyTickets;
import org.springframework.http.HttpHeaders;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import jakarta.servlet.http.HttpServletResponse;

@RestController
public class MyTicketsController {
    private final MyTickets tickets;
    public MyTicketsController(MyTickets tickets) { this.tickets = tickets; }
    @GetMapping("/api/v1/tickets/mine")
    @PreAuthorize("hasRole('CUSTOMER')")
    public MyTickets.Result mine(Authentication authentication, HttpServletResponse response) {
        response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
        return tickets.forCustomer(((AccountIdentity) authentication.getPrincipal()).accountId());
    }
}
