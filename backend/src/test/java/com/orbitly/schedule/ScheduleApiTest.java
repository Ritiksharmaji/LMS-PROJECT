package com.orbitly.schedule;

import static com.orbitly.support.Api.read;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.orbitly.support.Api;
import com.orbitly.support.IntegrationTest;

@IntegrationTest
class ScheduleApiTest {

	@Autowired
	Api api;

	private static Map<String, Object> session(String title, Instant start, int minutes) {
		return Map.of("title", title, "kind", "LIVE_CLASS", "startsAt", start.toString(), "endsAt",
				start.plus(minutes, ChronoUnit.MINUTES).toString(), "meetingUrl", "https://meet.example.com/abc");
	}

	@Test
	void learnersSeeSessionsForTheirCoursesOnly() throws Exception {
		var admin = api.newOrg();
		var instructor = api.member(admin, "INSTRUCTOR");
		var student = api.member(admin, "STUDENT");
		var mine = api.publishedCourse(instructor, "Intro to ML", 0);
		var other = api.publishedCourse(instructor, "Statistics", 0);
		api.post("/api/me/enrollments", Map.of("courseId", mine.id().toString()), student);

		Instant inTwoHours = Instant.now().plus(2, ChronoUnit.HOURS);
		api.post("/api/instructor/courses/" + mine.id() + "/sessions", session("Live: Neural nets Q&A", inTwoHours, 60),
				instructor)
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.courseTitle").value("Intro to ML"))
			.andExpect(jsonPath("$.hostName").value("INSTRUCTOR Person"));
		api.post("/api/instructor/courses/" + other.id() + "/sessions", session("Study group", inTwoHours, 45),
				instructor);

		api.get("/api/me/schedule", student)
			.andExpect(jsonPath("$.length()").value(1))
			.andExpect(jsonPath("$[0].title").value("Live: Neural nets Q&A"));
		api.get("/api/me/schedule", instructor).andExpect(jsonPath("$.length()").value(2));
		api.get("/api/instructor/sessions", instructor).andExpect(jsonPath("$.length()").value(2));
		api.get("/api/me/courses/" + other.id() + "/sessions", student).andExpect(status().isForbidden());
	}

	@Test
	void sessionsCanBeRescheduledAndCancelled() throws Exception {
		var admin = api.newOrg();
		var course = api.publishedCourse(admin, "Office hours", 0);
		Instant start = Instant.now().plus(1, ChronoUnit.DAYS);
		String id = read(api.post("/api/instructor/courses/" + course.id() + "/sessions", session("Office hours", start, 30),
				admin), "$.id");

		Instant later = start.plus(2, ChronoUnit.HOURS);
		api.patch("/api/instructor/sessions/" + id,
				Map.of("startsAt", later.toString(), "endsAt", later.plus(30, ChronoUnit.MINUTES).toString()), admin)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.startsAt").value(later.toString()));
		api.patch("/api/instructor/sessions/" + id, Map.of("endsAt", start.toString()), admin)
			.andExpect(status().isBadRequest());

		api.post("/api/instructor/sessions/" + id + "/cancel", null, admin).andExpect(jsonPath("$.cancelled").value(true));
		api.delete("/api/instructor/sessions/" + id, admin).andExpect(status().isNoContent());
		api.get("/api/instructor/sessions", admin).andExpect(jsonPath("$.length()").value(0));
	}

	@Test
	void onlyCourseStaffSchedule() throws Exception {
		var admin = api.newOrg();
		var owner = api.member(admin, "INSTRUCTOR");
		var other = api.member(admin, "INSTRUCTOR");
		var course = api.publishedCourse(owner, "Owned", 0);
		api.post("/api/instructor/courses/" + course.id() + "/sessions",
				session("Hijack", Instant.now().plus(1, ChronoUnit.DAYS), 30), other)
			.andExpect(status().isForbidden());
	}

	@Test
	void rangesAreValidated() throws Exception {
		var admin = api.newOrg();
		Instant now = Instant.now();
		api.get("/api/me/schedule?from=" + now + "&to=" + now.minus(1, ChronoUnit.DAYS), admin)
			.andExpect(status().isBadRequest());
		api.get("/api/me/schedule?from=" + now + "&to=" + now.plus(200, ChronoUnit.DAYS), admin)
			.andExpect(status().isBadRequest());
	}
}
