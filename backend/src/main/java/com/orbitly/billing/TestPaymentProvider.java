package com.orbitly.billing;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import com.orbitly.common.config.OrbitlyProperties;

/** Local development provider: no money moves. The frontend's test checkout page calls {@code test-pay}. */
@Component
@ConditionalOnProperty(prefix = "orbitly.billing", name = "provider", havingValue = "test", matchIfMissing = true)
class TestPaymentProvider implements PaymentProvider {

	static final String NAME = "test";

	private final OrbitlyProperties properties;

	TestPaymentProvider(OrbitlyProperties properties) {
		this.properties = properties;
	}

	@Override
	public String name() {
		return NAME;
	}

	@Override
	public CheckoutSession createCheckout(CheckoutRequest request) {
		String id = "test_" + request.order().getId();
		return new CheckoutSession(id, properties.appUrl() + "/checkout/test/" + request.order().getId());
	}

	@Override
	public void refund(Order order) {
		// nothing to call
	}
}
