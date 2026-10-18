package com.orbitly.catalog;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.orbitly.catalog.CatalogDtos.CategoryView;
import com.orbitly.catalog.CatalogDtos.CourseCard;
import com.orbitly.catalog.CatalogDtos.LessonView;
import com.orbitly.catalog.CatalogDtos.SectionView;
import com.orbitly.catalog.CatalogEntities.Category;
import com.orbitly.catalog.CatalogEntities.Course;
import com.orbitly.catalog.CatalogEntities.Lesson;
import com.orbitly.catalog.CatalogEntities.Section;
import com.orbitly.identity.UserDirectory;

/** Turns catalog entities into response records, batching the instructor and category lookups. */
@Component
class CourseViews {

	private final CategoryRepository categories;

	private final SectionRepository sections;

	private final LessonRepository lessons;

	private final UserDirectory directory;

	CourseViews(CategoryRepository categories, SectionRepository sections, LessonRepository lessons,
			UserDirectory directory) {
		this.categories = categories;
		this.sections = sections;
		this.lessons = lessons;
		this.directory = directory;
	}

	List<CourseCard> cards(List<Course> courses) {
		Set<UUID> instructorIds = new HashSet<>();
		Set<UUID> categoryIds = new HashSet<>();
		courses.forEach(c -> {
			instructorIds.add(c.getInstructorId());
			if (c.getCategoryId() != null) {
				categoryIds.add(c.getCategoryId());
			}
		});
		var people = directory.people(instructorIds);
		Map<UUID, Category> cats = categories.findAllById(categoryIds)
			.stream()
			.collect(Collectors.toMap(Category::getId, Function.identity()));
		return courses.stream().map(c -> {
			var instructor = people.get(c.getInstructorId());
			var category = c.getCategoryId() == null ? null : cats.get(c.getCategoryId());
			return card(c, category == null ? null : category.getName(),
					instructor == null ? null : instructor.fullName());
		}).toList();
	}

	CourseCard card(Course c) {
		return cards(List.of(c)).get(0);
	}

	static CourseCard card(Course c, String categoryName, String instructorName) {
		return new CourseCard(c.getId(), c.getSlug(), c.getTitle(), c.getTagline(), categoryName, c.getHue(), c.getIcon(),
				c.getCoverUrl(), c.getLevel(), c.getPriceCents(), c.getCurrency(), c.isFeatured(), c.getDurationMinutes(),
				c.getLessonCount(), c.getEnrollmentCount(), c.getRatingAvg(), c.getRatingCount(), c.getInstructorId(),
				instructorName, c.getStatus());
	}

	static CategoryView category(Category c, long courseCount) {
		return new CategoryView(c.getId(), c.getName(), c.getSlug(), c.getIcon(), c.getHue(), c.getPosition(),
				courseCount);
	}

	/** Sections in order, each with its lessons in order. */
	List<SectionView> sections(UUID courseId) {
		Map<UUID, List<Lesson>> bySection = lessons.findByCourseIdOrderByPositionAsc(courseId)
			.stream()
			.collect(Collectors.groupingBy(Lesson::getSectionId));
		return sections.findByCourseIdOrderByPositionAsc(courseId)
			.stream()
			.map(s -> section(s, bySection.getOrDefault(s.getId(), List.of())))
			.toList();
	}

	private static SectionView section(Section s, List<Lesson> lessons) {
		return new SectionView(s.getId(), s.getTitle(), s.getPosition(),
				lessons.stream().map(CourseViews::lesson).toList());
	}

	static LessonView lesson(Lesson l) {
		return new LessonView(l.getId(), l.getSectionId(), l.getTitle(), l.getKind(), l.getPosition(),
				l.getDurationMinutes(), l.getContent(), l.isPreview());
	}
}
