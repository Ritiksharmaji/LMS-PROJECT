package com.orbitly.discussion;

import static com.orbitly.support.Api.read;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.orbitly.support.Api;
import com.orbitly.support.IntegrationTest;

@IntegrationTest
class DiscussionApiTest {

	@Autowired
	Api api;

	@Test
	void learnersAskAndStaffAnswer() throws Exception {
		var admin = api.newOrg();
		var instructor = api.member(admin, "INSTRUCTOR");
		var student = api.member(admin, "STUDENT");
		var course = api.publishedCourse(instructor, "Intro to ML", 0);
		api.post("/api/me/enrollments", Map.of("courseId", course.id().toString()), student);

		String threadId = read(api.post("/api/me/courses/" + course.id() + "/threads", Map.of("body",
				"Why does a learning rate that's too high make the loss bounce around?", "lessonId",
				course.lessonIds().get(0).toString()), student)
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.thread.author.staff").value(false)), "$.thread.id");

		String replyId = read(api.post("/api/me/threads/" + threadId + "/replies",
				Map.of("body", "Each step overshoots the minimum."), instructor)
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.author.staff").value(true)), "$.id");

		api.put("/api/me/replies/" + replyId + "/answer", null, student).andExpect(jsonPath("$.answer").value(true));
		api.get("/api/me/threads/" + threadId, student)
			.andExpect(jsonPath("$.thread.resolved").value(true))
			.andExpect(jsonPath("$.thread.replyCount").value(1))
			.andExpect(jsonPath("$.replies[0].answer").value(true));

		api.get("/api/me/courses/" + course.id() + "/threads?lessonId=" + course.lessonIds().get(0), student)
			.andExpect(jsonPath("$.total").value(1));
		api.get("/api/me/courses/" + course.id() + "/threads?unresolved=true", student)
			.andExpect(jsonPath("$.total").value(0));
	}

	@Test
	void pinnedThreadsComeFirstAndOnlyStaffPin() throws Exception {
		var admin = api.newOrg();
		var student = api.member(admin, "STUDENT");
		var course = api.publishedCourse(admin, "Pins", 0);
		api.post("/api/me/enrollments", Map.of("courseId", course.id().toString()), student);
		String first = read(api.post("/api/me/courses/" + course.id() + "/threads", Map.of("body", "Welcome!"), admin),
				"$.thread.id");
		api.post("/api/me/courses/" + course.id() + "/threads", Map.of("body", "Later question"), student);

		api.put("/api/me/threads/" + first + "/pinned", null, student).andExpect(status().isForbidden());
		api.put("/api/me/threads/" + first + "/pinned", null, admin).andExpect(jsonPath("$.thread.pinned").value(true));
		api.get("/api/me/courses/" + course.id() + "/threads", student)
			.andExpect(jsonPath("$.items[0].body").value("Welcome!"))
			.andExpect(jsonPath("$.total").value(2));
	}

	@Test
	void authorsEditTheirPostsAndStaffModerate() throws Exception {
		var admin = api.newOrg();
		var s1 = api.member(admin, "STUDENT");
		var s2 = api.member(admin, "STUDENT");
		var course = api.publishedCourse(admin, "Moderation", 0);
		for (var s : new Api.Session[] { s1, s2 }) {
			api.post("/api/me/enrollments", Map.of("courseId", course.id().toString()), s);
		}
		String t = read(api.post("/api/me/courses/" + course.id() + "/threads", Map.of("body", "Original"), s1),
				"$.thread.id");

		api.patch("/api/me/threads/" + t, Map.of("body", "Edited"), s2).andExpect(status().isForbidden());
		api.patch("/api/me/threads/" + t, Map.of("body", "Edited"), s1)
			.andExpect(jsonPath("$.thread.body").value("Edited"))
			.andExpect(jsonPath("$.thread.editedAt").isNotEmpty());

		String r = read(api.post("/api/me/threads/" + t + "/replies", Map.of("body", "Spam"), s2), "$.id");
		api.delete("/api/me/replies/" + r, admin).andExpect(status().isNoContent());
		api.get("/api/me/threads/" + t, s1)
			.andExpect(jsonPath("$.thread.replyCount").value(0))
			.andExpect(jsonPath("$.replies[0].body").value("[deleted]"));

		api.delete("/api/me/threads/" + t, s2).andExpect(status().isForbidden());
		api.delete("/api/me/threads/" + t, s1).andExpect(status().isNoContent());
		api.get("/api/me/courses/" + course.id() + "/threads", s1).andExpect(jsonPath("$.total").value(0));
	}

	@Test
	void nonLearnersCantReadTheDiscussion() throws Exception {
		var admin = api.newOrg();
		var outsider = api.member(admin, "STUDENT");
		var course = api.publishedCourse(admin, "Members only", 0);
		api.get("/api/me/courses/" + course.id() + "/threads", outsider).andExpect(status().isForbidden());
		api.post("/api/me/courses/" + course.id() + "/threads", Map.of("body", "Hi"), outsider)
			.andExpect(status().isForbidden());
	}
}
