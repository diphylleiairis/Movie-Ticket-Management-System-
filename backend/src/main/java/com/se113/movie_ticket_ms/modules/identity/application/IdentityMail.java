package com.se113.movie_ticket_ms.modules.identity.application;

public interface IdentityMail {
    void verification(String email, String code);
    void passwordReset(String email, String token, String fullName);

    class DeliveryUnavailable extends RuntimeException {
        public DeliveryUnavailable() { super("Email delivery is unavailable. Please try again later."); }
    }
}
