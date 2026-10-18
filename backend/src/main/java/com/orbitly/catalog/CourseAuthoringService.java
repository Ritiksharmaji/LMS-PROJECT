package com.orbitly.catalog;

import java.time.Clock;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.orbitly.catalog.CatalogDtos.CourseCard;
import com.orbitly.catalog.CatalogDtos.CourseEditorView;
import com.orbitly.catalog.CatalogDtos.CreateCourseRequest;
import com.orbitly.catalog.CatalogDtos.LessonRequest;
import com.orbitly.catalog.CatalogDtos.LessonView;
import com.orbitly.catalog.CatalogDtos.ReorderRequest;
import com.orbitly.catalog.CatalogDtos.SectionRequest;
import com.orbitly.catalog.CatalogDtos.SectionView;
import com.orbitly.catalog.CatalogDtos.UpdateCourseRequest;
import com.orbitly.catalog.CatalogDtos.UpdateLessonRequest;
import com.orbitly.catalog.CatalogEntities.Course;
import com.orbitly.catalog.CatalogEntities.Lesson;
import com.orbitly.catalog.CatalogEntities.Section;
import com.orbitly.common.security.CurrentUser;
import com.orbitly.common.security.Role;
import com.orbitly.common.web.ApiException;
import com.orbitly.common.web.Slugs;
import com.orbitly.identity.UserDirectory;

/**
 * Course authoring for instructors (their own courses) and admins (any course in the organization).
 */
@Service
class CourseAuthoringService {

	private final CourseRepository courses;

	private final SectionRepository sections;

	private final LessonRepository lessons;

	private final CategoryRepository categories;

	private final CourseViews views;

	private final UserDirectory directory;

	private final org.springframework.context.ApplicationEventPublisher events;

	private final Clock clock;

	CourseAuthoringService(CourseRepository courses, SectionRepository sections, LessonRepository lessons,
			CategoryRepository categories, CourseViews views, UserDirectory directory,
			org.springframework.context.ApplicationEventPublisher events, Clock clock) {
		this.courses = courses;
		this.sections = sections;
		this.lessons = lessons;
		this.categories = categories;
		this.views = views;
		this.directory = directory;
		this.events = events;
		this.clock = clock;
	}

	@Transactional(readOnly = true)
	List<CourseCard> myCourses(CurrentUser me) {
		UUID instructorFilter = me.is(Role.ADMIN) ? null : me.userId();
		return views.cards(courses.findManaged(me.orgId(), instructorFilter));
	}

	@Transactional
	CourseEditorView create(CurrentUser me, CreateCourseRequest req) {
		String slug = Slugs.unique(req.title(), s -> courses.existsByOrgIdAndSlug(me.orgId(), s));
		Course course = new Course(me.orgId(), me.userId(), slug, req.title().trim());
		course.setTagline(req.tagline());
		course.setDescription(req.description());
		if (req.categoryId() != null) {
			course.setCategoryId(requireCategory(me, req.categoryId()));
		}
		if (req.level() != null) {
			course.setLevel(req.level());
		}
		if (req.priceCents() != null) {
			course.setPriceCents(req.priceCents());
		}
		if (req.currency() != null) {
			course.setCurrency(req.currency());
		}
		if (req.hue() != null) {
			course.setHue(req.hue());
		}
		if (req.icon() != null) {
			course.setIcon(req.icon());
		}
		course.setCoverUrl(req.coverUrl());
		if (req.outcomes() != null) {
			course.setOutcomes(new ArrayList<>(req.outcomes()));
		}
		return editor(courses.save(course));
	}

	@Transactional(readOnly = true)
	CourseEditorView get(CurrentUser me, UUID courseId) {
		return editor(owned(me, courseId));
	}

	@Transactional
	CourseEditorView update(CurrentUser me, UUID courseId, UpdateCourseRequest req) {
		Course c = owned(me, courseId);
		if (req.title() != null) {
			c.setTitle(req.title().trim());
		}
		if (req.tagline() != null) {
			c.setTagline(req.tagline());
		}
		if (req.description() != null) {
			c.setDescription(req.description());
		}
		if (Boolean.TRUE.equals(req.clearCategory())) {
			c.setCategoryId(null);
		}
		else if (req.categoryId() != null) {
			c.setCategoryId(requireCategory(me, req.categoryId()));
		}
		if (req.level() != null) {
			c.setLevel(req.level());
		}
		if (req.priceCents() != null) {
			c.setPriceCents(req.priceCents());
		}
		if (req.currency() != null) {
			c.setCurrency(req.currency());
		}
		if (req.hue() != null) {
			c.setHue(req.hue());
		}
		if (req.icon() != null) {
			c.setIcon(req.icon());
		}
		if (req.coverUrl() != null) {
			c.setCoverUrl(req.coverUrl().isBlank() ? null : req.coverUrl());
		}
		if (req.outcomes() != null) {
			c.setOutcomes(new ArrayList<>(req.outcomes()));
		}
		if (req.instructorId() != null || req.featured() != null) {
			if (!me.is(Role.ADMIN)) {
				throw ApiException.forbidden("Only admins can reassign or feature courses");
			}
			if (req.instructorId() != null) {
				Role role = directory.activeRole(me.orgId(), req.instructorId())
					.orElseThrow(() -> ApiException.badRequest("That person isn't an active member"));
				if (role == Role.STUDENT) {
					throw ApiException.badRequest("Courses can only be assigned to instructors or admins");
				}
				c.setInstructorId(req.instructorId());
			}
			if (req.featured() != null) {
				c.setFeatured(req.featured());
			}
		}
		return editor(c);
	}

	@Transactional
	CourseEditorView publish(CurrentUser me, UUID courseId) {
		Course c = owned(me, courseId);
		if (lessons.countByCourseId(c.getId()) == 0) {
			throw ApiException.badRequest("Add at least one lesson before publishing");
		}
		c.setStatus(CourseStatus.PUBLISHED);
		if (c.getPublishedAt() == null) {
			c.setPublishedAt(clock.instant());
			events.publishEvent(new CatalogEvents.CoursePublished(c.getOrgId(), c.getId(), c.getInstructorId(), c.getTitle()));
		}
		return editor(c);
	}

	@Transactional
	CourseEditorView archive(CurrentUser me, UUID courseId) {
		Course c = owned(me, courseId);
		c.setStatus(CourseStatus.ARCHIVED);
		return editor(c);
	}

	@Transactional
	void delete(CurrentUser me, UUID courseId) {
		Course c = owned(me, courseId);
		if (c.getStatus() != CourseStatus.DRAFT || c.getEnrollmentCount() > 0) {
			throw ApiException.conflict("Only unpublished drafts without learners can be deleted. Archive it instead.");
		}
		courses.delete(c);
	}

	// ---- Sections -------------------------------------------------------------------------------------------

	@Transactional
	SectionView addSection(CurrentUser me, UUID courseId, SectionRequest req) {
		Course c = owned(me, courseId);
		Section s = sections.save(new Section(me.orgId(), c.getId(), req.title().trim(), sections.countByCourseId(c.getId())));
		return new SectionView(s.getId(), s.getTitle(), s.getPosition(), List.of());
	}

	@Transactional
	SectionView renameSection(CurrentUser me, UUID sectionId, SectionRequest req) {
		Section s = ownedSection(me, sectionId);
		s.setTitle(req.title().trim());
		return new SectionView(s.getId(), s.getTitle(), s.getPosition(),
				lessons.findBySectionIdOrderByPositionAsc(s.getId()).stream().map(CourseViews::lesson).toList());
	}

	@Transactional
	void deleteSection(CurrentUser me, UUID sectionId) {
		Section s = ownedSection(me, sectionId);
		UUID courseId = s.getCourseId();
		lessons.deleteAll(lessons.findBySectionIdOrderByPositionAsc(s.getId()));
		sections.delete(s);
		sections.flush();
		renumberSections(courseId);
		refreshTotals(courseId);
	}

	// ---- Lessons --------------------------------------------------------------------------------------------

	@Transactional
	LessonView addLesson(CurrentUser me, UUID sectionId, LessonRequest req) {
		Section s = ownedSection(me, sectionId);
		Lesson l = new Lesson(me.orgId(), s.getCourseId(), s.getId(), req.title().trim(), req.kind(),
				lessons.countBySectionId(s.getId()));
		if (req.durationMinutes() != null) {
			l.setDurationMinutes(req.durationMinutes());
		}
		l.setContent(req.content());
		l.setPreview(Boolean.TRUE.equals(req.preview()));
		l = lessons.save(l);
		refreshTotals(s.getCourseId());
		return CourseViews.lesson(l);
	}

	@Transactional
	LessonView updateLesson(CurrentUser me, UUID lessonId, UpdateLessonRequest req) {
		Lesson l = ownedLesson(me, lessonId);
		if (req.title() != null) {
			l.setTitle(req.title().trim());
		}
		if (req.durationMinutes() != null) {
			l.setDurationMinutes(req.durationMinutes());
		}
		if (req.content() != null) {
			l.setContent(req.content());
		}
		if (req.preview() != null) {
			l.setPreview(req.preview());
		}
		if (req.sectionId() != null && !req.sectionId().equals(l.getSectionId())) {
			Section target = ownedSection(me, req.sectionId());
			if (!target.getCourseId().equals(l.getCourseId())) {
				throw ApiException.badRequest("A lesson can only move within its course");
			}
			UUID from = l.getSectionId();
			l.setSectionId(target.getId());
			l.setPosition(lessons.countBySectionId(target.getId()));
			lessons.flush();
			renumberLessons(from);
		}
		refreshTotals(l.getCourseId());
		return CourseViews.lesson(l);
	}

	@Transactional
	void deleteLesson(CurrentUser me, UUID lessonId) {
		Lesson l = ownedLesson(me, lessonId);
		lessons.delete(l);
		lessons.flush();
		renumberLessons(l.getSectionId());
		refreshTotals(l.getCourseId());
	}

	/** Sets the order of every section and lesson at once. The request must list each exactly once. */
	@Transactional
	CourseEditorView reorder(CurrentUser me, UUID courseId, ReorderRequest req) {
		Course c = owned(me, courseId);
		Map<UUID, Section> sectionById = new HashMap<>();
		sections.findByCourseIdOrderByPositionAsc(c.getId()).forEach(s -> sectionById.put(s.getId(), s));
		Map<UUID, Lesson> lessonById = new HashMap<>();
		lessons.findByCourseIdOrderByPositionAsc(c.getId()).forEach(l -> lessonById.put(l.getId(), l));

		var seenSections = new HashSet<UUID>();
		var seenLessons = new HashSet<UUID>();
		for (var so : req.sections()) {
			if (!sectionById.containsKey(so.id()) || !seenSections.add(so.id())) {
				throw ApiException.badRequest("Unknown or repeated section " + so.id());
			}
			for (UUID lid : so.lessonIds()) {
				if (!lessonById.containsKey(lid) || !seenLessons.add(lid)) {
					throw ApiException.badRequest("Unknown or repeated lesson " + lid);
				}
			}
		}
		if (seenSections.size() != sectionById.size() || seenLessons.size() != lessonById.size()) {
			throw ApiException.badRequest("Include every section and lesson of the course");
		}
		for (int i = 0; i < req.sections().size(); i++) {
			var so = req.sections().get(i);
			sectionById.get(so.id()).setPosition(i);
			for (int j = 0; j < so.lessonIds().size(); j++) {
				Lesson l = lessonById.get(so.lessonIds().get(j));
				l.setSectionId(so.id());
				l.setPosition(j);
			}
		}
		return editor(c);
	}

	// ---- Helpers --------------------------------------------------------------------------------------------

	private CourseEditorView editor(Course c) {
		return new CourseEditorView(views.card(c), c.getDescription(), List.copyOf(c.getOutcomes()), c.getCategoryId(),
				c.getPublishedAt(), views.sections(c.getId()));
	}

	/** Loads a course the caller may edit: their own, or any in the organization for admins. */
	private Course owned(CurrentUser me, UUID courseId) {
		Course c = courses.findByIdAndOrgId(courseId, me.orgId()).orElseThrow(() -> ApiException.notFound("Course"));
		if (!me.is(Role.ADMIN) && !c.getInstructorId().equals(me.userId())) {
			throw ApiException.forbidden("You can only edit courses you teach");
		}
		return c;
	}

	private Section ownedSection(CurrentUser me, UUID sectionId) {
		Section s = sections.findByIdAndOrgId(sectionId, me.orgId()).orElseThrow(() -> ApiException.notFound("Section"));
		owned(me, s.getCourseId());
		return s;
	}

	private Lesson ownedLesson(CurrentUser me, UUID lessonId) {
		Lesson l = lessons.findByIdAndOrgId(lessonId, me.orgId()).orElseThrow(() -> ApiException.notFound("Lesson"));
		owned(me, l.getCourseId());
		return l;
	}

	private UUID requireCategory(CurrentUser me, UUID categoryId) {
		return categories.findByIdAndOrgId(categoryId, me.orgId())
			.orElseThrow(() -> ApiException.badRequest("Unknown category"))
			.getId();
	}

	private void refreshTotals(UUID courseId) {
		lessons.flush();
		courses.findById(courseId).ifPresent(c -> {
			c.setDurationMinutes(lessons.totalMinutes(courseId));
			c.setLessonCount(lessons.countByCourseId(courseId));
		});
	}

	private void renumberSections(UUID courseId) {
		var list = sections.findByCourseIdOrderByPositionAsc(courseId);
		for (int i = 0; i < list.size(); i++) {
			list.get(i).setPosition(i);
		}
	}

	private void renumberLessons(UUID sectionId) {
		var list = lessons.findBySectionIdOrderByPositionAsc(sectionId);
		for (int i = 0; i < list.size(); i++) {
			list.get(i).setPosition(i);
		}
	}
}
