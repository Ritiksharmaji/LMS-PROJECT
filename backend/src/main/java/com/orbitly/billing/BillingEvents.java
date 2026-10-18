package com.orbitly.billing;

import java.util.UUID;

public final class BillingEvents {

	private BillingEvents() {
	}

	public record OrderPaid(UUID orgId, UUID orderId, UUID userId, UUID courseId, int amountCents, String currency) {
	}

	public record OrderRefunded(UUID orgId, UUID orderId, UUID userId, UUID courseId, int amountCents,
			String currency) {
	}
}
