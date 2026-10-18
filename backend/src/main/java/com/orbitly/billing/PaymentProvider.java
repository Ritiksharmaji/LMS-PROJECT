package com.orbitly.billing;

/**
 * A hosted-checkout payment provider. Card details are entered on the provider's page, never sent to this API.
 */
interface PaymentProvider {

	String name();

	/** Creates a hosted checkout for the order and returns where to send the buyer. */
	CheckoutSession createCheckout(CheckoutRequest request);

	/** Refunds a paid order in full. */
	void refund(Order order);

	record CheckoutRequest(Order order, String courseTitle, String buyerEmail, String successUrl, String cancelUrl) {
	}

	record CheckoutSession(String sessionId, String url) {
	}
}
