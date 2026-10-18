package com.orbitly.assessment;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.orbitly.assessment.AssessmentDtos.Deadline;
import com.orbitly.assessment.AssessmentDtos.DeadlineKind;
import com.orbitly.assessment.AssessmentDtos.GradeCell;
import com.orbitly.assessment.AssessmentDtos.GradeColumn;
import com.orbitly.assessment.AssessmentDtos.GradeRow;
import com.orbitly.assessment.AssessmentDtos.Gradebook;
import com.orbitly.assessment.AssessmentDtos.MyGrade;
import com.orbitly.assessment.AssessmentEntities.Assignment;
import com.orbitly.assessment.AssessmentEntities.Quiz;
import com.orbitly.assessment.AssessmentEntities.Submission;
import com.orbitly.assessment.AssessmentEntities.SubmissionStatus;
import com.orbitly.catalog.CourseCatalog;
import com.orbitly.catalog.CourseCatalog.CourseRef;
import com.orbitly.catalog.CourseCatalog.LessonRef;
import com.orbitly.common.security.CurrentUser;
import com.orbitly.identity.UserDirectory;
import com.orbitly.learning.Enrollments;

@Service
class GradebookService {

	/** Overdue work stays on the deadlines list for this long. */
	private static final Duration OVERDUE_WINDOW = Duration.ofDays(14);

	private final QuizRepository quizzes;

	private final QuizAttemptRepository attempts;

	private final AssignmentRepository assignments;

	private final SubmissionRepository submissions;

	private final AssessmentAccess access;

	private final Enrollments enrollments;

	private final CourseCatalog catalog;

	private final UserDirectory directory;

	private final Clock clock;

	GradebookService(QuizRepository quizzes, QuizAttemptRepository attempts, AssignmentRepository assignments,
			SubmissionRepository submissions, AssessmentAccess access, Enrollments enrollments, CourseCatalog catalog,
			UserDirectory directory, Clock clock) {
		this.quizzes = quizzes;
		this.attempts = attempts;
		this.assignments = assignments;
		this.submissions = submissions;
		this.access = access;
		this.enrollments = enrollments;
		this.catalog = catalog;
		this.directory = directory;
		this.clock = clock;
	}

	@Transactional(readOnly = true)
	Gradebook gradebook(CurrentUser me, UUID courseId) {
		CourseRef course = access.staffCourse(me, courseId);
		Map<UUID, Quiz> quizByLesson = quizzes.findByCourseId(courseId)
			.stream()
			.collect(Collectors.toMap(Quiz::getLessonId, Function.identity()));
		Map<UUID, Assignment> assignmentByLesson = assignments.findByCourseId(courseId)
			.stream()
			.collect(Collectors.toMap(Assignment::getLessonId, Function.identity()));

		List<GradeColumn> columns = new ArrayList<>();
		for (LessonRef l : catalog.lessons(me.orgId(), courseId)) {
			if (quizByLesson.containsKey(l.id())) {
				columns.add(new GradeColumn(l.id(), l.title(), DeadlineKind.QUIZ, 100, quizByLesson.get(l.id()).getDueAt()));
			}
			else if (assignmentByLesson.containsKey(l.id())) {
				Assignment a = assignmentByLesson.get(l.id());
				columns.add(new GradeColumn(l.id(), l.title(), DeadlineKind.ASSIGNMENT, a.getMaxPoints(), a.getDueAt()));
			}
		}

		// best quiz percent per (quiz, user)
		Map<UUID, Map<UUID, Integer>> bestPercent = new HashMap<>();
		if (!quizByLesson.isEmpty()) {
			attempts.bestByQuizAndUser(quizByLesson.values().stream().map(Quiz::getId).toList())
				.forEach(r -> bestPercent.computeIfAbsent((UUID) r[0], k -> new HashMap<>())
					.put((UUID) r[1], ((Number) r[2]).intValue()));
		}
		Map<UUID, Map<UUID, Submission>> subs = new HashMap<>();
		if (!assignmentByLesson.isEmpty()) {
			submissions.findByAssignmentIdIn(assignmentByLesson.values().stream().map(Assignment::getId).toList())
				.forEach(s -> subs.computeIfAbsent(s.getAssignmentId(), k -> new HashMap<>()).put(s.getUserId(), s));
		}

		List<UUID> learnerIds = enrollments.learnerIds(courseId);
		var people = directory.people(learnerIds);
		List<GradeRow> rows = new ArrayList<>();
		for (UUID userId : learnerIds) {
			List<GradeCell> cells = new ArrayList<>();
			List<Integer> percents = new ArrayList<>();
			for (GradeColumn col : columns) {
				if (col.kind() == DeadlineKind.QUIZ) {
					Integer pct = bestPercent.getOrDefault(quizByLesson.get(col.lessonId()).getId(), Map.of()).get(userId);
					cells.add(new GradeCell(col.lessonId(), pct, null, pct == null ? "NOT_STARTED" : "ATTEMPTED"));
					if (pct != null) {
						percents.add(pct);
					}
				}
				else {
					Assignment a = assignmentByLesson.get(col.lessonId());
					Submission s = subs.getOrDefault(a.getId(), Map.of()).get(userId);
					if (s == null) {
						cells.add(new GradeCell(col.lessonId(), null, null, "MISSING"));
					}
					else {
						Integer pct = s.getPoints() == null ? null : Math.round(s.getPoints() * 100f / a.getMaxPoints());
						cells.add(new GradeCell(col.lessonId(), pct, s.getPoints(), s.getStatus().name()));
						if (pct != null) {
							percents.add(pct);
						}
					}
				}
			}
			var p = people.get(userId);
			rows.add(new GradeRow(userId, p == null ? null : p.fullName(), p == null ? null : p.email(),
					p == null ? null : p.avatarUrl(), cells, average(percents)));
		}
		rows.sort(Comparator.comparing(r -> r.fullName() == null ? "" : r.fullName()));
		return new Gradebook(courseId, course.title(), columns, rows,
				average(rows.stream().map(GradeRow::averagePercent).filter(x -> x != null).toList()));
	}

	/** Upcoming (and recently overdue) quizzes and assignments the learner still has to do. */
	@Transactional(readOnly = true)
	List<Deadline> deadlines(CurrentUser me) {
		List<UUID> courseIds = enrollments.courseIds(me.orgId(), me.userId());
		if (courseIds.isEmpty()) {
			return List.of();
		}
		Instant now = clock.instant();
		Instant cutoff = now.minus(OVERDUE_WINDOW);
		Map<UUID, CourseRef> courses = catalog.courses(me.orgId(), courseIds);

		List<Quiz> qs = quizzes.findByCourseIdIn(courseIds).stream().filter(q -> q.getDueAt() != null).toList();
		Set<UUID> passed = qs.isEmpty() ? Set.of()
				: new HashSet<>(attempts.passedQuizIds(me.userId(), qs.stream().map(Quiz::getId).toList()));
		List<Assignment> as = assignments.findByCourseIdIn(courseIds).stream().filter(a -> a.getDueAt() != null).toList();
		Map<UUID, Submission> mine = as.isEmpty() ? Map.of()
				: submissions.findByUserIdAndAssignmentIdIn(me.userId(), as.stream().map(Assignment::getId).toList())
					.stream()
					.collect(Collectors.toMap(Submission::getAssignmentId, Function.identity()));

		List<Deadline> out = new ArrayList<>();
		for (Quiz q : qs) {
			if (!passed.contains(q.getId()) && q.getDueAt().isAfter(cutoff)) {
				out.add(deadline(me, DeadlineKind.QUIZ, q.getLessonId(), q.getCourseId(), q.getDueAt(), courses, now));
			}
		}
		for (Assignment a : as) {
			Submission s = mine.get(a.getId());
			boolean open = s == null || s.getStatus() == SubmissionStatus.RETURNED;
			if (open && a.getDueAt().isAfter(cutoff)) {
				out.add(deadline(me, DeadlineKind.ASSIGNMENT, a.getLessonId(), a.getCourseId(), a.getDueAt(), courses, now));
			}
		}
		out.sort(Comparator.comparing(Deadline::dueAt));
		return out;
	}

	@Transactional(readOnly = true)
	List<MyGrade> myGrades(CurrentUser me) {
		List<UUID> courseIds = enrollments.courseIds(me.orgId(), me.userId());
		if (courseIds.isEmpty()) {
			return List.of();
		}
		Map<UUID, CourseRef> courses = catalog.courses(me.orgId(), courseIds);
		List<MyGrade> out = new ArrayList<>();

		List<Quiz> qs = quizzes.findByCourseIdIn(courseIds);
		for (Quiz q : qs) {
			var mine = attempts.findByQuizIdAndUserIdOrderByCreatedAtDesc(q.getId(), me.userId());
			if (mine.isEmpty()) {
				continue;
			}
			var best = mine.stream().max(Comparator.comparingInt(a -> a.getPercent())).get();
			var lesson = catalog.lesson(me.orgId(), q.getLessonId()).orElse(null);
			out.add(new MyGrade(q.getCourseId(), title(courses, q.getCourseId()), q.getLessonId(),
					lesson == null ? null : lesson.title(), DeadlineKind.QUIZ, best.getPercent(), null, null,
					best.isPassed() ? "PASSED" : "NOT_PASSED", null, mine.get(0).getCreatedAt()));
		}
		List<Assignment> as = assignments.findByCourseIdIn(courseIds);
		if (!as.isEmpty()) {
			Map<UUID, Assignment> byId = as.stream().collect(Collectors.toMap(Assignment::getId, Function.identity()));
			for (Submission s : submissions.findByUserIdAndAssignmentIdIn(me.userId(), byId.keySet())) {
				Assignment a = byId.get(s.getAssignmentId());
				var lesson = catalog.lesson(me.orgId(), a.getLessonId()).orElse(null);
				Integer pct = s.getPoints() == null ? null : Math.round(s.getPoints() * 100f / a.getMaxPoints());
				out.add(new MyGrade(a.getCourseId(), title(courses, a.getCourseId()), a.getLessonId(),
						lesson == null ? null : lesson.title(), DeadlineKind.ASSIGNMENT, pct, s.getPoints(),
						a.getMaxPoints(), s.getStatus().name(), s.getFeedback(),
						s.getGradedAt() != null ? s.getGradedAt() : s.getSubmittedAt()));
			}
		}
		out.sort(Comparator.comparing(MyGrade::at).reversed());
		return out;
	}

	private Deadline deadline(CurrentUser me, DeadlineKind kind, UUID lessonId, UUID courseId, Instant dueAt,
			Map<UUID, CourseRef> courses, Instant now) {
		var lesson = catalog.lesson(me.orgId(), lessonId).orElse(null);
		CourseRef c = courses.get(courseId);
		return new Deadline(kind, lessonId, lesson == null ? null : lesson.title(), courseId, c == null ? null : c.title(),
				c == null ? null : c.hue(), dueAt, dueAt.isBefore(now));
	}

	private static String title(Map<UUID, CourseRef> courses, UUID id) {
		CourseRef c = courses.get(id);
		return c == null ? null : c.title();
	}

	private static Integer average(List<Integer> values) {
		return values.isEmpty() ? null
				: (int) Math.round(values.stream().mapToInt(Integer::intValue).average().orElse(0));
	}
}
