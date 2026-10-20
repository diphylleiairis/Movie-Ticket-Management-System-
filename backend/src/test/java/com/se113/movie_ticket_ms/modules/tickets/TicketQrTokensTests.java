package com.se113.movie_ticket_ms.modules.tickets;

import com.se113.movie_ticket_ms.modules.tickets.infrastructure.TicketQrTokens;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.HexFormat;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class TicketQrTokensTests {
    @Test void recoversOriginalTokenAndRejectsMissingKeyTamperingAndHashMismatch() throws Exception {
        byte[] key = new byte[32], iv = new byte[12];
        byte[] token = "test-ticket-secret".getBytes(StandardCharsets.UTF_8);
        var cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(128, iv));
        cipher.updateAAD("v1".getBytes(StandardCharsets.UTF_8));
        byte[] encrypted = cipher.doFinal(token);
        byte[] packed = ByteBuffer.allocate(iv.length + encrypted.length).put(iv).put(encrypted).array();
        String hash = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token));
        var qr = new TicketQrTokens("{\"v1\":\"" + Base64.getEncoder().encodeToString(key) + "\"}");
        assertEquals("test-ticket-secret", qr.recover(packed, "v1", hash));
        assertNull(qr.recover(packed, "v2", hash));
        assertNull(new TicketQrTokens("").recover(packed, "v1", hash));
        assertNull(qr.recover(packed, "v1", "00".repeat(32)));
        packed[packed.length - 1] ^= 1;
        assertNull(qr.recover(packed, "v1", hash));
    }
}
