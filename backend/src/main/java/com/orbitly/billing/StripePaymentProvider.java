package com.orbitly.billing;

import java.util.Locale;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import com.orbitly.common.web.ApiException;

import tools.jackson.databind.JsonNode;

/** Stripe Checkout over Stripe's REST API (form-encoded requests, JSON responses). */
@Component
@ConditionalOnProperty(prefix = "orbitly.billing", name = "provider", havingValue = "stripe")
class StripePaymentProvider implements PaymentProvider {

	static final String NAME = "stripe";

	private final RestClient http;

	StripePaymentProvider(BillingProperties properties) {
		String key = properties.stripe().secretKey();
		if (key == null || key.isBlank()) {
			throw new IllegalStateException("orbitly.billing.stripe.secret-key is required when provider=stripe");
		}
		this.http = RestClient.builder()
			.baseUrl(properties.stripe().apiBase())
			.defaultHeader("Authorization", "Bearer " + key)
			.build();
	}

	@Override
	public String name() {
		return NAME;
	}

	@Override
	public CheckoutSession createCheckout(CheckoutRequest req) {
		Order order = req.order();
		MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
		form.add("mode", "payment");
		form.add("success_url", req.successUrl());
		form.add("cancel_url", req.cancelUrl());
		form.add("client_reference_id", order.getId().toString());
		form.add("metadata[orderId]", order.getId().toString());
		if (req.buyerEmail() != null) {
			form.add("customer_email", req.buyerEmail());
		}
		form.add("line_items[0][quantity]", "1");
		form.add("line_items[0][price_data][currency]", order.getCurrency().toLowerCase(Locale.ROOT));
		form.add("line_items[0][price_data][unit_amount]", Integer.toString(order.getAmountCents()));
		form.add("line_items[0][price_data][product_data][name]", req.courseTitle());
		JsonNode session = post("/v1/checkout/sessions", form);
		return new CheckoutSession(session.path("id").asString(), session.path("url").asString());
	}

	@Override
	public void refund(Order order) {
		if (order.getProviderPaymentId() == null) {
			throw ApiException.conflict("This order has no Stripe payment to refund");
		}
		MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
		form.add("payment_intent", order.getProviderPaymentId());
		post("/v1/refunds", form);
	}

	private JsonNode post(String path, MultiValueMap<String, String> form) {
		try {
			return http.post().uri(path).contentType(MediaType.APPLICATION_FORM_URLENCODED).body(form).retrieve().body(JsonNode.class);
		}
		catch (RestClientResponseException ex) {
			throw new ApiException(org.springframework.http.HttpStatus.BAD_GATEWAY, "payment_provider_error",
					"The payment provider rejected the request (" + ex.getStatusCode().value() + ")");
		}
	}
}
