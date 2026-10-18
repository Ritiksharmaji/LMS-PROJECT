package com.orbitly.assessment;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.orbitly.learning.Enrollments;

/** Assessment's public API for reminders: work coming due, and who hasn't done it yet. */
@Service
public class AssessmentDeadlines {

	public record DueItem(UUID orgId, UUID courseId, UUID lessonId, boolean quiz, UUID itemId, Instant dueAt) {
	}

	private final QuizRepository quizzes;

	private final QuizAttemptRepository attempts;

	private final AssignmentRepository assignments;

	private final SubmissionRepository submissions;

	private final Enrollments enrollments;

	AssessmentDeadlines(QuizRepository quizzes, QuizAttemptRepository attempts, AssignmentRepository assignments,
			SubmissionRepository submissions, Enrollments enrollments) {
		this.quizzes = quizzes;
		this.attempts = attempts;
		this.assignments = assignments;
		this.submissions = submissions;
		this.enrollments = enrollments;
	}

	@Transactional(readOnly = true)
	public List<DueItem> dueBetween(Instant from, Instant to) {
		List<DueItem> out = new ArrayList<>();
		quizzes.findByDueAtBetween(from, to)
			.forEach(q -> out.add(new DueItem(q.getOrgId(), q.getCourseId(), q.getLessonId(), true, q.getId(), q.getDueAt())));
		assignments.findByDueAtBetween(from, to)
			.forEach(a -> out.add(new DueItem(a.getOrgId(), a.getCourseId(), a.getLessonId(), false, a.getId(), a.getDueAt())));
		return out;
	}

	/** Enrolled learners who haven't passed the quiz / submitted the assignment. */
	@Transactional(readOnly = true)
	public List<UUID> pendingLearners(DueItem item) {
		var done = new HashSet<>(item.quiz() ? attempts.passedUserIds(item.itemId()) : submissions.submittedUserIds(item.itemId()));
		return enrollments.learnerIds(item.courseId()).stream().filter(id -> !done.contains(id)).toList();
	}
}
