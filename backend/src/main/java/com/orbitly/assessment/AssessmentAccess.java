package com.orbitly.assessment;

import java.util.UUID;

import org.springframework.stereotype.Component;

import com.orbitly.catalog.CourseCatalog;
import com.orbitly.catalog.CourseCatalog.CourseRef;
import com.orbitly.catalog.CourseCatalog.LessonRef;
import com.orbitly.catalog.LessonKind;
import com.orbitly.common.security.CurrentUser;
import com.orbitly.common.web.ApiException;
import com.orbitly.learning.Enrollments;

/** Shared access checks: staff edit and grade, enrolled learners (and staff) take quizzes and submit work. */
@Component
class AssessmentAccess {

	private final CourseCatalog catalog;

	private final Enrollments enrollments;

	AssessmentAccess(CourseCatalog catalog, Enrollments enrollments) {
		this.catalog = catalog;
		this.enrollments = enrollments;
	}

	LessonRef staffLesson(CurrentUser me, UUID lessonId, LessonKind kind) {
		LessonRef lesson = lesson(me, lessonId, kind);
		staffCourse(me, lesson.courseId());
		return lesson;
	}

	LessonRef accessibleLesson(CurrentUser me, UUID lessonId, LessonKind kind) {
		LessonRef lesson = lesson(me, lessonId, kind);
		CourseRef course = catalog.course(me.orgId(), lesson.courseId()).orElseThrow(() -> ApiException.notFound("Course"));
		if (!enrollments.canAccess(me, course)) {
			throw ApiException.forbidden("Enroll in this course to open its lessons");
		}
		return lesson;
	}

	CourseRef staffCourse(CurrentUser me, UUID courseId) {
		CourseRef course = catalog.course(me.orgId(), courseId).orElseThrow(() -> ApiException.notFound("Course"));
		if (!Enrollments.isStaff(me, course)) {
			throw ApiException.forbidden("Only this course's instructor or an admin can do that");
		}
		return course;
	}

	private LessonRef lesson(CurrentUser me, UUID lessonId, LessonKind kind) {
		LessonRef lesson = catalog.lesson(me.orgId(), lessonId).orElseThrow(() -> ApiException.notFound("Lesson"));
		if (lesson.kind() != kind) {
			throw ApiException.badRequest("This lesson is not a " + kind.name().toLowerCase());
		}
		return lesson;
	}
}
