package com.orbitly.learning;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.orbitly.catalog.CatalogDtos.CourseCard;
import com.orbitly.catalog.CatalogDtos.LessonView;
import com.orbitly.catalog.CourseCatalog;
import com.orbitly.catalog.CourseCatalog.CourseRef;
import com.orbitly.catalog.CourseStatus;
import com.orbitly.catalog.LessonKind;
import com.orbitly.common.security.CurrentUser;
import com.orbitly.common.security.Role;
import com.orbitly.common.web.ApiException;
import com.orbitly.common.web.PageResponse;
import com.orbitly.identity.UserDirectory;
import com.orbitly.learning.LearningDtos.CertificateView;
import com.orbitly.learning.LearningDtos.CompletionResult;
import com.orbitly.learning.LearningDtos.EnrollmentView;
import com.orbitly.learning.LearningDtos.LearnerView;
import com.orbitly.learning.LearningDtos.LearningSummary;
import com.orbitly.learning.LearningDtos.LessonContent;
import com.orbitly.learning.LearningDtos.PlayerLesson;
import com.orbitly.learning.LearningDtos.PlayerSection;
import com.orbitly.learning.LearningDtos.PlayerView;
import com.orbitly.learning.LearningDtos.Progress;
import com.orbitly.learning.LearningEntities.Enrollment;
import com.orbitly.learning.LearningEntities.LessonProgress;

@Service
class LearningService {

	private final EnrollmentRepository enrollments;

	private final LessonProgressRepository progress;

	private final Enrollments enrollmentApi;

	private final CourseCatalog catalog;

	private final UserDirectory directory;

	private final Clock clock;

	LearningService(EnrollmentRepository enrollments, LessonProgressRepository progress, Enrollments enrollmentApi,
			CourseCatalog catalog, UserDirectory directory, Clock clock) {
		this.enrollments = enrollments;
		this.progress = progress;
		this.enrollmentApi = enrollmentApi;
		this.catalog = catalog;
		this.directory = directory;
		this.clock = clock;
	}

	// ---- Enrolling ------------------------------------------------------------------------------------------

	/** Self-enrollment in a free, published course. Paid courses go through checkout. */
	@Transactional
	EnrollmentView enroll(CurrentUser me, UUID courseId) {
		CourseRef course = catalog.course(me.orgId(), courseId)
			.filter(c -> c.status() == CourseStatus.PUBLISHED)
			.orElseThrow(() -> ApiException.notFound("Course"));
		if (!course.isFree() && !enrollmentApi.isEnrolled(me.userId(), courseId)) {
			throw new ApiException(HttpStatus.PAYMENT_REQUIRED, "payment_required",
					"This course is paid. Start a checkout to enroll.");
		}
		UUID id = enrollmentApi.enroll(me.orgId(), me.userId(), courseId, EnrollmentSource.FREE);
		return views(me.orgId(), List.of(enrollments.findById(id).orElseThrow())).get(0);
	}

	@Transactional(readOnly = true)
	List<EnrollmentView> myEnrollments(CurrentUser me, EnrollmentStatus status) {
		return views(me.orgId(), enrollments.findForUser(me.orgId(), me.userId(), status));
	}

	@Transactional(readOnly = true)
	LearningSummary summary(CurrentUser me) {
		var all = enrollments.findForUser(me.orgId(), me.userId(), null);
		var views = views(me.orgId(), all);
		int completed = (int) views.stream().filter(v -> v.status() == EnrollmentStatus.COMPLETED).count();
		Instant weekAgo = clock.instant().minus(Duration.ofDays(7));
		return new LearningSummary(views.size() - completed, completed,
				progress.completedSince(me.orgId(), me.userId(), weekAgo),
				progress.completedMinutes(me.orgId(), me.userId()),
				views.stream().filter(v -> v.status() == EnrollmentStatus.ACTIVE).limit(3).toList());
	}

	// ---- Player ---------------------------------------------------------------------------------------------

	@Transactional(readOnly = true)
	PlayerView player(CurrentUser me, UUID courseId) {
		CourseRef course = accessibleCourse(me, courseId);
		var enrollment = enrollments.findByUserIdAndCourseId(me.userId(), courseId).orElse(null);
		Set<UUID> done = completedLessonIds(me.userId(), courseId);
		var curriculum = catalog.curriculumWithContent(courseId);

		List<PlayerSection> sections = curriculum.stream()
			.map(s -> new PlayerSection(s.id(), s.title(), s.position(),
					s.lessons()
						.stream()
						.map(l -> new PlayerLesson(l.id(), l.title(), l.kind(), l.position(), l.durationMinutes(),
								done.contains(l.id())))
						.toList()))
			.toList();
		List<UUID> ordered = curriculum.stream().flatMap(s -> s.lessons().stream()).map(LessonView::id).toList();
		UUID resume = ordered.stream().filter(id -> !done.contains(id)).findFirst().orElse(ordered.isEmpty() ? null : ordered.get(0));
		if (enrollment != null && enrollment.getLastLessonId() != null && !done.contains(enrollment.getLastLessonId())
				&& ordered.contains(enrollment.getLastLessonId())) {
			resume = enrollment.getLastLessonId();
		}
		int doneCount = (int) ordered.stream().filter(done::contains).count();
		CourseCard card = catalog.cards(me.orgId(), List.of(courseId)).get(0);
		return new PlayerView(card, enrollment == null ? null : enrollment.getId(),
				enrollment == null ? null : enrollment.getStatus(), Progress.of(doneCount, ordered.size()), resume,
				sections, enrollment == null, enrollment == null ? null : enrollment.getCertificateCode());
	}

	@Transactional
	LessonContent lesson(CurrentUser me, UUID lessonId) {
		var ref = catalog.lesson(me.orgId(), lessonId).orElseThrow(() -> ApiException.notFound("Lesson"));
		accessibleCourse(me, ref.courseId());
		List<LessonView> ordered = catalog.curriculumWithContent(ref.courseId())
			.stream()
			.flatMap(s -> s.lessons().stream())
			.toList();
		int index = -1;
		for (int i = 0; i < ordered.size(); i++) {
			if (ordered.get(i).id().equals(lessonId)) {
				index = i;
			}
		}
		LessonView lesson = ordered.get(index);
		var p = progress.findByUserIdAndLessonId(me.userId(), lessonId).orElse(null);
		enrollments.findByUserIdAndCourseId(me.userId(), ref.courseId()).ifPresent(e -> {
			e.setLastLessonId(lessonId);
			e.setLastAccessedAt(clock.instant());
		});
		return new LessonContent(lesson.id(), ref.courseId(), lesson.sectionId(), lesson.title(), lesson.kind(),
				lesson.durationMinutes(), lesson.content(), p != null && p.getCompletedAt() != null,
				p == null ? 0 : p.getPositionSeconds(), index > 0 ? ordered.get(index - 1).id() : null,
				index < ordered.size() - 1 ? ordered.get(index + 1).id() : null);
	}

	/** Manual completion for videos and readings. Quizzes and assignments complete through assessment. */
	@Transactional
	CompletionResult complete(CurrentUser me, UUID lessonId) {
		var ref = catalog.lesson(me.orgId(), lessonId).orElseThrow(() -> ApiException.notFound("Lesson"));
		if (ref.kind() == LessonKind.QUIZ || ref.kind() == LessonKind.ASSIGNMENT) {
			throw ApiException.badRequest("Quizzes and assignments are completed by submitting them");
		}
		requireEnrolled(me, ref.courseId());
		var state = enrollmentApi.completeLesson(me.orgId(), me.userId(), lessonId).orElseThrow();
		return new CompletionResult(lessonId, true, Progress.of(state.completed(), state.total()), state.status(),
				state.certificateCode());
	}

	@Transactional
	CompletionResult uncomplete(CurrentUser me, UUID lessonId) {
		var ref = catalog.lesson(me.orgId(), lessonId).orElseThrow(() -> ApiException.notFound("Lesson"));
		if (ref.kind() == LessonKind.QUIZ || ref.kind() == LessonKind.ASSIGNMENT) {
			throw ApiException.badRequest("Quiz and assignment completion can't be undone");
		}
		Enrollment e = requireEnrolled(me, ref.courseId());
		progress.findByUserIdAndLessonId(me.userId(), lessonId).ifPresent(p -> p.setCompletedAt(null));
		progress.flush();
		int total = catalog.course(me.orgId(), ref.courseId()).map(CourseRef::lessonCount).orElse(0);
		int done = enrollmentApi.completedCount(me.userId(), ref.courseId());
		return new CompletionResult(lessonId, false, Progress.of(done, total), e.getStatus(), e.getCertificateCode());
	}

	/** Saves the video resume position. */
	@Transactional
	void savePosition(CurrentUser me, UUID lessonId, int seconds) {
		var ref = catalog.lesson(me.orgId(), lessonId).orElseThrow(() -> ApiException.notFound("Lesson"));
		requireEnrolled(me, ref.courseId());
		LessonProgress p = progress.findByUserIdAndLessonId(me.userId(), lessonId)
			.orElseGet(() -> progress.save(new LessonProgress(me.orgId(), me.userId(), ref.courseId(), lessonId)));
		p.setPositionSeconds(seconds);
	}

	// ---- Staff: learners ------------------------------------------------------------------------------------

	@Transactional(readOnly = true)
	PageResponse<LearnerView> learners(CurrentUser me, UUID courseId, int page, int size) {
		CourseRef course = staffCourse(me, courseId);
		var result = enrollments.findForCourse(me.orgId(), courseId, PageRequest.of(page, Math.min(size, 100)));
		var userIds = result.getContent().stream().map(Enrollment::getUserId).toList();
		var people = directory.people(userIds);
		Map<UUID, Long> done = new HashMap<>();
		if (!userIds.isEmpty()) {
			progress.completedCountsByLearner(courseId, userIds).forEach(r -> done.put((UUID) r[0], (Long) r[1]));
		}
		return PageResponse.of(result, e -> {
			var p = people.get(e.getUserId());
			return new LearnerView(e.getId(), e.getUserId(), p == null ? null : p.fullName(),
					p == null ? null : p.email(), p == null ? null : p.avatarUrl(), e.getStatus(), e.getSource(),
					Progress.of(done.getOrDefault(e.getUserId(), 0L).intValue(), course.lessonCount()), e.getCreatedAt(),
					e.getLastAccessedAt(), e.getCompletedAt());
		});
	}

	/** Staff enroll members directly (e.g. a required course), free of charge. */
	@Transactional
	int assign(CurrentUser me, UUID courseId, List<UUID> userIds) {
		CourseRef course = staffCourse(me, courseId);
		if (course.status() == CourseStatus.DRAFT) {
			throw ApiException.badRequest("Publish the course before enrolling learners");
		}
		int added = 0;
		for (UUID userId : new HashSet<>(userIds)) {
			if (directory.activeRole(me.orgId(), userId).isEmpty()) {
				throw ApiException.badRequest("Not an active member: " + userId);
			}
			if (!enrollmentApi.isEnrolled(userId, courseId)) {
				enrollmentApi.enroll(me.orgId(), userId, courseId, EnrollmentSource.ASSIGNED);
				added++;
			}
		}
		return added;
	}

	@Transactional
	void unenroll(CurrentUser me, UUID enrollmentId) {
		Enrollment e = enrollments.findByIdAndOrgId(enrollmentId, me.orgId())
			.orElseThrow(() -> ApiException.notFound("Enrollment"));
		staffCourse(me, e.getCourseId());
		enrollments.delete(e);
		catalog.recordEnrollment(e.getCourseId(), -1);
	}

	// ---- Certificates ---------------------------------------------------------------------------------------

	@Transactional(readOnly = true)
	CertificateView certificate(String code) {
		Enrollment e = enrollments.findByCertificateCode(code.trim().toUpperCase())
			.orElseThrow(() -> ApiException.notFound("Certificate"));
		var course = catalog.course(e.getOrgId(), e.getCourseId()).orElseThrow(() -> ApiException.notFound("Course"));
		var learner = directory.person(e.getUserId()).orElseThrow(() -> ApiException.notFound("Learner"));
		var org = directory.org(e.getOrgId()).orElseThrow(() -> ApiException.notFound("Organization"));
		return new CertificateView(code, learner.fullName(), course.title(), org.name(), e.getCompletedAt());
	}

	// ---- Helpers --------------------------------------------------------------------------------------------

	private List<EnrollmentView> views(UUID orgId, List<Enrollment> list) {
		if (list.isEmpty()) {
			return List.of();
		}
		List<UUID> courseIds = list.stream().map(Enrollment::getCourseId).toList();
		Map<UUID, CourseCard> cards = catalog.cards(orgId, courseIds)
			.stream()
			.collect(Collectors.toMap(CourseCard::id, c -> c));
		Map<UUID, Long> done = new HashMap<>();
		progress.completedCounts(list.get(0).getUserId(), courseIds).forEach(r -> done.put((UUID) r[0], (Long) r[1]));
		List<EnrollmentView> out = new ArrayList<>();
		for (Enrollment e : list) {
			CourseCard card = cards.get(e.getCourseId());
			if (card == null) {
				continue;
			}
			out.add(new EnrollmentView(e.getId(), card, e.getStatus(), e.getSource(),
					Progress.of(done.getOrDefault(e.getCourseId(), 0L).intValue(), card.lessonCount()),
					e.getLastLessonId(), e.getLastAccessedAt(), e.getCreatedAt(), e.getCompletedAt(),
					e.getCertificateCode()));
		}
		return out;
	}

	private Set<UUID> completedLessonIds(UUID userId, UUID courseId) {
		return progress.findByUserIdAndCourseId(userId, courseId)
			.stream()
			.filter(p -> p.getCompletedAt() != null)
			.map(LessonProgress::getLessonId)
			.collect(Collectors.toSet());
	}

	private CourseRef accessibleCourse(CurrentUser me, UUID courseId) {
		CourseRef course = catalog.course(me.orgId(), courseId).orElseThrow(() -> ApiException.notFound("Course"));
		if (!enrollmentApi.canAccess(me, course)) {
			throw ApiException.forbidden("Enroll in this course to open its lessons");
		}
		return course;
	}

	private Enrollment requireEnrolled(CurrentUser me, UUID courseId) {
		return enrollments.findByUserIdAndCourseId(me.userId(), courseId)
			.filter(e -> e.getOrgId().equals(me.orgId()))
			.orElseThrow(() -> ApiException.forbidden("You're not enrolled in this course"));
	}

	private CourseRef staffCourse(CurrentUser me, UUID courseId) {
		CourseRef course = catalog.course(me.orgId(), courseId).orElseThrow(() -> ApiException.notFound("Course"));
		if (!me.is(Role.ADMIN) && !course.instructorId().equals(me.userId())) {
			throw ApiException.forbidden("Only this course's instructor or an admin can do that");
		}
		return course;
	}
}
