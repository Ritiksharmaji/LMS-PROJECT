package com.orbitly.billing;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface OrderRepository extends JpaRepository<Order, UUID> {

	Optional<Order> findByIdAndOrgId(UUID id, UUID orgId);

	Optional<Order> findByProviderSessionId(String providerSessionId);

	List<Order> findByOrgIdAndUserIdOrderByCreatedAtDesc(UUID orgId, UUID userId);

	List<Order> findByUserIdAndCourseIdAndStatus(UUID userId, UUID courseId, Order.Status status);

	@Query("select o from CourseOrder o where o.orgId = :orgId and (:status is null or o.status = :status) "
			+ "order by o.createdAt desc")
	Page<Order> search(@Param("orgId") UUID orgId, @Param("status") Order.Status status, Pageable pageable);

	@Query("select o.currency, coalesce(sum(o.amountCents), 0), count(o) from CourseOrder o "
			+ "where o.orgId = :orgId and o.status = :status and o.paidAt >= :since group by o.currency")
	List<Object[]> totals(@Param("orgId") UUID orgId, @Param("status") Order.Status status,
			@Param("since") Instant since);
}
