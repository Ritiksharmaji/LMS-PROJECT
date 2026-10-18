package com.orbitly.learning;

import java.util.UUID;

/** Published by the learning module for notifications and analytics. */
public final class LearningEvents {

	private LearningEvents() {
	}

	public record EnrollmentCreated(UUID orgId, UUID userId, UUID courseId, EnrollmentSource source) {
	}

	public record LessonCompleted(UUID orgId, UUID userId, UUID courseId, UUID lessonId) {
	}

	public record CourseCompleted(UUID orgId, UUID userId, UUID courseId, String certificateCode) {
	}
}
