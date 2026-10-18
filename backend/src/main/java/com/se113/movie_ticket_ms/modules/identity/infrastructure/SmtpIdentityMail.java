package com.se113.movie_ticket_ms.modules.identity.infrastructure;

import com.se113.movie_ticket_ms.modules.identity.application.IdentityMail;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "identity.mail-provider", havingValue = "smtp")
public class SmtpIdentityMail implements IdentityMail {
    private final ObjectProvider<JavaMailSender> senders;
    private final String from;

    public SmtpIdentityMail(ObjectProvider<JavaMailSender> senders, @Value("${identity.mail-from:}") String from) {
        this.senders = senders;
        this.from = from;
    }

    @Override
    public void verification(String email, String code) {
        send(email, "Verify your movie ticket account", "Your verification code is " + code + ". It expires in 10 minutes.");
    }

    @Override
    public void passwordReset(String email, String token) {
        send(email, "Reset your movie ticket password", "Your password reset token is " + token + ". It expires in 30 minutes. Ignore this email if you did not request a reset.");
    }

    private void send(String email, String subject, String body) {
        var sender = senders.getIfAvailable();
        if (sender == null || from.isBlank()) throw new DeliveryUnavailable();
        var message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(email);
        message.setSubject(subject);
        message.setText(body);
        try { sender.send(message); }
        catch (org.springframework.mail.MailException ex) { throw new DeliveryUnavailable(); }
    }

}
