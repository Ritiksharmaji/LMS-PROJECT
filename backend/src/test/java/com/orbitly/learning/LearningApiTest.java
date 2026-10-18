package com.orbitly.learning;

import static com.orbitly.support.Api.read;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.orbitly.support.Api;
import com.orbitly.support.Api.Session;
import com.orbitly.support.IntegrationTest;

@IntegrationTest
class LearningApiTest {

	@Autowired
	Api api;

	/** A published course with two VIDEO/READING lessons, so it can be completed without assessments. */
	private UUID[] twoLessonCourse(Session instructor, String title) throws Exception {
		String courseId = read(api.post("/api/instructor/courses", Map.of("title", title), instructor), "$.course.id");
		String sectionId = read(api.post("/api/instructor/courses/" + courseId + "/sections", Map.of("title", "Only"),
				instructor), "$.id");
		String l1 = read(api.post("/api/instructor/sections/" + sectionId + "/lessons",
				Map.of("title", "Watch", "kind", "VIDEO", "durationMinutes", 8), instructor), "$.id");
		String l2 = read(api.post("/api/instructor/sections/" + sectionId + "/lessons",
				Map.of("title", "Read", "kind", "READING", "durationMinutes", 6), instructor), "$.id");
		api.post("/api/instructor/courses/" + courseId + "/publish", null, instructor);
		return new UUID[] { UUID.fromString(courseId), UUID.fromString(l1), UUID.fromString(l2) };
	}

	@Test
	void learnersEnrollInFreeCoursesAndMustPayForPaidOnes() throws Exception {
		var admin = api.newOrg();
		var student = api.member(admin, "STUDENT");
		var free = api.publishedCourse(admin, "Python from Zero", 0);
		var paid = api.publishedCourse(admin, "Intro to ML", 4999);

		api.post("/api/me/enrollments", Map.of("courseId", free.id().toString()), student)
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.source").value("FREE"))
			.andExpect(jsonPath("$.progress.percent").value(0));
		api.post("/api/me/enrollments", Map.of("courseId", paid.id().toString()), student)
			.andExpect(status().isPaymentRequired())
			.andExpect(jsonPath("$.code").value("payment_required"));

		api.get("/api/me/enrollments", student).andExpect(jsonPath("$.length()").value(1));
		api.get("/api/public/organizations/" + admin.orgSlug() + "/courses/" + free.slug(), null)
			.andExpect(jsonPath("$.course.enrollmentCount").value(1));
	}

	@Test
	void lessonsAreLockedUntilEnrolled() throws Exception {
		var admin = api.newOrg();
		var student = api.member(admin, "STUDENT");
		var course = api.publishedCourse(admin, "Locked", 0);

		api.get("/api/me/courses/" + course.id() + "/player", student).andExpect(status().isForbidden());
		api.get("/api/me/lessons/" + course.lessonIds().get(0), student).andExpect(status().isForbidden());

		api.post("/api/me/enrollments", Map.of("courseId", course.id().toString()), student);
		api.get("/api/me/lessons/" + course.lessonIds().get(0), student)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.content").value("Body of What is a model?"))
			.andExpect(jsonPath("$.previousLessonId").doesNotExist())
			.andExpect(jsonPath("$.nextLessonId").value(course.lessonIds().get(1).toString()));
	}

	@Test
	void staffCanPreviewCoursesWithoutEnrolling() throws Exception {
		var admin = api.newOrg();
		var instructor = api.member(admin, "INSTRUCTOR");
		var course = api.publishedCourse(instructor, "Preview me", 0);
		api.get("/api/me/courses/" + course.id() + "/player", instructor)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.staffPreview").value(true));
		api.get("/api/me/courses/" + course.id() + "/player", admin).andExpect(status().isOk());
	}

	@Test
	void completingEveryLessonCompletesTheCourseWithACertificate() throws Exception {
		var admin = api.newOrg();
		var student = api.member(admin, "STUDENT");
		UUID[] c = twoLessonCourse(admin, "Short course");
		api.post("/api/me/enrollments", Map.of("courseId", c[0].toString()), student);

		api.post("/api/me/lessons/" + c[1] + "/complete", null, student)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.progress.percent").value(50))
			.andExpect(jsonPath("$.status").value("ACTIVE"));
		api.get("/api/me/courses/" + c[0] + "/player", student)
			.andExpect(jsonPath("$.resumeLessonId").value(c[2].toString()))
			.andExpect(jsonPath("$.sections[0].lessons[0].completed").value(true));

		var done = api.post("/api/me/lessons/" + c[2] + "/complete", null, student)
			.andExpect(jsonPath("$.progress.percent").value(100))
			.andExpect(jsonPath("$.status").value("COMPLETED"));
		String code = read(done, "$.certificateCode");
		assertThat(code).startsWith("ORB-");

		api.get("/api/public/certificates/" + code, null)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.courseTitle").value("Short course"))
			.andExpect(jsonPath("$.learnerName").value("STUDENT Person"));
		api.get("/api/me/enrollments?status=COMPLETED", student).andExpect(jsonPath("$.length()").value(1));
		api.get("/api/me/learning/summary", student)
			.andExpect(jsonPath("$.completed").value(1))
			.andExpect(jsonPath("$.lessonsThisWeek").value(2))
			.andExpect(jsonPath("$.minutesLearned").value(14));
	}

	@Test
	void quizzesAndAssignmentsCantBeTickedOffManually() throws Exception {
		var admin = api.newOrg();
		var student = api.member(admin, "STUDENT");
		var course = api.publishedCourse(admin, "Assessed", 0);
		api.post("/api/me/enrollments", Map.of("courseId", course.id().toString()), student);
		api.post("/api/me/lessons/" + course.lessonIds().get(2) + "/complete", null, student)
			.andExpect(status().isBadRequest());
	}

	@Test
	void lessonsCanBeUncompletedAndVideoPositionsAreSaved() throws Exception {
		var admin = api.newOrg();
		var student = api.member(admin, "STUDENT");
		var course = api.publishedCourse(admin, "Resume", 0);
		UUID video = course.lessonIds().get(0);
		api.post("/api/me/enrollments", Map.of("courseId", course.id().toString()), student);

		api.put("/api/me/lessons/" + video + "/position", Map.of("seconds", 125), student)
			.andExpect(status().isNoContent());
		api.get("/api/me/lessons/" + video, student).andExpect(jsonPath("$.positionSeconds").value(125));

		api.post("/api/me/lessons/" + video + "/complete", null, student).andExpect(jsonPath("$.progress.completedLessons").value(1));
		api.delete("/api/me/lessons/" + video + "/complete", student)
			.andExpect(jsonPath("$.completed").value(false))
			.andExpect(jsonPath("$.progress.completedLessons").value(0));
	}

	@Test
	void enrolledLearnersReviewCoursesAndRatingsUpdate() throws Exception {
		var admin = api.newOrg();
		var s1 = api.member(admin, "STUDENT");
		var s2 = api.member(admin, "STUDENT");
		var outsider = api.member(admin, "STUDENT");
		var course = api.publishedCourse(admin, "Rate me", 0);
		for (var s : List.of(s1, s2)) {
			api.post("/api/me/enrollments", Map.of("courseId", course.id().toString()), s);
		}

		api.put("/api/me/courses/" + course.id() + "/review", Map.of("rating", 5, "comment", "Loved it"), s1)
			.andExpect(status().isOk());
		api.put("/api/me/courses/" + course.id() + "/review", Map.of("rating", 4), s2).andExpect(status().isOk());
		api.put("/api/me/courses/" + course.id() + "/review", Map.of("rating", 1), outsider)
			.andExpect(status().isForbidden());
		// Updating replaces the earlier review instead of adding a second one.
		api.put("/api/me/courses/" + course.id() + "/review", Map.of("rating", 3), s2).andExpect(status().isOk());

		String base = "/api/public/organizations/" + admin.orgSlug() + "/courses/" + course.id();
		api.get(base + "/reviews", null)
			.andExpect(jsonPath("$.total").value(2))
			.andExpect(jsonPath("$.items[0].userName").exists());
		api.get(base + "/reviews/summary", null)
			.andExpect(jsonPath("$.count").value(2))
			.andExpect(jsonPath("$.average").value(4.0))
			.andExpect(jsonPath("$.histogram.5").value(1))
			.andExpect(jsonPath("$.histogram.3").value(1));
		api.get("/api/public/organizations/" + admin.orgSlug() + "/courses/" + course.slug(), null)
			.andExpect(jsonPath("$.course.ratingAvg").value(4.0))
			.andExpect(jsonPath("$.course.ratingCount").value(2));

		api.delete("/api/me/courses/" + course.id() + "/review", s1).andExpect(status().isNoContent());
		api.get(base + "/reviews/summary", null).andExpect(jsonPath("$.average").value(3.0));
	}

	@Test
	void instructorsSeeTheirLearnersAndCanAssignOrRemoveThem() throws Exception {
		var admin = api.newOrg();
		var instructor = api.member(admin, "INSTRUCTOR");
		var other = api.member(admin, "INSTRUCTOR");
		var s1 = api.member(admin, "STUDENT");
		var s2 = api.member(admin, "STUDENT");
		var course = api.publishedCourse(instructor, "Required training", 9999);

		api.post("/api/instructor/courses/" + course.id() + "/learners",
				Map.of("userIds", List.of(s1.userId().toString(), s2.userId().toString())), instructor)
			.andExpect(jsonPath("$.enrolled").value(2));
		// Assigned learners get into paid courses without paying.
		api.get("/api/me/courses/" + course.id() + "/player", s1).andExpect(status().isOk());

		api.post("/api/me/lessons/" + course.lessonIds().get(0) + "/complete", null, s1);
		var learners = api.get("/api/instructor/courses/" + course.id() + "/learners", instructor)
			.andExpect(jsonPath("$.total").value(2))
			.andExpect(jsonPath("$.items[0].source").value("ASSIGNED"));
		api.get("/api/instructor/courses/" + course.id() + "/learners", other).andExpect(status().isForbidden());

		String enrollmentId = read(learners, "$.items[0].enrollmentId");
		api.delete("/api/instructor/enrollments/" + enrollmentId, instructor).andExpect(status().isNoContent());
		api.get("/api/instructor/courses/" + course.id() + "/learners", instructor).andExpect(jsonPath("$.total").value(1));
	}

	@Test
	void enrollmentsStayInsideTheirOrganization() throws Exception {
		var orgA = api.newOrg();
		var orgB = api.newOrg();
		var course = api.publishedCourse(orgA, "Org A", 0);
		api.post("/api/me/enrollments", Map.of("courseId", course.id().toString()), orgB).andExpect(status().isNotFound());
		api.get("/api/me/lessons/" + course.lessonIds().get(0), orgB).andExpect(status().isNotFound());
	}
}
