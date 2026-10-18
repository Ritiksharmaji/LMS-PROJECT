package com.orbitly.catalog;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class CatalogDtos {

	private CatalogDtos() {
	}

	static final String HUES = "^(orbit|coral|sky|green|amber|ink)$";

	// ---- Requests -------------------------------------------------------------------------------------------

	public record CategoryRequest(@NotBlank @Size(max = 80) String name, @Size(max = 40) String icon,
			@Pattern(regexp = HUES) String hue, Integer position) {
	}

	public record CreateCourseRequest(@NotBlank @Size(max = 160) String title, @Size(max = 300) String tagline,
			@Size(max = 20000) String description, UUID categoryId, CourseLevel level,
			@Min(0) @Max(10_000_000) Integer priceCents, @Pattern(regexp = "^[A-Z]{3}$") String currency,
			@Pattern(regexp = HUES) String hue, @Size(max = 40) String icon, @Size(max = 500) String coverUrl,
			@Size(max = 20) List<@NotBlank @Size(max = 200) String> outcomes) {
	}

	/** All fields optional. {@code instructorId} and {@code featured} can only be changed by admins. */
	public record UpdateCourseRequest(@Size(min = 1, max = 160) String title, @Size(max = 300) String tagline,
			@Size(max = 20000) String description, UUID categoryId, Boolean clearCategory, CourseLevel level,
			@Min(0) @Max(10_000_000) Integer priceCents, @Pattern(regexp = "^[A-Z]{3}$") String currency,
			@Pattern(regexp = HUES) String hue, @Size(max = 40) String icon, @Size(max = 500) String coverUrl,
			@Size(max = 20) List<@NotBlank @Size(max = 200) String> outcomes, UUID instructorId, Boolean featured) {
	}

	public record SectionRequest(@NotBlank @Size(max = 160) String title) {
	}

	public record LessonRequest(@NotBlank @Size(max = 160) String title, @NotNull LessonKind kind,
			@Min(0) @Max(1440) Integer durationMinutes, @Size(max = 100000) String content, Boolean preview) {
	}

	public record UpdateLessonRequest(@Size(min = 1, max = 160) String title, @Min(0) @Max(1440) Integer durationMinutes,
			@Size(max = 100000) String content, Boolean preview, UUID sectionId) {
	}

	public record ReorderRequest(@NotNull @Valid List<SectionOrder> sections) {

		public record SectionOrder(@NotNull UUID id, @NotNull List<UUID> lessonIds) {
		}
	}

	// ---- Responses ------------------------------------------------------------------------------------------

	public record CategoryView(UUID id, String name, String slug, String icon, String hue, int position,
			long courseCount) {
	}

	public record InstructorView(UUID id, String fullName, String avatarUrl, long publishedCourses) {
	}

	/** What a course card shows. */
	public record CourseCard(UUID id, String slug, String title, String tagline, String categoryName, String hue,
			String icon, String coverUrl, CourseLevel level, int priceCents, String currency, boolean featured,
			int durationMinutes, int lessonCount, int enrollmentCount, BigDecimal ratingAvg, int ratingCount,
			UUID instructorId, String instructorName, CourseStatus status) {
	}

	public record LessonOutline(UUID id, String title, LessonKind kind, int position, int durationMinutes,
			boolean preview) {
	}

	public record SectionOutline(UUID id, String title, int position, List<LessonOutline> lessons) {
	}

	/** The public course page: card data plus description and curriculum (no lesson content). */
	public record CourseDetail(CourseCard course, String description, List<String> outcomes, CategoryView category,
			InstructorView instructor, List<SectionOutline> curriculum, Instant publishedAt) {
	}

	public record LessonView(UUID id, UUID sectionId, String title, LessonKind kind, int position, int durationMinutes,
			String content, boolean preview) {
	}

	public record SectionView(UUID id, String title, int position, List<LessonView> lessons) {
	}

	/** The instructor's editor view: everything, including lesson content and drafts. */
	public record CourseEditorView(CourseCard course, String description, List<String> outcomes, UUID categoryId,
			Instant publishedAt, List<SectionView> sections) {
	}

	public record WishlistEntry(CourseCard course, Instant addedAt) {
	}
}
