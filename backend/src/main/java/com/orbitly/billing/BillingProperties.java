package com.orbitly.billing;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * {@code provider} is {@code test} (no real money; pay through {@code /api/me/orders/{id}/test-pay}) or
 * {@code stripe}.
 */
@ConfigurationProperties(prefix = "orbitly.billing")
record BillingProperties(String provider, Duration refundWindow, Stripe stripe) {

	BillingProperties {
		if (provider == null || provider.isBlank()) {
			provider = "test";
		}
		if (refundWindow == null) {
			refundWindow = Duration.ofDays(30);
		}
		if (stripe == null) {
			stripe = new Stripe(null, null, null);
		}
	}

	record Stripe(String secretKey, String webhookSecret, String apiBase) {

		Stripe {
			if (apiBase == null || apiBase.isBlank()) {
				apiBase = "https://api.stripe.com";
			}
		}
	}
}
