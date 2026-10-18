package com.orbitly.assessment;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.orbitly.assessment.AssessmentEntities.QuestionKind;
import com.orbitly.assessment.AssessmentEntities.SubmissionStatus;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class AssessmentDtos {

	private AssessmentDtos() {
	}

	// ---- Authoring requests ---------------------------------------------------------------------------------

	public record QuestionInput(@NotBlank @Size(max = 2000) String prompt, @NotNull QuestionKind kind,
			@NotNull @Size(min = 2, max = 10) List<@NotBlank @Size(max = 500) String> options,
			@NotNull @Size(min = 1, max = 10) List<@NotNull @Min(0) Integer> correct,
			@Size(max = 2000) String explanation, @Min(1) @Max(100) Integer points) {
	}

	/** Saving a quiz replaces its questions. Existing attempts keep their recorded scores. */
	public record SaveQuizRequest(@Min(0) @Max(100) Integer passPercent, @Min(1) @Max(100) Integer maxAttempts,
			Instant dueAt, @NotEmpty @Size(max = 100) @Valid List<QuestionInput> questions) {
	}

	public record SaveAssignmentRequest(@Size(max = 20000) String instructions, Instant dueAt,
			@Min(1) @Max(1000) Integer maxPoints, Boolean allowLate) {
	}

	// ---- Learner requests -----------------------------------------------------------------------------------

	/** {@code answers} maps question id → selected option indexes. */
	public record SubmitQuizRequest(@NotNull Map<UUID, List<Integer>> answers) {
	}

	/** {@code fileId} is a SUBMISSION file uploaded through {@code /api/me/uploads} for this course. */
	public record SubmitAssignmentRequest(@Size(max = 20000) String body, @Size(max = 1000) String linkUrl,
			UUID fileId) {
	}

	// ---- Grading requests -----------------------------------------------------------------------------------

	public record GradeRequest(@NotNull @Min(0) Integer points, @Size(max = 10000) String feedback) {
	}

	public record ReturnRequest(@NotBlank @Size(max = 10000) String feedback) {
	}

	// ---- Responses ------------------------------------------------------------------------------------------

	public record QuestionEditorView(UUID id, int position, String prompt, QuestionKind kind, List<String> options,
			List<Integer> correct, String explanation, int points) {
	}

	public record QuizEditorView(UUID id, UUID lessonId, UUID courseId, int passPercent, Integer maxAttempts,
			Instant dueAt, List<QuestionEditorView> questions) {
	}

	/** A question as learners see it before submitting: no correct answers. */
	public record QuestionView(UUID id, int position, String prompt, QuestionKind kind, List<String> options,
			int points) {
	}

	public record AttemptSummary(UUID id, int score, int maxScore, int percent, boolean passed, Instant submittedAt) {
	}

	public record QuizView(UUID id, UUID lessonId, int passPercent, Integer maxAttempts, Integer attemptsLeft,
			Instant dueAt, List<QuestionView> questions, List<AttemptSummary> attempts, boolean passed) {
	}

	public record QuestionResult(UUID questionId, List<Integer> selected, List<Integer> correctOptions,
			boolean correct, String explanation) {
	}

	public record AttemptResult(AttemptSummary attempt, List<QuestionResult> questions, Integer attemptsLeft,
			boolean lessonCompleted) {
	}

	public record AssignmentEditorView(UUID id, UUID lessonId, UUID courseId, String instructions, Instant dueAt,
			int maxPoints, boolean allowLate) {
	}

	public record SubmissionView(UUID id, UUID assignmentId, UUID lessonId, UUID courseId, UUID userId,
			String learnerName, String learnerAvatarUrl, SubmissionStatus status, String body, String linkUrl,
			UUID fileId, String fileName, Instant submittedAt, boolean late, Integer points, int maxPoints,
			String feedback, Instant gradedAt, String lessonTitle, String courseTitle) {
	}

	public record AssignmentView(UUID id, UUID lessonId, String instructions, Instant dueAt, int maxPoints,
			boolean allowLate, SubmissionView submission) {
	}

	public enum DeadlineKind {
		QUIZ, ASSIGNMENT
	}

	public record Deadline(DeadlineKind kind, UUID lessonId, String title, UUID courseId, String courseTitle,
			String courseHue, Instant dueAt, boolean overdue) {
	}

	/** A gradebook column: one quiz or assignment, in curriculum order. */
	public record GradeColumn(UUID lessonId, String title, DeadlineKind kind, int maxPoints, Instant dueAt) {
	}

	/**
	 * One cell. Quizzes: best {@code percent}. Assignments: {@code points} once graded, with the submission status.
	 */
	public record GradeCell(UUID lessonId, Integer percent, Integer points, String status) {
	}

	public record GradeRow(UUID userId, String fullName, String email, String avatarUrl, List<GradeCell> cells,
			Integer averagePercent) {
	}

	public record Gradebook(UUID courseId, String courseTitle, List<GradeColumn> columns, List<GradeRow> rows,
			Integer classAveragePercent) {
	}

	public record MyGrade(UUID courseId, String courseTitle, UUID lessonId, String title, DeadlineKind kind,
			Integer percent, Integer points, Integer maxPoints, String status, String feedback, Instant at) {
	}
}
