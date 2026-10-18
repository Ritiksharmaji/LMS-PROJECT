package com.orbitly.analytics;

import static com.orbitly.support.Api.body;
import static com.orbitly.support.Api.read;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.simple.JdbcClient;

import com.orbitly.support.Api;
import com.orbitly.support.Api.Session;
import com.orbitly.support.IntegrationTest;

@IntegrationTest
class AnalyticsApiTest {

	@Autowired
	Api api;

	@Autowired
	JdbcClient jdbc;

	/** Published course with two lessons (video + reading), so it can be finished without assessments. */
	private UUID[] shortCourse(Session instructor, String title) throws Exception {
		String courseId = read(api.post("/api/instructor/courses", Map.of("title", title), instructor), "$.course.id");
		String section = read(api.post("/api/instructor/courses/" + courseId + "/sections", Map.of("title", "S"), instructor),
				"$.id");
		String l1 = read(api.post("/api/instructor/sections/" + section + "/lessons",
				Map.of("title", "One", "kind", "VIDEO", "durationMinutes", 5), instructor), "$.id");
		String l2 = read(api.post("/api/instructor/sections/" + section + "/lessons",
				Map.of("title", "Two", "kind", "READING", "durationMinutes", 5), instructor), "$.id");
		api.post("/api/instructor/courses/" + courseId + "/publish", null, instructor);
		return new UUID[] { UUID.fromString(courseId), UUID.fromString(l1), UUID.fromString(l2) };
	}

	@Test
	void adminOverviewReflectsRealActivity() throws Exception {
		var admin = api.newOrg();
		var instructor = api.member(admin, "INSTRUCTOR");
		var finisher = api.member(admin, "STUDENT");
		var starter = api.member(admin, "STUDENT");
		UUID[] c = shortCourse(instructor, "Statistics for Decision Making");
		for (var s : new Session[] { finisher, starter }) {
			api.post("/api/me/enrollments", Map.of("courseId", c[0].toString()), s);
		}
		api.get("/api/me/lessons/" + c[1], starter);
		api.post("/api/me/lessons/" + c[1] + "/complete", null, finisher);
		api.post("/api/me/lessons/" + c[2] + "/complete", null, finisher);

		api.get("/api/admin/analytics/overview?range=MONTHS_6", admin)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.activeLearners.value").value(2))
			.andExpect(jsonPath("$.coursesLive.value").value(1))
			.andExpect(jsonPath("$.completionRatePercent.value").value(50.0))
			.andExpect(jsonPath("$.seats.used").value(4))
			.andExpect(jsonPath("$.series.length()").value(6))
			.andExpect(jsonPath("$.series[5].enrollments").value(2))
			.andExpect(jsonPath("$.series[5].completions").value(1))
			.andExpect(jsonPath("$.recentActivity[0].text").value("STUDENT Person completed Statistics for Decision Making"));

		api.get("/api/admin/analytics/overview?range=DAYS_30", admin).andExpect(jsonPath("$.series.length()").value(5));
		api.get("/api/admin/analytics/overview?range=YEAR", admin).andExpect(jsonPath("$.series.length()").value(12));
	}

	@Test
	void highSeatUsageShowsAnAlert() throws Exception {
		var admin = api.newOrg();
		api.patch("/api/admin/organization", Map.of("seatLimit", 1), admin);
		api.get("/api/admin/analytics/overview", admin)
			.andExpect(jsonPath("$.seats.percent").value(100))
			.andExpect(jsonPath("$.recentActivity[0].kind").value("SEAT_ALERT"));
	}

	@Test
	void reportIsACsvOfCourses() throws Exception {
		var admin = api.newOrg();
		var student = api.member(admin, "STUDENT");
		var course = api.publishedCourse(admin, "Finance, for \"Managers\"", 2499);
		String order = read(api.post("/api/me/checkout", Map.of("courseId", course.id().toString()), student), "$.orderId");
		api.post("/api/me/orders/" + order + "/test-pay", null, student);

		String csv = body(api.get("/api/admin/analytics/report.csv", admin).andExpect(status().isOk()));
		assertThat(csv).startsWith("Course,Status,Instructor,Learners");
		assertThat(csv).contains("\"Finance, for \"\"Managers\"\"\",PUBLISHED").contains(",1,0,").contains(",USD,24.99");
	}

	@Test
	void instructorOverviewCountsGradingAndAtRiskLearners() throws Exception {
		var admin = api.newOrg();
		var instructor = api.member(admin, "INSTRUCTOR");
		var active = api.member(admin, "STUDENT");
		var idle = api.member(admin, "STUDENT");
		var course = api.publishedCourse(instructor, "Intro to ML", 0);
		String assignment = course.lessonIds().get(3).toString();
		api.put("/api/instructor/lessons/" + assignment + "/assignment", Map.of(), instructor);
		for (var s : new Session[] { active, idle }) {
			api.post("/api/me/enrollments", Map.of("courseId", course.id().toString()), s);
		}
		api.post("/api/me/lessons/" + course.lessonIds().get(0) + "/complete", null, active);
		api.post("/api/me/lessons/" + assignment + "/assignment/submission", Map.of("body", "Work"), active);
		jdbc.sql("update enrollments set last_accessed_at = ?, created_at = ? where user_id = ?")
			.params(Timestamp.from(Instant.now().minus(20, ChronoUnit.DAYS)),
					Timestamp.from(Instant.now().minus(30, ChronoUnit.DAYS)), idle.userId())
			.update();
		api.put("/api/me/courses/" + course.id() + "/review", Map.of("rating", 4), active);

		api.get("/api/instructor/analytics/overview", instructor)
			.andExpect(jsonPath("$.enrolledLearners").value(2))
			.andExpect(jsonPath("$.averageCompletionPercent").value(25))
			.andExpect(jsonPath("$.toGrade").value(1))
			.andExpect(jsonPath("$.oldestUngradedAt").isNotEmpty())
			.andExpect(jsonPath("$.rating").value(4.0))
			.andExpect(jsonPath("$.reviewCount").value(1))
			.andExpect(jsonPath("$.courses[0].learners").value(2))
			.andExpect(jsonPath("$.courses[0].averageProgressPercent").value(25))
			.andExpect(jsonPath("$.atRisk.length()").value(1))
			.andExpect(jsonPath("$.atRisk[0].userId").value(idle.userId().toString()));
	}

	@Test
	void courseActivityCountsDistinctActiveLearnersPerDay() throws Exception {
		var admin = api.newOrg();
		var instructor = api.member(admin, "INSTRUCTOR");
		var other = api.member(admin, "INSTRUCTOR");
		var s1 = api.member(admin, "STUDENT");
		var s2 = api.member(admin, "STUDENT");
		var course = api.publishedCourse(instructor, "Busy", 0);
		for (var s : new Session[] { s1, s2 }) {
			api.post("/api/me/enrollments", Map.of("courseId", course.id().toString()), s);
			api.get("/api/me/lessons/" + course.lessonIds().get(0), s);
			api.get("/api/me/lessons/" + course.lessonIds().get(1), s);
		}
		api.get("/api/me/lessons/" + course.lessonIds().get(0), instructor);

		api.get("/api/instructor/courses/" + course.id() + "/activity", instructor)
			.andExpect(jsonPath("$.length()").value(7))
			.andExpect(jsonPath("$[6].activeLearners").value(2));
		api.get("/api/instructor/courses/" + course.id() + "/activity?range=TERM", instructor)
			.andExpect(jsonPath("$[6].label").value("Wk 7"))
			.andExpect(jsonPath("$[6].activeLearners").value(2));
		api.get("/api/instructor/courses/" + course.id() + "/activity", other).andExpect(status().isForbidden());
	}

	@Test
	void dashboardsAreRoleRestricted() throws Exception {
		var admin = api.newOrg();
		var student = api.member(admin, "STUDENT");
		var instructor = api.member(admin, "INSTRUCTOR");
		api.get("/api/admin/analytics/overview", student).andExpect(status().isForbidden());
		api.get("/api/admin/analytics/overview", instructor).andExpect(status().isForbidden());
		api.get("/api/instructor/analytics/overview", student).andExpect(status().isForbidden());
	}
}
