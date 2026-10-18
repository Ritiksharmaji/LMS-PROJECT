package com.orbitly.catalog;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.orbitly.catalog.CatalogDtos.CategoryView;
import com.orbitly.catalog.CatalogDtos.CourseCard;
import com.orbitly.catalog.CatalogDtos.CourseDetail;
import com.orbitly.catalog.CatalogDtos.InstructorView;
import com.orbitly.catalog.CatalogDtos.LessonOutline;
import com.orbitly.catalog.CatalogDtos.SectionOutline;
import com.orbitly.catalog.CatalogEntities.Course;
import com.orbitly.common.web.ApiException;
import com.orbitly.common.web.PageResponse;
import com.orbitly.identity.UserDirectory;

/** The browsable catalog: what anyone (signed in or not) can see of an organization's published courses. */
@Service
class PublicCatalogService {

	enum SortBy {
		POPULAR, RATING, NEWEST, PRICE_ASC, PRICE_DESC;

		Sort sort() {
			return switch (this) {
				case POPULAR -> Sort.by(Sort.Order.desc("enrollmentCount"), Sort.Order.desc("ratingAvg"));
				case RATING -> Sort.by(Sort.Order.desc("ratingAvg"), Sort.Order.desc("ratingCount"));
				case NEWEST -> Sort.by(Sort.Order.desc("publishedAt"));
				case PRICE_ASC -> Sort.by(Sort.Order.asc("priceCents"), Sort.Order.desc("enrollmentCount"));
				case PRICE_DESC -> Sort.by(Sort.Order.desc("priceCents"), Sort.Order.desc("enrollmentCount"));
			};
		}
	}

	private final CategoryRepository categories;

	private final CourseRepository courses;

	private final CourseViews views;

	private final UserDirectory directory;

	PublicCatalogService(CategoryRepository categories, CourseRepository courses, CourseViews views,
			UserDirectory directory) {
		this.categories = categories;
		this.courses = courses;
		this.views = views;
		this.directory = directory;
	}

	UUID orgId(String orgSlug) {
		return directory.orgBySlug(orgSlug).orElseThrow(() -> ApiException.notFound("Organization")).id();
	}

	@Transactional(readOnly = true)
	List<CategoryView> categories(UUID orgId) {
		Map<UUID, Long> counts = new HashMap<>();
		courses.countPublishedByCategory(orgId).forEach(row -> counts.put((UUID) row[0], (Long) row[1]));
		return categories.findByOrgIdOrderByPositionAscNameAsc(orgId)
			.stream()
			.map(c -> CourseViews.category(c, counts.getOrDefault(c.getId(), 0L)))
			.toList();
	}

	@Transactional(readOnly = true)
	PageResponse<CourseCard> search(UUID orgId, String categorySlug, CourseLevel level, String price, String q,
			SortBy sortBy, int page, int size) {
		UUID categoryId = null;
		if (categorySlug != null && !categorySlug.isBlank()) {
			var category = categories.findByOrgIdAndSlug(orgId, categorySlug);
			if (category.isEmpty()) {
				return new PageResponse<>(List.of(), page, size, 0, 0);
			}
			categoryId = category.get().getId();
		}
		Boolean free = price == null ? null : switch (price) {
			case "free" -> true;
			case "paid" -> false;
			default -> null;
		};
		String query = q == null ? "" : q.trim().toLowerCase();
		var pageable = PageRequest.of(Math.max(page, 0), Math.max(1, Math.min(size, 60)), (sortBy == null ? SortBy.POPULAR : sortBy).sort());
		var result = courses.searchPublished(orgId, categoryId, level, free, query, pageable);
		var cards = views.cards(result.getContent());
		return new PageResponse<>(cards, result.getNumber(), result.getSize(), result.getTotalElements(),
				result.getTotalPages());
	}

	@Transactional(readOnly = true)
	CourseDetail detail(UUID orgId, String courseSlug) {
		Course course = courses.findByOrgIdAndSlug(orgId, courseSlug)
			.filter(c -> c.getStatus() == CourseStatus.PUBLISHED)
			.orElseThrow(() -> ApiException.notFound("Course"));
		return detail(course);
	}

	CourseDetail detail(Course course) {
		var category = course.getCategoryId() == null ? null
				: categories.findById(course.getCategoryId()).map(c -> CourseViews.category(c, 0)).orElse(null);
		var person = directory.person(course.getInstructorId()).orElse(null);
		var instructor = person == null ? null
				: new InstructorView(person.id(), person.fullName(), person.avatarUrl(),
						courses.countPublishedByInstructor(course.getOrgId(), person.id()));
		List<SectionOutline> curriculum = views.sections(course.getId())
			.stream()
			.map(s -> new SectionOutline(s.id(), s.title(), s.position(),
					s.lessons()
						.stream()
						.map(l -> new LessonOutline(l.id(), l.title(), l.kind(), l.position(), l.durationMinutes(),
								l.preview()))
						.toList()))
			.toList();
		return new CourseDetail(views.card(course), course.getDescription(), List.copyOf(course.getOutcomes()), category,
				instructor, curriculum, course.getPublishedAt());
	}
}
