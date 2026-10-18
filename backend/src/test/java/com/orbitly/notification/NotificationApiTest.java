package com.orbitly.notification;

import static com.orbitly.support.Api.PASSWORD;
import static com.orbitly.support.Api.read;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.orbitly.support.Api;
import com.orbitly.support.IntegrationTest;
import com.orbitly.support.RecordingMailer;

@IntegrationTest
class NotificationApiTest {

	@Autowired
	Api api;

	@Autowired
	RecordingMailer mail;

	@Autowired
	DeadlineReminderJob reminders;

	@Test
	void invitesAreEmailed() throws Exception {
		var admin = api.newOrg();
		String email = "invitee-" + admin.orgSlug() + "@example.com";
		api.post("/api/admin/invites", Map.of("emails", List.of(email), "role", "INSTRUCTOR"), admin);
		var sent = mail.last(email);
		assertThat(sent.subject()).contains("invited");
		assertThat(sent.text()).contains("/invite/").contains("an instructor");
		assertThat(sent.html()).contains("Accept invite");
	}

	@Test
	void forgotPasswordEmailsASingleUseLink() throws Exception {
		var admin = api.newOrg();
		api.post("/api/auth/password/forgot", Map.of("email", admin.email()), null).andExpect(status().isAccepted());
		// Unknown emails get the same answer and no mail.
		api.post("/api/auth/password/forgot", Map.of("email", "nobody@example.com"), null)
			.andExpect(status().isAccepted());
		assertThat(mail.to("nobody@example.com")).isEmpty();

		String text = mail.last(admin.email()).text();
		String token = text.substring(text.indexOf("/reset-password/") + 16).split("\\s")[0];
		api.post("/api/auth/password/reset", Map.of("token", token, "password", "my-new-password-1"), null)
			.andExpect(status().isNoContent());
		api.post("/api/auth/password/reset", Map.of("token", token, "password", "again-password-2"), null)
			.andExpect(status().isBadRequest());

		api.post("/api/auth/login", Map.of("orgSlug", admin.orgSlug(), "email", admin.email(), "password", PASSWORD),
				null)
			.andExpect(status().isUnauthorized());
		api.post("/api/auth/login",
				Map.of("orgSlug", admin.orgSlug(), "email", admin.email(), "password", "my-new-password-1"), null)
			.andExpect(status().isOk());
		api.post("/api/auth/refresh", Map.of("refreshToken", admin.refreshToken()), null)
			.andExpect(status().isUnauthorized());
	}

	@Test
	void gradingNotifiesTheLearnerInAppAndByEmail() throws Exception {
		var admin = api.newOrg();
		var instructor = api.member(admin, "INSTRUCTOR");
		var student = api.member(admin, "STUDENT");
		var course = api.publishedCourse(instructor, "Notify me", 0);
		String lesson = course.lessonIds().get(3).toString();
		api.put("/api/instructor/lessons/" + lesson + "/assignment", Map.of("maxPoints", 10), instructor);
		api.post("/api/me/enrollments", Map.of("courseId", course.id().toString()), student);
		String sub = read(api.post("/api/me/lessons/" + lesson + "/assignment/submission", Map.of("body", "Work"),
				student), "$.id");

		api.get("/api/me/notifications", instructor)
			.andExpect(jsonPath("$.items[0].kind").value("SUBMISSION_RECEIVED"))
			.andExpect(jsonPath("$.items[0].title").value("STUDENT Person submitted Problem set"));

		api.put("/api/instructor/submissions/" + sub + "/grade", Map.of("points", 9), instructor);
		api.get("/api/me/notifications/unread-count", student).andExpect(jsonPath("$.unread").value(1));
		String id = read(api.get("/api/me/notifications", student)
			.andExpect(jsonPath("$.items[0].kind").value("SUBMISSION_GRADED"))
			.andExpect(jsonPath("$.items[0].body").value("You scored 9 / 10.")), "$.items[0].id");
		assertThat(mail.last(student.email()).subject()).isEqualTo("Problem set was graded");

		api.post("/api/me/notifications/" + id + "/read", null, student).andExpect(jsonPath("$.read").value(true));
		api.get("/api/me/notifications/unread-count", student).andExpect(jsonPath("$.unread").value(0));
		api.post("/api/me/notifications/" + id + "/read", null, instructor).andExpect(status().isNotFound());
	}

	@Test
	void optionalEmailsRespectTheSetting() throws Exception {
		var admin = api.newOrg();
		var student = api.member(admin, "STUDENT");
		var course = api.publishedCourse(admin, "Quiet please", 0);
		api.put("/api/me/notification-settings", Map.of("emailEnabled", false), student)
			.andExpect(jsonPath("$.emailEnabled").value(false));

		api.post("/api/instructor/courses/" + course.id() + "/learners",
				Map.of("userIds", List.of(student.userId().toString())), admin);
		api.get("/api/me/notifications", student).andExpect(jsonPath("$.items[0].kind").value("ENROLLED"));
		assertThat(mail.to(student.email())).noneMatch(e -> e.subject().contains("enrolled"));
	}

	@Test
	void sessionsNotifyEnrolledLearnersAndReceiptsAlwaysEmail() throws Exception {
		var admin = api.newOrg();
		var student = api.member(admin, "STUDENT");
		var course = api.publishedCourse(admin, "Live course", 1500);
		String orderId = read(api.post("/api/me/checkout", Map.of("courseId", course.id().toString()), student),
				"$.orderId");
		api.put("/api/me/notification-settings", Map.of("emailEnabled", false), student);
		api.post("/api/me/orders/" + orderId + "/test-pay", null, student);
		assertThat(mail.last(student.email()).subject()).isEqualTo("Receipt: Live course");

		Instant start = Instant.now().plus(2, ChronoUnit.DAYS);
		api.post("/api/instructor/courses/" + course.id() + "/sessions", Map.of("title", "Kickoff", "kind", "LIVE_CLASS",
				"startsAt", start.toString(), "endsAt", start.plus(1, ChronoUnit.HOURS).toString()), admin);
		api.get("/api/me/notifications", student).andExpect(jsonPath("$.items[0].title").value("New session: Kickoff"));
	}

	@Test
	void repliesNotifyTheThreadAuthor() throws Exception {
		var admin = api.newOrg();
		var student = api.member(admin, "STUDENT");
		var course = api.publishedCourse(admin, "Talk", 0);
		api.post("/api/me/enrollments", Map.of("courseId", course.id().toString()), student);
		String thread = read(api.post("/api/me/courses/" + course.id() + "/threads", Map.of("body", "Question?"), student),
				"$.thread.id");
		api.post("/api/me/threads/" + thread + "/replies", Map.of("body", "Answer!"), admin);
		api.get("/api/me/notifications", student)
			.andExpect(jsonPath("$.items[0].kind").value("THREAD_REPLY"))
			.andExpect(jsonPath("$.items[0].body").value("Answer!"));
		// The course owner hears about new threads.
		api.get("/api/me/notifications", admin).andExpect(jsonPath("$.items[0].kind").value("THREAD_CREATED"));

		api.post("/api/me/notifications/read-all", null, student).andExpect(status().isNoContent());
		api.get("/api/me/notifications?unread=true", student).andExpect(jsonPath("$.total").value(0));
	}

	@Test
	void deadlineRemindersGoOutOncePerDueDate() throws Exception {
		var admin = api.newOrg();
		var done = api.member(admin, "STUDENT");
		var pending = api.member(admin, "STUDENT");
		var course = api.publishedCourse(admin, "Due tomorrow", 0);
		String lesson = course.lessonIds().get(3).toString();
		api.put("/api/instructor/lessons/" + lesson + "/assignment",
				Map.of("dueAt", Instant.now().plus(5, ChronoUnit.HOURS).toString()), admin);
		for (var s : new Api.Session[] { done, pending }) {
			api.post("/api/me/enrollments", Map.of("courseId", course.id().toString()), s);
		}
		api.post("/api/me/lessons/" + lesson + "/assignment/submission", Map.of("body", "Early"), done);

		reminders.run();
		reminders.run();
		api.get("/api/me/notifications", pending)
			.andExpect(jsonPath("$.total").value(1))
			.andExpect(jsonPath("$.items[0].kind").value("DEADLINE_SOON"));
		api.get("/api/me/notifications?unread=true", done).andExpect(jsonPath("$.items[?(@.kind=='DEADLINE_SOON')]").isEmpty());
	}
}
