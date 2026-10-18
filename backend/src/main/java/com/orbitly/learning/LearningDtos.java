package com.orbitly.learning;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.orbitly.catalog.CatalogDtos.CourseCard;
import com.orbitly.catalog.LessonKind;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class LearningDtos {

	private LearningDtos() {
	}

	// ---- Requests -------------------------------------------------------------------------------------------

	public record EnrollRequest(@NotNull UUID courseId) {
	}

	public record PositionRequest(@NotNull @Min(0) @Max(86_400) Integer seconds) {
	}

	public record ReviewRequest(@NotNull @Min(1) @Max(5) Integer rating, @Size(max = 4000) String comment) {
	}

	public record AssignLearnersRequest(@NotEmpty @Size(max = 500) List<@NotNull UUID> userIds) {
	}

	// ---- Responses ------------------------------------------------------------------------------------------

	public record Progress(int completedLessons, int totalLessons, int percent) {

		static Progress of(int completed, int total) {
			int pct = total == 0 ? 0 : Math.min(100, Math.round(completed * 100f / total));
			return new Progress(Math.min(completed, total), total, pct);
		}
	}

	public record EnrollmentView(UUID id, CourseCard course, EnrollmentStatus status, EnrollmentSource source,
			Progress progress, UUID lastLessonId, Instant lastAccessedAt, Instant enrolledAt, Instant completedAt,
			String certificateCode) {
	}

	public record PlayerLesson(UUID id, String title, LessonKind kind, int position, int durationMinutes,
			boolean completed) {
	}

	public record PlayerSection(UUID id, String title, int position, List<PlayerLesson> lessons) {
	}

	/** The course player sidebar: curriculum with completion state and where to resume. */
	public record PlayerView(CourseCard course, UUID enrollmentId, EnrollmentStatus status, Progress progress,
			UUID resumeLessonId, List<PlayerSection> sections, boolean staffPreview, String certificateCode) {
	}

	public record LessonContent(UUID id, UUID courseId, UUID sectionId, String title, LessonKind kind,
			int durationMinutes, String content, boolean completed, int positionSeconds, UUID previousLessonId,
			UUID nextLessonId) {
	}

	public record CompletionResult(UUID lessonId, boolean completed, Progress progress, EnrollmentStatus status,
			String certificateCode) {
	}

	public record LearningSummary(int inProgress, int completed, long lessonsThisWeek, long minutesLearned,
			List<EnrollmentView> continueLearning) {
	}

	public record ReviewView(UUID id, int rating, String comment, UUID userId, String userName, String userAvatarUrl,
			Instant createdAt, Instant updatedAt) {
	}

	public record ReviewSummary(double average, long count, Map<Integer, Long> histogram) {
	}

	public record LearnerView(UUID enrollmentId, UUID userId, String fullName, String email, String avatarUrl,
			EnrollmentStatus status, EnrollmentSource source, Progress progress, Instant enrolledAt,
			Instant lastAccessedAt, Instant completedAt) {
	}

	public record CertificateView(String code, String learnerName, String courseTitle, String organizationName,
			Instant completedAt) {
	}
}
