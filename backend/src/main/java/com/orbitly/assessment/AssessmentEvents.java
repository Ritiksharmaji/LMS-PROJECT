package com.orbitly.assessment;

import java.util.UUID;

public final class AssessmentEvents {

	private AssessmentEvents() {
	}

	public record QuizSubmitted(UUID orgId, UUID userId, UUID courseId, UUID lessonId, int percent, boolean passed) {
	}

	public record AssignmentSubmitted(UUID orgId, UUID submissionId, UUID userId, UUID courseId, UUID lessonId,
			UUID instructorId, boolean late) {
	}

	public record SubmissionGraded(UUID orgId, UUID submissionId, UUID userId, UUID courseId, UUID lessonId,
			boolean returned, Integer points, int maxPoints) {
	}
}
