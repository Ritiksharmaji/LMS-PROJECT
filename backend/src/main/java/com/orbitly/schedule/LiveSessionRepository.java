package com.orbitly.schedule;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface LiveSessionRepository extends JpaRepository<LiveSession, UUID> {

	Optional<LiveSession> findByIdAndOrgId(UUID id, UUID orgId);

	/** Sessions overlapping [from, to) in the given courses. */
	@Query("select s from LiveSession s where s.orgId = :orgId and s.courseId in :courseIds "
			+ "and s.startsAt < :to and s.endsAt > :from order by s.startsAt")
	List<LiveSession> inRange(@Param("orgId") UUID orgId, @Param("courseIds") Collection<UUID> courseIds,
			@Param("from") Instant from, @Param("to") Instant to);
}
