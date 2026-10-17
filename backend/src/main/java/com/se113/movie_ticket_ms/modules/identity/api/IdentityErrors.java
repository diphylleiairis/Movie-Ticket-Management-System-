package com.se113.movie_ticket_ms.modules.identity.api;

import com.se113.movie_ticket_ms.modules.identity.application.IdentityException;
import com.se113.movie_ticket_ms.modules.identity.infrastructure.SmtpIdentityMail;
import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = IdentityController.class)
public class IdentityErrors {
    @ExceptionHandler(IdentityException.class)
    ResponseEntity<?> identity(IdentityException ex) {
        return ResponseEntity.status(ex.status()).body(Map.of("code", ex.code(), "message", ex.getMessage()));
    }

    @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class})
    ResponseEntity<?> invalid(Exception ex) {
        return ResponseEntity.badRequest().body(Map.of("code", "INVALID_INPUT", "message", "Check the submitted information."));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<?> conflict() {
        return ResponseEntity.status(409).body(Map.of("code", "IDENTITY_CONFLICT", "message", "This identity is already registered or linked."));
    }

    @ExceptionHandler(SmtpIdentityMail.DeliveryUnavailable.class)
    ResponseEntity<?> mail() {
        return ResponseEntity.status(503).body(Map.of("code", "EMAIL_UNAVAILABLE", "message", "Email delivery is unavailable. Please try again later."));
    }
}
