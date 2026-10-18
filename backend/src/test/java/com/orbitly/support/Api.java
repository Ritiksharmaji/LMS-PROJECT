package com.orbitly.support;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import org.springframework.boot.test.context.TestComponent;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import com.jayway.jsonpath.JsonPath;

import tools.jackson.databind.json.JsonMapper;

/** Small JSON-over-MockMvc client plus helpers that create isolated organizations and members. */
@TestComponent
public class Api {

	private static final AtomicInteger SEQ = new AtomicInteger();

	public static final String PASSWORD = "correct-horse-battery";

	private final MockMvc mvc;

	private final JsonMapper json;

	Api(MockMvc mvc, JsonMapper json) {
		this.mvc = mvc;
		this.json = json;
	}

	/** An authenticated caller. */
	public record Session(String token, String refreshToken, UUID userId, UUID orgId, String orgSlug, String email) {
	}

	public ResultActions get(String path, Session as) throws Exception {
		return mvc.perform(auth(request(HttpMethod.GET, path), as));
	}

	public ResultActions post(String path, Object body, Session as) throws Exception {
		return send(HttpMethod.POST, path, body, as);
	}

	public ResultActions put(String path, Object body, Session as) throws Exception {
		return send(HttpMethod.PUT, path, body, as);
	}

	public ResultActions patch(String path, Object body, Session as) throws Exception {
		return send(HttpMethod.PATCH, path, body, as);
	}

	public ResultActions delete(String path, Session as) throws Exception {
		return mvc.perform(auth(request(HttpMethod.DELETE, path), as));
	}

	public ResultActions send(HttpMethod method, String path, Object body, Session as) throws Exception {
		var req = request(method, path).contentType(MediaType.APPLICATION_JSON);
		if (body != null) {
			req.content(json.writeValueAsString(body));
		}
		return mvc.perform(auth(req, as));
	}

	/** Registers a fresh organization; the returned session is its first admin. */
	public Session newOrg() throws Exception {
		int n = SEQ.incrementAndGet();
		String slug = "org-" + n + "-" + UUID.randomUUID().toString().substring(0, 8);
		String body = post("/api/auth/register-organization", Map.of("orgName", "Test University " + n, "orgSlug", slug,
				"fullName", "Admin " + n, "email", "admin-" + slug + "@example.com", "password", PASSWORD), null)
			.andReturn()
			.getResponse()
			.getContentAsString();
		return session(body, slug, "admin-" + slug + "@example.com");
	}

	/** Invites someone with the given role into the admin's organization and accepts the invite. */
	public Session member(Session admin, String role) throws Exception {
		String email = role.toLowerCase() + "-" + SEQ.incrementAndGet() + "-" + admin.orgSlug() + "@example.com";
		String invites = post("/api/admin/invites", Map.of("emails", new String[] { email }, "role", role), admin)
			.andReturn()
			.getResponse()
			.getContentAsString();
		String link = JsonPath.read(invites, "$[0].link");
		String token = link.substring(link.lastIndexOf('/') + 1);
		String body = post("/api/auth/invites/accept",
				Map.of("token", token, "fullName", role + " Person", "password", PASSWORD), null)
			.andReturn()
			.getResponse()
			.getContentAsString();
		return session(body, admin.orgSlug(), email);
	}

	/** A course with ids of its lessons (in curriculum order). */
	public record CourseFixture(UUID id, String slug, java.util.List<UUID> lessonIds) {
	}

	/**
	 * Creates and publishes a course taught by {@code instructor} with one section holding a video, a reading, a quiz
	 * and an assignment lesson.
	 */
	public CourseFixture publishedCourse(Session instructor, String title, int priceCents) throws Exception {
		String course = body(post("/api/instructor/courses",
				Map.of("title", title, "tagline", "Learn " + title, "priceCents", priceCents), instructor));
		UUID courseId = UUID.fromString(JsonPath.read(course, "$.course.id"));
		String section = body(post("/api/instructor/courses/" + courseId + "/sections", Map.of("title", "Foundations"),
				instructor));
		String sectionId = JsonPath.read(section, "$.id");
		var lessons = new java.util.ArrayList<UUID>();
		for (String[] l : new String[][] { { "What is a model?", "VIDEO" }, { "Your first dataset", "READING" },
				{ "Check your understanding", "QUIZ" }, { "Problem set", "ASSIGNMENT" } }) {
			String lesson = body(post("/api/instructor/sections/" + sectionId + "/lessons",
					Map.of("title", l[0], "kind", l[1], "durationMinutes", 10, "content", "Body of " + l[0]), instructor));
			lessons.add(UUID.fromString(JsonPath.read(lesson, "$.id")));
		}
		String published = body(post("/api/instructor/courses/" + courseId + "/publish", null, instructor));
		return new CourseFixture(courseId, JsonPath.read(published, "$.course.slug"), lessons);
	}

	public static String body(ResultActions result) throws Exception {
		return result.andReturn().getResponse().getContentAsString();
	}

	public static <T> T read(ResultActions result, String path) throws Exception {
		return JsonPath.read(body(result), path);
	}

	private Session session(String authBody, String slug, String email) {
		return new Session(JsonPath.read(authBody, "$.accessToken"), JsonPath.read(authBody, "$.refreshToken"),
				UUID.fromString(JsonPath.read(authBody, "$.user.id")),
				UUID.fromString(JsonPath.read(authBody, "$.organization.id")), slug, email);
	}

	private static MockHttpServletRequestBuilder auth(MockHttpServletRequestBuilder req, Session as) {
		return as == null ? req : req.header("Authorization", "Bearer " + as.token());
	}
}
