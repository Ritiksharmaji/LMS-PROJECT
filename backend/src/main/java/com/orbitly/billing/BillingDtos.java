package com.orbitly.billing;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.NotNull;

public final class BillingDtos {

	private BillingDtos() {
	}

	public record CheckoutRequest(@NotNull UUID courseId) {
	}

	/** Send the browser to {@code checkoutUrl}; it comes back to {@code /checkout/{orderId}/success}. */
	public record CheckoutResponse(UUID orderId, String checkoutUrl, String provider) {
	}

	public record OrderView(UUID id, UUID courseId, String courseTitle, String courseSlug, UUID userId,
			String buyerName, String buyerEmail, int amountCents, String currency, Order.Status status,
			String provider, Instant createdAt, Instant paidAt, Instant refundedAt, boolean refundable) {
	}

	public record RevenueTotal(String currency, long amountCents, long orders) {
	}

	public record RevenueSummary(Instant since, List<RevenueTotal> paid, List<RevenueTotal> refunded) {
	}
}
