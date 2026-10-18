package com.orbitly.analytics;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class AnalyticsDtos {

	private AnalyticsDtos() {
	}

	public enum Range {
		/** Last 30 days, weekly buckets. */
		DAYS_30,
		/** Last 6 months, monthly buckets. */
		MONTHS_6,
		/** Last 12 months, monthly buckets. */
		YEAR
	}

	/** A number and its change against the previous period (null when there's nothing to compare). */
	public record Metric(double value, Double delta) {
	}

	public record SeatUsage(long used, Integer limit, Integer percent) {
	}

	public record SeriesPoint(String label, Instant start, long enrollments, long completions) {
	}

	public record ActivityItem(String kind, String text, UUID courseId, Instant at) {
	}

	public record AdminOverview(Range range, Metric activeLearners, Metric coursesLive, Metric completionRatePercent,
			SeatUsage seats, List<SeriesPoint> series, List<ActivityItem> recentActivity) {
	}

	public record CourseStat(UUID courseId, String title, String status, String hue, String icon, long learners,
			int averageProgressPercent, BigDecimal rating, int ratingCount) {
	}

	public record AtRiskLearner(UUID userId, String fullName, String avatarUrl, UUID courseId, String courseTitle,
			int progressPercent, Instant lastActiveAt) {
	}

	public record InstructorOverview(long enrolledLearners, long newLearners90Days, int averageCompletionPercent,
			long toGrade, Instant oldestUngradedAt, BigDecimal rating, long reviewCount, List<CourseStat> courses,
			List<AtRiskLearner> atRisk) {
	}

	public record ActivityPoint(String label, Instant start, long activeLearners) {
	}
}
