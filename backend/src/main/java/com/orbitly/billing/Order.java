package com.orbitly.billing;

import java.time.Instant;
import java.util.UUID;

import com.orbitly.common.persistence.TenantEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** One attempt to buy one course. */
@Getter
@Setter
@Entity(name = "CourseOrder")
@Table(name = "orders")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class Order extends TenantEntity {

	enum Status {
		PENDING, PAID, FAILED, CANCELLED, REFUNDED
	}

	@Column(nullable = false)
	private UUID userId;

	@Column(nullable = false)
	private UUID courseId;

	private int amountCents;

	@Column(nullable = false)
	private String currency;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private Status status = Status.PENDING;

	@Column(nullable = false)
	private String provider;

	private String providerSessionId;

	private String providerPaymentId;

	private Instant paidAt;

	private Instant refundedAt;

	Order(UUID orgId, UUID userId, UUID courseId, int amountCents, String currency, String provider) {
		setOrgId(orgId);
		this.userId = userId;
		this.courseId = courseId;
		this.amountCents = amountCents;
		this.currency = currency;
		this.provider = provider;
	}
}
