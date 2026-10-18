package com.orbitly.billing;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.orbitly.billing.BillingDtos.CheckoutResponse;
import com.orbitly.billing.BillingDtos.OrderView;
import com.orbitly.billing.BillingDtos.RevenueSummary;
import com.orbitly.billing.BillingDtos.RevenueTotal;
import com.orbitly.catalog.CourseCatalog;
import com.orbitly.catalog.CourseCatalog.CourseRef;
import com.orbitly.catalog.CourseStatus;
import com.orbitly.common.config.OrbitlyProperties;
import com.orbitly.common.security.CurrentUser;
import com.orbitly.common.web.ApiException;
import com.orbitly.common.web.PageResponse;
import com.orbitly.identity.UserDirectory;
import com.orbitly.learning.EnrollmentSource;
import com.orbitly.learning.Enrollments;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@Service
class BillingService {

	private static final Logger log = LoggerFactory.getLogger(BillingService.class);

	private final OrderRepository orders;

	private final PaymentProvider provider;

	private final BillingProperties billing;

	private final OrbitlyProperties app;

	private final CourseCatalog catalog;

	private final Enrollments enrollments;

	private final UserDirectory directory;

	private final ApplicationEventPublisher events;

	private final JsonMapper json;

	private final Clock clock;

	BillingService(OrderRepository orders, PaymentProvider provider, BillingProperties billing, OrbitlyProperties app,
			CourseCatalog catalog, Enrollments enrollments, UserDirectory directory, ApplicationEventPublisher events,
			JsonMapper json, Clock clock) {
		this.orders = orders;
		this.provider = provider;
		this.billing = billing;
		this.app = app;
		this.catalog = catalog;
		this.enrollments = enrollments;
		this.directory = directory;
		this.events = events;
		this.json = json;
		this.clock = clock;
	}

	// ---- Checkout -------------------------------------------------------------------------------------------

	@Transactional
	CheckoutResponse checkout(CurrentUser me, UUID courseId) {
		CourseRef course = catalog.course(me.orgId(), courseId)
			.filter(c -> c.status() == CourseStatus.PUBLISHED)
			.orElseThrow(() -> ApiException.notFound("Course"));
		if (course.isFree()) {
			throw ApiException.badRequest("This course is free. Enroll directly.");
		}
		if (enrollments.isEnrolled(me.userId(), courseId)) {
			throw ApiException.conflict("You're already enrolled in this course");
		}
		// Abandon earlier unfinished checkouts for the same course.
		orders.findByUserIdAndCourseIdAndStatus(me.userId(), courseId, Order.Status.PENDING)
			.forEach(o -> o.setStatus(Order.Status.CANCELLED));

		Order order = orders.save(new Order(me.orgId(), me.userId(), courseId, course.priceCents(), course.currency(),
				provider.name()));
		String email = directory.person(me.userId()).map(UserDirectory.Person::email).orElse(null);
		String base = app.appUrl() + "/checkout/" + order.getId();
		var session = provider.createCheckout(new PaymentProvider.CheckoutRequest(order, course.title(), email,
				base + "/success", base + "/cancel"));
		order.setProviderSessionId(session.sessionId());
		return new CheckoutResponse(order.getId(), session.url(), provider.name());
	}

	/** Completes a test-provider checkout. Refused for any real provider. */
	@Transactional
	OrderView testPay(CurrentUser me, UUID orderId) {
		if (!TestPaymentProvider.NAME.equals(provider.name())) {
			throw ApiException.notFound("Order");
		}
		Order order = myOrder(me, orderId);
		markPaid(order, "test_payment_" + order.getId());
		return view(order);
	}

	@Transactional(readOnly = true)
	List<OrderView> myOrders(CurrentUser me) {
		return views(me.orgId(), orders.findByOrgIdAndUserIdOrderByCreatedAtDesc(me.orgId(), me.userId()));
	}

	@Transactional(readOnly = true)
	OrderView myOrderView(CurrentUser me, UUID orderId) {
		return view(myOrder(me, orderId));
	}

	// ---- Refunds --------------------------------------------------------------------------------------------

	/** Learners can refund their own purchase within the refund window. */
	@Transactional
	OrderView requestRefund(CurrentUser me, UUID orderId) {
		Order order = myOrder(me, orderId);
		if (order.getStatus() != Order.Status.PAID) {
			throw ApiException.conflict("Only paid orders can be refunded");
		}
		if (Duration.between(order.getPaidAt(), clock.instant()).compareTo(billing.refundWindow()) > 0) {
			throw new ApiException(HttpStatus.CONFLICT, "refund_window_closed",
					"Refunds are available for " + billing.refundWindow().toDays() + " days after purchase");
		}
		refund(order);
		return view(order);
	}

	@Transactional
	OrderView adminRefund(CurrentUser admin, UUID orderId) {
		Order order = orders.findByIdAndOrgId(orderId, admin.orgId()).orElseThrow(() -> ApiException.notFound("Order"));
		if (order.getStatus() != Order.Status.PAID) {
			throw ApiException.conflict("Only paid orders can be refunded");
		}
		refund(order);
		return view(order);
	}

	private void refund(Order order) {
		provider.refund(order);
		order.setStatus(Order.Status.REFUNDED);
		order.setRefundedAt(clock.instant());
		enrollments.revoke(order.getUserId(), order.getCourseId());
		events.publishEvent(new BillingEvents.OrderRefunded(order.getOrgId(), order.getId(), order.getUserId(),
				order.getCourseId(), order.getAmountCents(), order.getCurrency()));
	}

	// ---- Admin ----------------------------------------------------------------------------------------------

	@Transactional(readOnly = true)
	PageResponse<OrderView> adminOrders(CurrentUser admin, Order.Status status, int page, int size) {
		var result = orders.search(admin.orgId(), status, PageRequest.of(page, Math.min(size, 100)));
		var list = views(admin.orgId(), result.getContent());
		return new PageResponse<>(list, result.getNumber(), result.getSize(), result.getTotalElements(),
				result.getTotalPages());
	}

	@Transactional(readOnly = true)
	RevenueSummary revenue(CurrentUser admin, int days) {
		Instant since = clock.instant().minus(Duration.ofDays(Math.max(1, Math.min(days, 3650))));
		List<RevenueTotal> paid = new ArrayList<>();
		orders.totals(admin.orgId(), Order.Status.PAID, since)
			.forEach(r -> paid.add(new RevenueTotal((String) r[0], ((Number) r[1]).longValue(), (Long) r[2])));
		List<RevenueTotal> refunded = new ArrayList<>();
		orders.totals(admin.orgId(), Order.Status.REFUNDED, since)
			.forEach(r -> refunded.add(new RevenueTotal((String) r[0], ((Number) r[1]).longValue(), (Long) r[2])));
		return new RevenueSummary(since, paid, refunded);
	}

	// ---- Stripe webhook -------------------------------------------------------------------------------------

	@Transactional
	void handleStripeWebhook(String payload, String signature) {
		if (!com.orbitly.common.security.WebhookSignatures.verify(payload, signature, billing.stripe().webhookSecret(), clock.instant())) {
			throw ApiException.badRequest("Invalid signature");
		}
		JsonNode event = json.readTree(payload);
		String type = event.path("type").asString();
		JsonNode object = event.path("data").path("object");
		String sessionId = object.path("id").asString();
		switch (type) {
			case "checkout.session.completed", "checkout.session.async_payment_succeeded" -> {
				if ("paid".equals(object.path("payment_status").asString())) {
					orders.findByProviderSessionId(sessionId)
						.ifPresentOrElse(o -> markPaid(o, object.path("payment_intent").asString(null)),
								() -> log.warn("Stripe session {} has no matching order", sessionId));
				}
			}
			case "checkout.session.expired" -> orders.findByProviderSessionId(sessionId)
				.filter(o -> o.getStatus() == Order.Status.PENDING)
				.ifPresent(o -> o.setStatus(Order.Status.CANCELLED));
			case "checkout.session.async_payment_failed" -> orders.findByProviderSessionId(sessionId)
				.filter(o -> o.getStatus() == Order.Status.PENDING)
				.ifPresent(o -> o.setStatus(Order.Status.FAILED));
			default -> log.debug("Ignoring Stripe event {}", type);
		}
	}

	/** Idempotent: webhooks may arrive more than once. */
	private void markPaid(Order order, String paymentId) {
		if (order.getStatus() == Order.Status.PAID || order.getStatus() == Order.Status.REFUNDED) {
			return;
		}
		order.setStatus(Order.Status.PAID);
		order.setPaidAt(clock.instant());
		order.setProviderPaymentId(paymentId);
		enrollments.enroll(order.getOrgId(), order.getUserId(), order.getCourseId(), EnrollmentSource.PURCHASE);
		events.publishEvent(new BillingEvents.OrderPaid(order.getOrgId(), order.getId(), order.getUserId(),
				order.getCourseId(), order.getAmountCents(), order.getCurrency()));
	}

	// ---- Helpers --------------------------------------------------------------------------------------------

	private Order myOrder(CurrentUser me, UUID orderId) {
		return orders.findByIdAndOrgId(orderId, me.orgId())
			.filter(o -> o.getUserId().equals(me.userId()))
			.orElseThrow(() -> ApiException.notFound("Order"));
	}

	private OrderView view(Order o) {
		return views(o.getOrgId(), List.of(o)).get(0);
	}

	private List<OrderView> views(UUID orgId, List<Order> list) {
		if (list.isEmpty()) {
			return List.of();
		}
		var courses = catalog.courses(orgId, list.stream().map(Order::getCourseId).distinct().toList());
		var people = directory.people(list.stream().map(Order::getUserId).distinct().toList());
		Instant now = clock.instant();
		return list.stream().map(o -> {
			var c = courses.get(o.getCourseId());
			var p = people.get(o.getUserId());
			boolean refundable = o.getStatus() == Order.Status.PAID && o.getPaidAt() != null
					&& Duration.between(o.getPaidAt(), now).compareTo(billing.refundWindow()) <= 0;
			return new OrderView(o.getId(), o.getCourseId(), c == null ? null : c.title(), c == null ? null : c.slug(),
					o.getUserId(), p == null ? null : p.fullName(), p == null ? null : p.email(), o.getAmountCents(),
					o.getCurrency(), o.getStatus(), o.getProvider(), o.getCreatedAt(), o.getPaidAt(), o.getRefundedAt(),
					refundable);
		}).toList();
	}
}
