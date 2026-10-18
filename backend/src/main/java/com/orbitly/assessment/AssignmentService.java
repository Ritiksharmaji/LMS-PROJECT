package com.orbitly.assessment;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.orbitly.assessment.AssessmentDtos.AssignmentEditorView;
import com.orbitly.assessment.AssessmentDtos.AssignmentView;
import com.orbitly.assessment.AssessmentDtos.GradeRequest;
import com.orbitly.assessment.AssessmentDtos.SaveAssignmentRequest;
import com.orbitly.assessment.AssessmentDtos.SubmissionView;
import com.orbitly.assessment.AssessmentDtos.SubmitAssignmentRequest;
import com.orbitly.assessment.AssessmentEntities.Assignment;
import com.orbitly.assessment.AssessmentEntities.Submission;
import com.orbitly.assessment.AssessmentEntities.SubmissionStatus;
import com.orbitly.catalog.CourseCatalog;
import com.orbitly.catalog.CourseCatalog.CourseRef;
import com.orbitly.catalog.LessonKind;
import com.orbitly.common.security.CurrentUser;
import com.orbitly.common.security.Role;
import com.orbitly.common.web.ApiException;
import com.orbitly.identity.UserDirectory;
import com.orbitly.learning.Enrollments;

@Service
class AssignmentService {

	private final AssignmentRepository assignments;

	private final SubmissionRepository submissions;

	private final AssessmentAccess access;

	private final Enrollments enrollments;

	private final CourseCatalog catalog;

	private final UserDirectory directory;

	private final ApplicationEventPublisher events;

	private final Clock clock;

	AssignmentService(AssignmentRepository assignments, SubmissionRepository submissions, AssessmentAccess access,
			Enrollments enrollments, CourseCatalog catalog, UserDirectory directory, ApplicationEventPublisher events,
			Clock clock) {
		this.assignments = assignments;
		this.submissions = submissions;
		this.access = access;
		this.enrollments = enrollments;
		this.catalog = catalog;
		this.directory = directory;
		this.events = events;
		this.clock = clock;
	}

	// ---- Authoring ------------------------------------------------------------------------------------------

	@Transactional
	AssignmentEditorView save(CurrentUser me, UUID lessonId, SaveAssignmentRequest req) {
		var lesson = access.staffLesson(me, lessonId, LessonKind.ASSIGNMENT);
		Assignment a = assignments.findByLessonIdAndOrgId(lessonId, me.orgId())
			.orElseGet(() -> assignments.save(new Assignment(me.orgId(), lesson.courseId(), lessonId)));
		a.setInstructions(req.instructions());
		a.setDueAt(req.dueAt());
		if (req.maxPoints() != null) {
			a.setMaxPoints(req.maxPoints());
		}
		if (req.allowLate() != null) {
			a.setAllowLate(req.allowLate());
		}
		return editor(a);
	}

	@Transactional(readOnly = true)
	AssignmentEditorView editorView(CurrentUser me, UUID lessonId) {
		access.staffLesson(me, lessonId, LessonKind.ASSIGNMENT);
		return editor(assignments.findByLessonIdAndOrgId(lessonId, me.orgId())
			.orElseThrow(() -> ApiException.notFound("Assignment")));
	}

	private static AssignmentEditorView editor(Assignment a) {
		return new AssignmentEditorView(a.getId(), a.getLessonId(), a.getCourseId(), a.getInstructions(), a.getDueAt(),
				a.getMaxPoints(), a.isAllowLate());
	}

	// ---- Learners -------------------------------------------------------------------------------------------

	@Transactional(readOnly = true)
	AssignmentView learnerView(CurrentUser me, UUID lessonId) {
		access.accessibleLesson(me, lessonId, LessonKind.ASSIGNMENT);
		Assignment a = assignments.findByLessonIdAndOrgId(lessonId, me.orgId())
			.orElseThrow(() -> ApiException.notFound("Assignment"));
		SubmissionView mine = submissions.findByAssignmentIdAndUserId(a.getId(), me.userId())
			.map(s -> view(s, a, null, null))
			.orElse(null);
		return new AssignmentView(a.getId(), lessonId, a.getInstructions(), a.getDueAt(), a.getMaxPoints(),
				a.isAllowLate(), mine);
	}

	/** Submits work once. Only a submission the instructor returned can be submitted again. */
	@Transactional
	SubmissionView submit(CurrentUser me, UUID lessonId, SubmitAssignmentRequest req) {
		var lesson = access.accessibleLesson(me, lessonId, LessonKind.ASSIGNMENT);
		if (!enrollments.isEnrolled(me.userId(), lesson.courseId())) {
			throw ApiException.forbidden("Only enrolled learners can submit work");
		}
		Assignment a = assignments.findByLessonIdAndOrgId(lessonId, me.orgId())
			.orElseThrow(() -> ApiException.notFound("Assignment"));
		if (isBlank(req.body()) && isBlank(req.linkUrl()) && isBlank(req.fileKey())) {
			throw ApiException.badRequest("Add a file, a link or a written answer");
		}
		Instant now = clock.instant();
		boolean late = a.getDueAt() != null && now.isAfter(a.getDueAt());
		if (late && !a.isAllowLate()) {
			throw ApiException.conflict("The deadline has passed and late work isn't accepted");
		}
		Submission s = submissions.findByAssignmentIdAndUserId(a.getId(), me.userId()).orElse(null);
		if (s != null && s.getStatus() != SubmissionStatus.RETURNED) {
			throw ApiException.conflict("You've already submitted this assignment");
		}
		if (s == null) {
			s = new Submission(me.orgId(), a.getId(), a.getCourseId(), me.userId());
		}
		s.setStatus(SubmissionStatus.SUBMITTED);
		s.setBody(blankToNull(req.body()));
		s.setLinkUrl(blankToNull(req.linkUrl()));
		s.setFileKey(blankToNull(req.fileKey()));
		s.setFileName(blankToNull(req.fileName()));
		s.setSubmittedAt(now);
		s.setLate(late);
		s.setPoints(null);
		s.setGradedAt(null);
		s.setGradedBy(null);
		s = submissions.save(s);

		enrollments.completeLesson(me.orgId(), me.userId(), lessonId);
		CourseRef course = catalog.course(me.orgId(), a.getCourseId()).orElseThrow();
		events.publishEvent(new AssessmentEvents.AssignmentSubmitted(me.orgId(), s.getId(), me.userId(),
				a.getCourseId(), lessonId, course.instructorId(), late));
		return view(s, a, null, null);
	}

	// ---- Grading --------------------------------------------------------------------------------------------

	/** Ungraded submissions in the courses the caller teaches (admins: every course), oldest first. */
	@Transactional(readOnly = true)
	List<SubmissionView> queue(CurrentUser me, UUID courseId) {
		List<UUID> courseIds;
		if (courseId != null) {
			access.staffCourse(me, courseId);
			courseIds = List.of(courseId);
		}
		else {
			courseIds = catalog.managedBy(me.orgId(), me.is(Role.ADMIN) ? null : me.userId())
				.stream()
				.map(CourseRef::id)
				.toList();
		}
		if (courseIds.isEmpty()) {
			return List.of();
		}
		return views(me.orgId(), submissions.queue(me.orgId(), SubmissionStatus.SUBMITTED, courseIds));
	}

	@Transactional(readOnly = true)
	SubmissionView get(CurrentUser me, UUID submissionId) {
		Submission s = staffSubmission(me, submissionId);
		return views(me.orgId(), List.of(s)).get(0);
	}

	@Transactional
	SubmissionView grade(CurrentUser me, UUID submissionId, GradeRequest req) {
		Submission s = staffSubmission(me, submissionId);
		Assignment a = assignments.findById(s.getAssignmentId()).orElseThrow();
		if (req.points() > a.getMaxPoints()) {
			throw ApiException.badRequest("Points can't exceed " + a.getMaxPoints());
		}
		s.setStatus(SubmissionStatus.GRADED);
		s.setPoints(req.points());
		s.setFeedback(blankToNull(req.feedback()));
		s.setGradedBy(me.userId());
		s.setGradedAt(clock.instant());
		events.publishEvent(new AssessmentEvents.SubmissionGraded(me.orgId(), s.getId(), s.getUserId(), s.getCourseId(),
				a.getLessonId(), false, req.points(), a.getMaxPoints()));
		return views(me.orgId(), List.of(s)).get(0);
	}

	/** Sends work back for another try, with feedback. */
	@Transactional
	SubmissionView returnForRevision(CurrentUser me, UUID submissionId, String feedback) {
		Submission s = staffSubmission(me, submissionId);
		Assignment a = assignments.findById(s.getAssignmentId()).orElseThrow();
		s.setStatus(SubmissionStatus.RETURNED);
		s.setPoints(null);
		s.setFeedback(feedback.trim());
		s.setGradedBy(me.userId());
		s.setGradedAt(clock.instant());
		events.publishEvent(new AssessmentEvents.SubmissionGraded(me.orgId(), s.getId(), s.getUserId(), s.getCourseId(),
				a.getLessonId(), true, null, a.getMaxPoints()));
		return views(me.orgId(), List.of(s)).get(0);
	}

	private Submission staffSubmission(CurrentUser me, UUID submissionId) {
		Submission s = submissions.findByIdAndOrgId(submissionId, me.orgId())
			.orElseThrow(() -> ApiException.notFound("Submission"));
		access.staffCourse(me, s.getCourseId());
		return s;
	}

	// ---- Views ----------------------------------------------------------------------------------------------

	private List<SubmissionView> views(UUID orgId, List<Submission> list) {
		if (list.isEmpty()) {
			return List.of();
		}
		Map<UUID, Assignment> byId = assignments
			.findAllById(list.stream().map(Submission::getAssignmentId).distinct().toList())
			.stream()
			.collect(Collectors.toMap(Assignment::getId, Function.identity()));
		var people = directory.people(list.stream().map(Submission::getUserId).distinct().toList());
		var courses = catalog.courses(orgId, list.stream().map(Submission::getCourseId).distinct().toList());
		return list.stream().map(s -> {
			Assignment a = byId.get(s.getAssignmentId());
			var person = people.get(s.getUserId());
			var lesson = catalog.lesson(orgId, a.getLessonId()).orElse(null);
			var course = courses.get(s.getCourseId());
			return view(s, a, person, lesson == null ? null : lesson.title(), course == null ? null : course.title());
		}).toList();
	}

	private static SubmissionView view(Submission s, Assignment a, UserDirectory.Person person, String lessonTitle) {
		return view(s, a, person, lessonTitle, null);
	}

	private static SubmissionView view(Submission s, Assignment a, UserDirectory.Person person, String lessonTitle,
			String courseTitle) {
		return new SubmissionView(s.getId(), a.getId(), a.getLessonId(), s.getCourseId(), s.getUserId(),
				person == null ? null : person.fullName(), person == null ? null : person.avatarUrl(), s.getStatus(),
				s.getBody(), s.getLinkUrl(), s.getFileKey(), s.getFileName(), s.getSubmittedAt(), s.isLate(),
				s.getPoints(), a.getMaxPoints(), s.getFeedback(), s.getGradedAt(), lessonTitle, courseTitle);
	}

	private static boolean isBlank(String s) {
		return s == null || s.isBlank();
	}

	private static String blankToNull(String s) {
		return isBlank(s) ? null : s.trim();
	}
}
