package com.orbitly.billing;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/**
 * Verifies the {@code Stripe-Signature} header: {@code t=<unix seconds>,v1=<hex HMAC-SHA256 of "t.payload">}.
 */
final class StripeSignature {

	static final Duration TOLERANCE = Duration.ofMinutes(5);

	private StripeSignature() {
	}

	static boolean verify(String payload, String header, String secret, Instant now) {
		if (header == null || secret == null || secret.isBlank()) {
			return false;
		}
		String timestamp = null;
		var signatures = new java.util.ArrayList<String>();
		for (String part : header.split(",")) {
			String[] kv = part.trim().split("=", 2);
			if (kv.length != 2) {
				continue;
			}
			if (kv[0].equals("t")) {
				timestamp = kv[1];
			}
			else if (kv[0].equals("v1")) {
				signatures.add(kv[1]);
			}
		}
		if (timestamp == null || signatures.isEmpty()) {
			return false;
		}
		long t;
		try {
			t = Long.parseLong(timestamp);
		}
		catch (NumberFormatException ex) {
			return false;
		}
		if (Duration.between(Instant.ofEpochSecond(t), now).abs().compareTo(TOLERANCE) > 0) {
			return false;
		}
		byte[] expected = sign(timestamp + "." + payload, secret).getBytes(StandardCharsets.UTF_8);
		return signatures.stream()
			.anyMatch(sig -> MessageDigest.isEqual(expected, sig.getBytes(StandardCharsets.UTF_8)));
	}

	static String sign(String signedPayload, String secret) {
		try {
			Mac mac = Mac.getInstance("HmacSHA256");
			mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
			return HexFormat.of().formatHex(mac.doFinal(signedPayload.getBytes(StandardCharsets.UTF_8)));
		}
		catch (Exception ex) {
			throw new IllegalStateException(ex);
		}
	}
}
