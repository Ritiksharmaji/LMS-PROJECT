package com.orbitly.assessment;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

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

final class AssessmentEntities {

	private AssessmentEntities() {
	}

	enum QuestionKind {
		SINGLE, MULTIPLE
	}

	enum SubmissionStatus {
		SUBMITTED, GRADED, RETURNED
	}

	@Getter
	@Setter
	@Entity(name = "Quiz")
	@Table(name = "quizzes")
	@NoArgsConstructor(access = AccessLevel.PROTECTED)
	static class Quiz extends TenantEntity {

		@Column(nullable = false)
		private UUID courseId;

		@Column(nullable = false, unique = true)
		private UUID lessonId;

		private int passPercent = 70;

		private Integer maxAttempts;

		private Instant dueAt;

		Quiz(UUID orgId, UUID courseId, UUID lessonId) {
			setOrgId(orgId);
			this.courseId = courseId;
			this.lessonId = lessonId;
		}
	}

	@Getter
	@Setter
	@Entity(name = "QuizQuestion")
	@Table(name = "quiz_questions")
	@NoArgsConstructor(access = AccessLevel.PROTECTED)
	static class QuizQuestion extends TenantEntity {

		@Column(nullable = false)
		private UUID quizId;

		private int position;

		@Column(nullable = false)
		private String prompt;

		@Enumerated(EnumType.STRING)
		@Column(nullable = false)
		private QuestionKind kind;

		@JdbcTypeCode(SqlTypes.ARRAY)
		@Column(nullable = false, columnDefinition = "text[]")
		private List<String> options = new ArrayList<>();

		@JdbcTypeCode(SqlTypes.ARRAY)
		@Column(nullable = false, columnDefinition = "integer[]")
		private List<Integer> correct = new ArrayList<>();

		private String explanation;

		private int points = 1;

		QuizQuestion(UUID orgId, UUID quizId, int position) {
			setOrgId(orgId);
			this.quizId = quizId;
			this.position = position;
		}
	}

	@Getter
	@Entity(name = "QuizAttempt")
	@Table(name = "quiz_attempts")
	@NoArgsConstructor(access = AccessLevel.PROTECTED)
	static class QuizAttempt extends TenantEntity {

		@Column(nullable = false)
		private UUID quizId;

		@Column(nullable = false)
		private UUID userId;

		private int score;

		private int maxScore;

		private int percent;

		private boolean passed;

		QuizAttempt(UUID orgId, UUID quizId, UUID userId, int score, int maxScore, int percent, boolean passed) {
			setOrgId(orgId);
			this.quizId = quizId;
			this.userId = userId;
			this.score = score;
			this.maxScore = maxScore;
			this.percent = percent;
			this.passed = passed;
		}
	}

	@Getter
	@Entity(name = "QuizAnswer")
	@Table(name = "quiz_answers")
	@NoArgsConstructor(access = AccessLevel.PROTECTED)
	static class QuizAnswer extends TenantEntity {

		@Column(nullable = false)
		private UUID attemptId;

		@Column(nullable = false)
		private UUID questionId;

		@JdbcTypeCode(SqlTypes.ARRAY)
		@Column(nullable = false, columnDefinition = "integer[]")
		private List<Integer> selected = new ArrayList<>();

		private boolean correct;

		QuizAnswer(UUID orgId, UUID attemptId, UUID questionId, List<Integer> selected, boolean correct) {
			setOrgId(orgId);
			this.attemptId = attemptId;
			this.questionId = questionId;
			this.selected = new ArrayList<>(selected);
			this.correct = correct;
		}
	}

	@Getter
	@Setter
	@Entity(name = "Assignment")
	@Table(name = "assignments")
	@NoArgsConstructor(access = AccessLevel.PROTECTED)
	static class Assignment extends TenantEntity {

		@Column(nullable = false)
		private UUID courseId;

		@Column(nullable = false, unique = true)
		private UUID lessonId;

		private String instructions;

		private Instant dueAt;

		private int maxPoints = 100;

		private boolean allowLate = true;

		Assignment(UUID orgId, UUID courseId, UUID lessonId) {
			setOrgId(orgId);
			this.courseId = courseId;
			this.lessonId = lessonId;
		}
	}

	@Getter
	@Setter
	@Entity(name = "Submission")
	@Table(name = "submissions")
	@NoArgsConstructor(access = AccessLevel.PROTECTED)
	static class Submission extends TenantEntity {

		@Column(nullable = false)
		private UUID assignmentId;

		@Column(nullable = false)
		private UUID courseId;

		@Column(nullable = false)
		private UUID userId;

		@Enumerated(EnumType.STRING)
		@Column(nullable = false)
		private SubmissionStatus status = SubmissionStatus.SUBMITTED;

		private String body;

		private String linkUrl;

		private String fileKey;

		private String fileName;

		@Column(nullable = false)
		private Instant submittedAt;

		private boolean late;

		private Integer points;

		private String feedback;

		private UUID gradedBy;

		private Instant gradedAt;

		Submission(UUID orgId, UUID assignmentId, UUID courseId, UUID userId) {
			setOrgId(orgId);
			this.assignmentId = assignmentId;
			this.courseId = courseId;
			this.userId = userId;
		}
	}
}
