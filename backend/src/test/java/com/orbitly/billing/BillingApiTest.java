package com.orbitly.billing;

import static com.orbitly.support.Api.read;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.orbitly.support.Api;
import com.orbitly.support.IntegrationTest;

@IntegrationTest
class BillingApiTest {

	@Autowired
	Api api;

	@Autowired
	MockMvc mvc;

	@Autowired
	OrderRepository orders;

	@Test
	void buyingACourseEnrollsTheLearner() throws Exception {
		var admin = api.newOrg();
		var student = api.member(admin, "STUDENT");
		var course = api.publishedCourse(admin, "Intro to ML", 4999);

		var checkout = api.post("/api/me/checkout", Map.of("courseId", course.id().toString()), student)
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.provider").value("test"));
		String orderId = read(checkout, "$.orderId");
		api.get("/api/me/orders/" + orderId, student)
			.andExpect(jsonPath("$.status").value("PENDING"))
			.andExpect(jsonPath("$.amountCents").value(4999));
		api.get("/api/me/courses/" + course.id() + "/player", student).andExpect(status().isForbidden());

		api.post("/api/me/orders/" + orderId + "/test-pay", null, student)
			.andExpect(jsonPath("$.status").value("PAID"))
			.andExpect(jsonPath("$.refundable").value(true));
		api.get("/api/me/enrollments", student).andExpect(jsonPath("$[0].source").value("PURCHASE"));
		api.post("/api/me/checkout", Map.of("courseId", course.id().toString()), student)
			.andExpect(status().isConflict());

		api.get("/api/admin/orders?status=PAID", admin).andExpect(jsonPath("$.total").value(1));
		api.get("/api/admin/revenue", admin)
			.andExpect(jsonPath("$.paid[0].currency").value("USD"))
			.andExpect(jsonPath("$.paid[0].amountCents").value(4999));
	}

	@Test
	void freeCoursesDontNeedCheckoutAndStaffEnrollFree() throws Exception {
		var admin = api.newOrg();
		var instructor = api.member(admin, "INSTRUCTOR");
		var free = api.publishedCourse(admin, "Free", 0);
		var paid = api.publishedCourse(admin, "Paid", 2999);
		api.post("/api/me/checkout", Map.of("courseId", free.id().toString()), instructor)
			.andExpect(status().isBadRequest());
		api.post("/api/me/enrollments", Map.of("courseId", paid.id().toString()), instructor)
			.andExpect(status().isCreated());
	}

	@Test
	void learnersRefundWithinThirtyDays() throws Exception {
		var admin = api.newOrg();
		var student = api.member(admin, "STUDENT");
		var course = api.publishedCourse(admin, "Refund me", 1999);
		String orderId = read(api.post("/api/me/checkout", Map.of("courseId", course.id().toString()), student),
				"$.orderId");
		api.post("/api/me/orders/" + orderId + "/test-pay", null, student);

		api.post("/api/me/orders/" + orderId + "/refund", null, student)
			.andExpect(jsonPath("$.status").value("REFUNDED"));
		api.get("/api/me/enrollments", student).andExpect(jsonPath("$.length()").value(0));
		api.post("/api/me/orders/" + orderId + "/refund", null, student).andExpect(status().isConflict());
	}

	@Test
	void theRefundWindowCloses() throws Exception {
		var admin = api.newOrg();
		var student = api.member(admin, "STUDENT");
		var course = api.publishedCourse(admin, "Old purchase", 1999);
		String orderId = read(api.post("/api/me/checkout", Map.of("courseId", course.id().toString()), student),
				"$.orderId");
		api.post("/api/me/orders/" + orderId + "/test-pay", null, student);
		var order = orders.findById(UUID.fromString(orderId)).orElseThrow();
		order.setPaidAt(Instant.now().minus(40, ChronoUnit.DAYS));
		orders.save(order);

		api.post("/api/me/orders/" + orderId + "/refund", null, student)
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("refund_window_closed"));
		// Admins can still refund.
		api.post("/api/admin/orders/" + orderId + "/refund", null, admin)
			.andExpect(jsonPath("$.status").value("REFUNDED"));
	}

	@Test
	void signedStripeWebhooksMarkOrdersPaidOnce() throws Exception {
		var admin = api.newOrg();
		var student = api.member(admin, "STUDENT");
		var course = api.publishedCourse(admin, "Webhook", 2500);
		String orderId = read(api.post("/api/me/checkout", Map.of("courseId", course.id().toString()), student),
				"$.orderId");
		String sessionId = orders.findById(UUID.fromString(orderId)).orElseThrow().getProviderSessionId();

		String payload = "{\"type\":\"checkout.session.completed\",\"data\":{\"object\":{\"id\":\"" + sessionId
				+ "\",\"payment_status\":\"paid\",\"payment_intent\":\"pi_123\"}}}";
		long t = Instant.now().getEpochSecond();
		String good = "t=" + t + ",v1=" + com.orbitly.common.security.WebhookSignatures.sign(t + "." + payload, "whsec_test_secret");

		mvc.perform(post("/api/webhooks/stripe").contentType(MediaType.APPLICATION_JSON)
			.content(payload)
			.header("Stripe-Signature", "t=" + t + ",v1=deadbeef")).andExpect(status().isBadRequest());
		for (int i = 0; i < 2; i++) {
			mvc.perform(post("/api/webhooks/stripe").contentType(MediaType.APPLICATION_JSON)
				.content(payload)
				.header("Stripe-Signature", good)).andExpect(status().isOk());
		}

		api.get("/api/me/orders/" + orderId, student).andExpect(jsonPath("$.status").value("PAID"));
		api.get("/api/public/organizations/" + admin.orgSlug() + "/courses/" + course.slug(), null)
			.andExpect(jsonPath("$.course.enrollmentCount").value(1));
	}

	@Test
	void ordersArePrivate() throws Exception {
		var admin = api.newOrg();
		var s1 = api.member(admin, "STUDENT");
		var s2 = api.member(admin, "STUDENT");
		var course = api.publishedCourse(admin, "Private", 999);
		String orderId = read(api.post("/api/me/checkout", Map.of("courseId", course.id().toString()), s1), "$.orderId");
		api.get("/api/me/orders/" + orderId, s2).andExpect(status().isNotFound());
		api.post("/api/me/orders/" + orderId + "/test-pay", null, s2).andExpect(status().isNotFound());
		api.get("/api/admin/orders", s1).andExpect(status().isForbidden());
	}

	@Test
	void signatureCheckRejectsOldTimestamps() {
		String payload = "{}";
		long old = Instant.now().minus(10, ChronoUnit.MINUTES).getEpochSecond();
		String header = "t=" + old + ",v1=" + com.orbitly.common.security.WebhookSignatures.sign(old + "." + payload, "s");
		org.assertj.core.api.Assertions.assertThat(com.orbitly.common.security.WebhookSignatures.verify(payload, header, "s", Instant.now())).isFalse();
	}
}
