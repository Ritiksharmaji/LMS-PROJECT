package com.orbitly.learning;

import java.time.Instant;
import java.util.UUID;

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

final class LearningEntities {

	private LearningEntities() {
	}

	@Getter
	@Setter
	@Entity(name = "Enrollment")
	@Table(name = "enrollments")
	@NoArgsConstructor(access = AccessLevel.PROTECTED)
	static class Enrollment extends TenantEntity {

		@Column(nullable = false)
		private UUID userId;

		@Column(nullable = false)
		private UUID courseId;

		@Enumerated(EnumType.STRING)
		@Column(nullable = false)
		private EnrollmentStatus status = EnrollmentStatus.ACTIVE;

		@Enumerated(EnumType.STRING)
		@Column(nullable = false)
		private EnrollmentSource source;

		private UUID lastLessonId;

		private Instant lastAccessedAt;

		private Instant completedAt;

		private String certificateCode;

		Enrollment(UUID orgId, UUID userId, UUID courseId, EnrollmentSource source) {
			setOrgId(orgId);
			this.userId = userId;
			this.courseId = courseId;
			this.source = source;
		}
	}

	@Getter
	@Setter
	@Entity(name = "LessonProgress")
	@Table(name = "lesson_progress")
	@NoArgsConstructor(access = AccessLevel.PROTECTED)
	static class LessonProgress extends TenantEntity {

		@Column(nullable = false)
		private UUID userId;

		@Column(nullable = false)
		private UUID courseId;

		@Column(nullable = false)
		private UUID lessonId;

		private int positionSeconds;

		private Instant completedAt;

		LessonProgress(UUID orgId, UUID userId, UUID courseId, UUID lessonId) {
			setOrgId(orgId);
			this.userId = userId;
			this.courseId = courseId;
			this.lessonId = lessonId;
		}
	}

	@Getter
	@Setter
	@Entity(name = "Review")
	@Table(name = "reviews")
	@NoArgsConstructor(access = AccessLevel.PROTECTED)
	static class Review extends TenantEntity {

		@Column(nullable = false)
		private UUID courseId;

		@Column(nullable = false)
		private UUID userId;

		private short rating;

		private String comment;

		Review(UUID orgId, UUID courseId, UUID userId) {
			setOrgId(orgId);
			this.courseId = courseId;
			this.userId = userId;
		}
	}
}
