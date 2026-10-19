package com.se113.movie_ticket_ms.modules.identity.application;

public class IdentityException extends RuntimeException {
    private final int status;
    private final String code;

    public IdentityException(int status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public int status() { return status; }
    public String code() { return code; }

    // Verification failures must commit their failed-attempt counter.
    public static final class InvalidCode extends IdentityException {
        public InvalidCode() {
            super(400, "INVALID_VERIFICATION_CODE", "The verification code is incorrect.");
        }
    }
}
