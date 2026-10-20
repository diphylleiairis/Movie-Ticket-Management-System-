package com.se113.movie_ticket_ms.modules.tickets.infrastructure;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.Base64;
import java.util.HexFormat;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

/** Versioned keys stay outside PostgreSQL. Ciphertext format: 12-byte IV followed by AES-GCM ciphertext/tag. */
@Component
public class TicketQrTokens {
    private final String keys;
    public TicketQrTokens(@Value("${tickets.qr-keys:}") String keys) { this.keys = keys; }
    public String recover(byte[] packed, String version, String expectedHash) {
        try {
            var node = JsonMapper.builder().build().readTree(keys).get(version);
            if (node == null || !node.isTextual() || packed.length < 29) return null;
            byte[] key = Base64.getDecoder().decode(node.asText());
            if (key.length != 32) return null;
            var cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(128, Arrays.copyOf(packed, 12)));
            cipher.updateAAD(version.getBytes(StandardCharsets.UTF_8));
            byte[] token = cipher.doFinal(Arrays.copyOfRange(packed, 12, packed.length));
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(token);
            if (!MessageDigest.isEqual(hash, HexFormat.of().parseHex(expectedHash))) return null;
            return new String(token, StandardCharsets.UTF_8);
        } catch (Exception ex) {
            // Keep the ticket readable when a key is unavailable; never replace its QR or reveal key material.
            return null;
        }
    }
}
