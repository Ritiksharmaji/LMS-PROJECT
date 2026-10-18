package com.orbitly.catalog;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.orbitly.catalog.CatalogDtos.CourseCard;
import com.orbitly.catalog.CatalogDtos.SectionView;
import com.orbitly.catalog.CatalogEntities.Course;
import com.orbitly.catalog.CatalogEntities.Lesson;

/**
 * The catalog's public API for other modules (learning, assessment, billing, analytics). Returns plain records, never
 * entities.
 */
@Service
public class CourseCatalog {

	public record CourseRef(UUID id, UUID orgId, String slug, String title, UUID instructorId, CourseStatus status,
			int priceCents, String currency, String hue, String icon, int lessonCount) {

		public boolean isFree() {
			return priceCents == 0;
		}
	}

	public record LessonRef(UUID id, UUID orgId, UUID courseId, UUID sectionId, String title, LessonKind kind,
			int position, int durationMinutes, boolean preview) {
	}

	private final CourseRepository courses;

	private final LessonRepository lessons;

	private final CourseViews views;

	CourseCatalog(CourseRepository courses, LessonRepository lessons, CourseViews views) {
		this.courses = courses;
		this.lessons = lessons;
		this.views = views;
	}

	@Transactional(readOnly = true)
	public Optional<CourseRef> course(UUID orgId, UUID courseId) {
		return courses.findByIdAndOrgId(courseId, orgId).map(CourseCatalog::ref);
	}

	@Transactional(readOnly = true)
	public Map<UUID, CourseRef> courses(UUID orgId, Collection<UUID> ids) {
		if (ids.isEmpty()) {
			return Map.of();
		}
		return courses.findByOrgIdAndIdIn(orgId, ids)
			.stream()
			.map(CourseCatalog::ref)
			.collect(Collectors.toMap(CourseRef::id, Function.identity()));
	}

	/** Course cards for ids, in the same order. */
	@Transactional(readOnly = true)
	public List<CourseCard> cards(UUID orgId, List<UUID> ids) {
		if (ids.isEmpty()) {
			return List.of();
		}
		Map<UUID, Course> byId = courses.findByOrgIdAndIdIn(orgId, ids)
			.stream()
			.collect(Collectors.toMap(Course::getId, Function.identity()));
		return views.cards(ids.stream().map(byId::get).filter(c -> c != null).toList());
	}

	@Transactional(readOnly = true)
	public List<CourseRef> managedBy(UUID orgId, UUID instructorId) {
		return courses.findManaged(orgId, instructorId).stream().map(CourseCatalog::ref).toList();
	}

	@Transactional(readOnly = true)
	public Optional<LessonRef> lesson(UUID orgId, UUID lessonId) {
		return lessons.findByIdAndOrgId(lessonId, orgId).map(CourseCatalog::ref);
	}

	/** Lessons in curriculum order (section position, then lesson position). */
	@Transactional(readOnly = true)
	public List<LessonRef> lessons(UUID orgId, UUID courseId) {
		return views.sections(courseId)
			.stream()
			.flatMap(s -> s.lessons().stream())
			.map(l -> new LessonRef(l.id(), orgId, courseId, l.sectionId(), l.title(), l.kind(), l.position(),
					l.durationMinutes(), l.preview()))
			.toList();
	}

	/** Full curriculum including lesson content, for enrolled learners and course staff. */
	@Transactional(readOnly = true)
	public List<SectionView> curriculumWithContent(UUID courseId) {
		return views.sections(courseId);
	}

	@Transactional
	public void recordEnrollment(UUID courseId, int delta) {
		courses.addEnrollments(courseId, delta);
	}

	/** Called by the learning module whenever a course's reviews change. */
	@Transactional
	public void updateRating(UUID orgId, UUID courseId, double average, int count) {
		courses.findByIdAndOrgId(courseId, orgId).ifPresent(c -> {
			c.setRatingAvg(BigDecimal.valueOf(average).setScale(2, RoundingMode.HALF_UP));
			c.setRatingCount(count);
		});
	}

	private static CourseRef ref(Course c) {
		return new CourseRef(c.getId(), c.getOrgId(), c.getSlug(), c.getTitle(), c.getInstructorId(), c.getStatus(),
				c.getPriceCents(), c.getCurrency(), c.getHue(), c.getIcon(), c.getLessonCount());
	}

	private static LessonRef ref(Lesson l) {
		return new LessonRef(l.getId(), l.getOrgId(), l.getCourseId(), l.getSectionId(), l.getTitle(), l.getKind(),
				l.getPosition(), l.getDurationMinutes(), l.isPreview());
	}
}
