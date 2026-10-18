package com.orbitly.catalog;

import java.math.BigDecimal;
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

/** JPA entities of the catalog module. */
final class CatalogEntities {

	private CatalogEntities() {
	}

	@Getter
	@Setter
	@Entity(name = "Category")
	@Table(name = "categories")
	@NoArgsConstructor(access = AccessLevel.PROTECTED)
	static class Category extends TenantEntity {

		@Column(nullable = false)
		private String name;

		@Column(nullable = false)
		private String slug;

		@Column(nullable = false)
		private String icon = "book-open";

		@Column(nullable = false)
		private String hue = "orbit";

		private int position;

		Category(UUID orgId, String name, String slug) {
			setOrgId(orgId);
			this.name = name;
			this.slug = slug;
		}
	}

	@Getter
	@Setter
	@Entity(name = "Course")
	@Table(name = "courses")
	@NoArgsConstructor(access = AccessLevel.PROTECTED)
	static class Course extends TenantEntity {

		@Column(nullable = false)
		private UUID instructorId;

		private UUID categoryId;

		@Column(nullable = false)
		private String slug;

		@Column(nullable = false)
		private String title;

		private String tagline;

		private String description;

		@JdbcTypeCode(SqlTypes.ARRAY)
		@Column(nullable = false, columnDefinition = "text[]")
		private List<String> outcomes = new ArrayList<>();

		@Enumerated(EnumType.STRING)
		@Column(nullable = false)
		private CourseLevel level = CourseLevel.BEGINNER;

		private int priceCents;

		@Column(nullable = false)
		private String currency = "USD";

		@Column(nullable = false)
		private String hue = "orbit";

		@Column(nullable = false)
		private String icon = "book-open";

		private String coverUrl;

		@Enumerated(EnumType.STRING)
		@Column(nullable = false)
		private CourseStatus status = CourseStatus.DRAFT;

		private boolean featured;

		private Instant publishedAt;

		private int durationMinutes;

		private int lessonCount;

		private int enrollmentCount;

		@Column(nullable = false, precision = 3, scale = 2)
		private BigDecimal ratingAvg = BigDecimal.ZERO;

		private int ratingCount;

		Course(UUID orgId, UUID instructorId, String slug, String title) {
			setOrgId(orgId);
			this.instructorId = instructorId;
			this.slug = slug;
			this.title = title;
		}
	}

	@Getter
	@Setter
	@Entity(name = "Section")
	@Table(name = "sections")
	@NoArgsConstructor(access = AccessLevel.PROTECTED)
	static class Section extends TenantEntity {

		@Column(nullable = false)
		private UUID courseId;

		@Column(nullable = false)
		private String title;

		private int position;

		Section(UUID orgId, UUID courseId, String title, int position) {
			setOrgId(orgId);
			this.courseId = courseId;
			this.title = title;
			this.position = position;
		}
	}

	@Getter
	@Setter
	@Entity(name = "Lesson")
	@Table(name = "lessons")
	@NoArgsConstructor(access = AccessLevel.PROTECTED)
	static class Lesson extends TenantEntity {

		@Column(nullable = false)
		private UUID courseId;

		@Column(nullable = false)
		private UUID sectionId;

		@Column(nullable = false)
		private String title;

		@Enumerated(EnumType.STRING)
		@Column(nullable = false)
		private LessonKind kind;

		private int position;

		private int durationMinutes;

		private String content;

		private boolean preview;

		Lesson(UUID orgId, UUID courseId, UUID sectionId, String title, LessonKind kind, int position) {
			setOrgId(orgId);
			this.courseId = courseId;
			this.sectionId = sectionId;
			this.title = title;
			this.kind = kind;
			this.position = position;
		}
	}

	@Getter
	@Entity(name = "WishlistItem")
	@Table(name = "wishlist_items")
	@NoArgsConstructor(access = AccessLevel.PROTECTED)
	static class WishlistItem extends TenantEntity {

		@Column(nullable = false)
		private UUID userId;

		@Column(nullable = false)
		private UUID courseId;

		WishlistItem(UUID orgId, UUID userId, UUID courseId) {
			setOrgId(orgId);
			this.userId = userId;
			this.courseId = courseId;
		}
	}
}
