package com.orbitly.learning;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.orbitly.learning.LearningEntities.Enrollment;
import com.orbitly.learning.LearningEntities.LessonProgress;
import com.orbitly.learning.LearningEntities.Review;

interface EnrollmentRepository extends JpaRepository<Enrollment, UUID> {

	Optional<Enrollment> findByUserIdAndCourseId(UUID userId, UUID courseId);

	Optional<Enrollment> findByIdAndOrgId(UUID id, UUID orgId);

	boolean existsByUserIdAndCourseId(UUID userId, UUID courseId);

	Optional<Enrollment> findByCertificateCode(String certificateCode);

	@Query("select e from Enrollment e where e.orgId = :orgId and e.userId = :userId "
			+ "and (:status is null or e.status = :status) order by coalesce(e.lastAccessedAt, e.createdAt) desc")
	List<Enrollment> findForUser(@Param("orgId") UUID orgId, @Param("userId") UUID userId,
			@Param("status") EnrollmentStatus status);

	@Query("select e from Enrollment e where e.orgId = :orgId and e.courseId = :courseId order by e.createdAt desc")
	Page<Enrollment> findForCourse(@Param("orgId") UUID orgId, @Param("courseId") UUID courseId, Pageable pageable);

	@Query("select e.userId from Enrollment e where e.courseId = :courseId")
	List<UUID> learnerIds(@Param("courseId") UUID courseId);
}

interface LessonProgressRepository extends JpaRepository<LessonProgress, UUID> {

	Optional<LessonProgress> findByUserIdAndLessonId(UUID userId, UUID lessonId);

	List<LessonProgress> findByUserIdAndCourseId(UUID userId, UUID courseId);

	/** Completed lesson ids per course, restricted to lessons that still exist. */
	@Query("select p.courseId, count(p) from LessonProgress p, Lesson l where l.id = p.lessonId "
			+ "and p.userId = :userId and p.courseId in :courseIds and p.completedAt is not null group by p.courseId")
	List<Object[]> completedCounts(@Param("userId") UUID userId, @Param("courseIds") Collection<UUID> courseIds);

	@Query("select p.userId, count(p) from LessonProgress p, Lesson l where l.id = p.lessonId "
			+ "and p.courseId = :courseId and p.userId in :userIds and p.completedAt is not null group by p.userId")
	List<Object[]> completedCountsByLearner(@Param("courseId") UUID courseId, @Param("userIds") Collection<UUID> userIds);

	@Query("select count(p) from LessonProgress p where p.userId = :userId and p.orgId = :orgId "
			+ "and p.completedAt >= :since")
	long completedSince(@Param("orgId") UUID orgId, @Param("userId") UUID userId, @Param("since") Instant since);

	@Query("select coalesce(sum(l.durationMinutes), 0) from LessonProgress p, Lesson l where l.id = p.lessonId "
			+ "and p.userId = :userId and p.orgId = :orgId and p.completedAt is not null")
	long completedMinutes(@Param("orgId") UUID orgId, @Param("userId") UUID userId);
}

interface ReviewRepository extends JpaRepository<Review, UUID> {

	Optional<Review> findByCourseIdAndUserId(UUID courseId, UUID userId);

	Page<Review> findByCourseIdOrderByCreatedAtDesc(UUID courseId, Pageable pageable);

	@Query("select coalesce(avg(r.rating), 0), count(r) from Review r where r.courseId = :courseId")
	List<Object[]> stats(@Param("courseId") UUID courseId);

	@Query("select r.rating, count(r) from Review r where r.courseId = :courseId group by r.rating")
	List<Object[]> histogram(@Param("courseId") UUID courseId);
}
