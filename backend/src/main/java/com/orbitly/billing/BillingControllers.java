package com.orbitly.billing;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.orbitly.billing.BillingDtos.CheckoutRequest;
import com.orbitly.billing.BillingDtos.CheckoutResponse;
import com.orbitly.billing.BillingDtos.OrderView;
import com.orbitly.billing.BillingDtos.RevenueSummary;
import com.orbitly.common.security.CurrentUser;
import com.orbitly.common.web.PageResponse;

import jakarta.validation.Valid;

final class BillingControllers {

	private BillingControllers() {
	}

	@RestController
	@RequestMapping("/api/me")
	static class MyBillingController {

		private final BillingService billing;

		MyBillingController(BillingService billing) {
			this.billing = billing;
		}

		@PostMapping("/checkout")
		@ResponseStatus(HttpStatus.CREATED)
		CheckoutResponse checkout(@Valid @RequestBody CheckoutRequest req) {
			return billing.checkout(CurrentUser.get(), req.courseId());
		}

		@GetMapping("/orders")
		List<OrderView> orders() {
			return billing.myOrders(CurrentUser.get());
		}

		@GetMapping("/orders/{id}")
		OrderView order(@PathVariable UUID id) {
			return billing.myOrderView(CurrentUser.get(), id);
		}

		@PostMapping("/orders/{id}/refund")
		OrderView refund(@PathVariable UUID id) {
			return billing.requestRefund(CurrentUser.get(), id);
		}

		@PostMapping("/orders/{id}/test-pay")
		OrderView testPay(@PathVariable UUID id) {
			return billing.testPay(CurrentUser.get(), id);
		}
	}

	@RestController
	@RequestMapping("/api/admin")
	static class AdminBillingController {

		private final BillingService billing;

		AdminBillingController(BillingService billing) {
			this.billing = billing;
		}

		@GetMapping("/orders")
		PageResponse<OrderView> orders(@RequestParam(required = false) Order.Status status,
				@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "25") int size) {
			return billing.adminOrders(CurrentUser.get(), status, page, size);
		}

		@PostMapping("/orders/{id}/refund")
		OrderView refund(@PathVariable UUID id) {
			return billing.adminRefund(CurrentUser.get(), id);
		}

		@GetMapping("/revenue")
		RevenueSummary revenue(@RequestParam(defaultValue = "30") int days) {
			return billing.revenue(CurrentUser.get(), days);
		}
	}

	@RestController
	@RequestMapping("/api/webhooks")
	static class WebhookController {

		private final BillingService billing;

		WebhookController(BillingService billing) {
			this.billing = billing;
		}

		/** Stripe needs the raw body to check the signature. */
		@PostMapping("/stripe")
		void stripe(@RequestBody String payload, @RequestHeader(name = "Stripe-Signature", required = false) String sig) {
			billing.handleStripeWebhook(payload, sig);
		}
	}
}
