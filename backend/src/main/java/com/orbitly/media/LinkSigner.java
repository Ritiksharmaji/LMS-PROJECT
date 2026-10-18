package com.orbitly.media;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.util.Base64;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.stereotype.Component;

import com.orbitly.common.config.OrbitlyProperties;

/** HMAC signatures for local-storage links: {@code method|key|expiry}. */
@Component
class LinkSigner {

	private final byte[] secret;

	private final Clock clock;

	LinkSigner(MediaProperties media, OrbitlyProperties app, Clock clock) {
		String s = media.linkSecret() != null && !media.linkSecret().isBlank() ? media.linkSecret()
				: app.jwt().secret() + ":media-links";
		this.secret = s.getBytes(StandardCharsets.UTF_8);
		this.clock = clock;
	}

	String sign(String method, String key, long exp) {
		try {
			Mac mac = Mac.getInstance("HmacSHA256");
			mac.init(new SecretKeySpec(secret, "HmacSHA256"));
			byte[] raw = mac.doFinal((method + "|" + key + "|" + exp).getBytes(StandardCharsets.UTF_8));
			return Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
		}
		catch (Exception ex) {
			throw new IllegalStateException(ex);
		}
	}

	boolean verify(String method, String key, long exp, String sig) {
		if (sig == null || clock.instant().getEpochSecond() > exp) {
			return false;
		}
		return MessageDigest.isEqual(sign(method, key, exp).getBytes(StandardCharsets.UTF_8),
				sig.getBytes(StandardCharsets.UTF_8));
	}
}
