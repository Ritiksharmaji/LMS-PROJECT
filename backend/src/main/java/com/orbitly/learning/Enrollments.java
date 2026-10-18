package com.orbitly.learning;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.orbitly.catalog.CourseCatalog;
import com.orbitly.catalog.CourseCatalog.CourseRef;
import com.orbitly.common.security.CurrentUser;
import com.orbitly.common.security.Role;
import com.orbitly.common.web.ApiException;
import com.orbitly.learning.LearningEntities.Enrollment;
import com.orbitly.learning.LearningEntities.LessonProgress;

/**
 * The learning module's public API: enroll people, check access and record lesson completion. Used by billing
 * (purchases) and assessment (quiz passed, assignment submitted).
 */
@Service
public class Enrollments {

	private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

	private static final SecureRandom RANDOM = new SecureRandom();

	private final EnrollmentRepository enrollments;

	private final LessonProgressRepository progress;

	private final CourseCatalog catalog;

	private final ApplicationEventPublisher events;

	private final Clock clock;

	Enrollments(EnrollmentRepository enrollments, LessonProgressRepository progress, CourseCatalog catalog,
			ApplicationEventPublisher events, Clock clock) {
		this.enrollments = enrollments;
		this.progress = progress;
		this.catalog = catalog;
		this.events = events;
		this.clock = clock;
	}

	@Transactional(readOnly = true)
	public boolean isEnrolled(UUID userId, UUID courseId) {
		return enrollments.existsByUserIdAndCourseId(userId, courseId);
	}

	/** Enrolls the user (idempotent) and returns the enrollment id. */
	@Transactional
	public UUID enroll(UUID orgId, UUID userId, UUID courseId, EnrollmentSource source) {
		var existing = enrollments.findByUserIdAndCourseId(userId, courseId);
		if (existing.isPresent()) {
			return existing.get().getId();
		}
		Enrollment e = enrollments.save(new Enrollment(orgId, userId, courseId, source));
		catalog.recordEnrollment(courseId, 1);
		events.publishEvent(new LearningEvents.EnrollmentCreated(orgId, userId, courseId, source));
		return e.getId();
	}

	/** Course ids the user is enrolled in within the organization. */
	@Transactional(readOnly = true)
	public List<UUID> courseIds(UUID orgId, UUID userId) {
		return enrollments.findForUser(orgId, userId, null).stream().map(Enrollment::getCourseId).toList();
	}

	@Transactional(readOnly = true)
	public List<UUID> learnerIds(UUID courseId) {
		return enrollments.learnerIds(courseId);
	}

	/**
	 * True if the caller may open the course's lessons: enrolled learners, the course's instructor and admins. Drafts
	 * are staff-only.
	 */
	@Transactional(readOnly = true)
	public boolean canAccess(CurrentUser me, CourseRef course) {
		return isStaff(me, course) || (course.status() != com.orbitly.catalog.CourseStatus.DRAFT
				&& enrollments.existsByUserIdAndCourseId(me.userId(), course.id()));
	}

	public static boolean isStaff(CurrentUser me, CourseRef course) {
		return me.is(Role.ADMIN) || course.instructorId().equals(me.userId());
	}

	/**
	 * Marks a lesson complete for an enrolled learner and completes the course when every lesson is done. Returns
	 * empty if the user isn't enrolled (e.g. staff previewing a course).
	 */
	@Transactional
	public Optional<CompletionState> completeLesson(UUID orgId, UUID userId, UUID lessonId) {
		var lesson = catalog.lesson(orgId, lessonId).orElseThrow(() -> ApiException.notFound("Lesson"));
		var enrollment = enrollments.findByUserIdAndCourseId(userId, lesson.courseId());
		if (enrollment.isEmpty()) {
			return Optional.empty();
		}
		Instant now = clock.instant();
		LessonProgress p = progress.findByUserIdAndLessonId(userId, lessonId)
			.orElseGet(() -> new LessonProgress(orgId, userId, lesson.courseId(), lessonId));
		boolean newlyCompleted = p.getCompletedAt() == null;
		if (newlyCompleted) {
			p.setCompletedAt(now);
			progress.save(p);
			events.publishEvent(new LearningEvents.LessonCompleted(orgId, userId, lesson.courseId(), lessonId));
		}
		Enrollment e = enrollment.get();
		e.setLastLessonId(lessonId);
		e.setLastAccessedAt(now);
		return Optional.of(refreshCompletion(e));
	}

	/** Recomputes progress and moves the enrollment to COMPLETED (issuing a certificate) when everything is done. */
	CompletionState refreshCompletion(Enrollment e) {
		progress.flush();
		int total = catalog.course(e.getOrgId(), e.getCourseId()).map(CourseRef::lessonCount).orElse(0);
		int done = completedCount(e.getUserId(), e.getCourseId());
		if (total > 0 && done >= total && e.getStatus() != EnrollmentStatus.COMPLETED) {
			e.setStatus(EnrollmentStatus.COMPLETED);
			e.setCompletedAt(clock.instant());
			if (e.getCertificateCode() == null) {
				e.setCertificateCode(certificateCode());
			}
			events.publishEvent(new LearningEvents.CourseCompleted(e.getOrgId(), e.getUserId(), e.getCourseId(),
					e.getCertificateCode()));
		}
		return new CompletionState(done, total, e.getStatus(), e.getCertificateCode());
	}

	int completedCount(UUID userId, UUID courseId) {
		return progress.completedCounts(userId, List.of(courseId))
			.stream()
			.findFirst()
			.map(r -> ((Long) r[1]).intValue())
			.orElse(0);
	}

	public record CompletionState(int completed, int total, EnrollmentStatus status, String certificateCode) {
	}

	private static String certificateCode() {
		StringBuilder sb = new StringBuilder("ORB-");
		for (int i = 0; i < 10; i++) {
			if (i == 5) {
				sb.append('-');
			}
			sb.append(CODE_ALPHABET.charAt(RANDOM.nextInt(CODE_ALPHABET.length())));
		}
		return sb.toString();
	}
}
