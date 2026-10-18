package com.orbitly.media;

import static com.orbitly.support.Api.read;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.orbitly.common.security.WebhookSignatures;
import com.orbitly.support.Api;
import com.orbitly.support.Api.Session;
import com.orbitly.support.IntegrationTest;

@IntegrationTest
class MediaApiTest {

	@Autowired
	Api api;

	@Autowired
	MockMvc mvc;

	@Autowired
	LessonVideoRepository videos;

	private String upload(Session as, String purpose, String name, String type, byte[] bytes, String courseId)
			throws Exception {
		Map<String, Object> req = new HashMap<>(
				Map.of("purpose", purpose, "fileName", name, "contentType", type, "sizeBytes", bytes.length));
		if (courseId != null) {
			req.put("courseId", courseId);
		}
		var ticket = api.post("/api/me/uploads", req, as).andExpect(status().isCreated());
		String fileId = read(ticket, "$.fileId");
		String url = read(ticket, "$.uploadUrl");
		mvc.perform(put(URI.create(url)).contentType(type).content(bytes)).andExpect(status().isOk());
		api.post("/api/me/uploads/" + fileId + "/complete", null, as)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("READY"))
			.andExpect(jsonPath("$.sizeBytes").value(bytes.length));
		return fileId;
	}

	@Test
	void submissionFilesAreUploadedAttachedAndOnlyStaffCanDownload() throws Exception {
		var admin = api.newOrg();
		var instructor = api.member(admin, "INSTRUCTOR");
		var student = api.member(admin, "STUDENT");
		var classmate = api.member(admin, "STUDENT");
		var course = api.publishedCourse(instructor, "Uploads", 0);
		String assignment = course.lessonIds().get(3).toString();
		api.put("/api/instructor/lessons/" + assignment + "/assignment", Map.of(), instructor);
		for (var s : new Session[] { student, classmate }) {
			api.post("/api/me/enrollments", Map.of("courseId", course.id().toString()), s);
		}

		byte[] pdf = "%PDF-1.4 my work".getBytes(StandardCharsets.UTF_8);
		String fileId = upload(student, "SUBMISSION", "project final.pdf", "application/pdf", pdf, course.id().toString());

		// Someone else's file can't be attached.
		api.post("/api/me/lessons/" + assignment + "/assignment/submission", Map.of("fileId", fileId), classmate)
			.andExpect(status().isBadRequest());
		api.post("/api/me/lessons/" + assignment + "/assignment/submission", Map.of("fileId", fileId), student)
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.fileName").value("project final.pdf"));

		api.get("/api/me/files/" + fileId + "/download", classmate).andExpect(status().isNotFound());
		String link = read(api.get("/api/me/files/" + fileId + "/download", instructor).andExpect(status().isOk()), "$.url");
		mvc.perform(get(URI.create(link))).andExpect(status().isOk()).andExpect(content().bytes(pdf));

		// Tampered links are refused.
		mvc.perform(get(URI.create(link.replace("sig=", "sig=x")))).andExpect(status().isForbidden());
	}

	@Test
	void uploadsAreCheckedForTypeSizeAndRole() throws Exception {
		var admin = api.newOrg();
		var student = api.member(admin, "STUDENT");
		var course = api.publishedCourse(admin, "Rules", 0);
		api.post("/api/me/uploads", Map.of("purpose", "AVATAR", "fileName", "me.exe", "contentType",
				"application/x-msdownload", "sizeBytes", 100), student)
			.andExpect(status().isBadRequest());
		api.post("/api/me/uploads", Map.of("purpose", "AVATAR", "fileName", "big.png", "contentType", "image/png",
				"sizeBytes", 50L * 1024 * 1024), student)
			.andExpect(status().isBadRequest());
		api.post("/api/me/uploads", Map.of("purpose", "ORG_LOGO", "fileName", "logo.png", "contentType", "image/png",
				"sizeBytes", 100), student)
			.andExpect(status().isForbidden());
		api.post("/api/me/uploads", Map.of("purpose", "RESOURCE", "fileName", "slides.pdf", "contentType",
				"application/pdf", "sizeBytes", 100, "courseId", course.id().toString()), student)
			.andExpect(status().isForbidden());
		// Completing before uploading fails.
		String fileId = read(api.post("/api/me/uploads", Map.of("purpose", "AVATAR", "fileName", "a.png", "contentType",
				"image/png", "sizeBytes", 10), student), "$.fileId");
		api.post("/api/me/uploads/" + fileId + "/complete", null, student).andExpect(status().isBadRequest());
	}

	@Test
	void avatarsGetAPublicUrl() throws Exception {
		var admin = api.newOrg();
		byte[] png = { (byte) 0x89, 'P', 'N', 'G', 1, 2, 3 };
		String fileId = upload(admin, "AVATAR", "me.png", "image/png", png, null);
		String publicUrl = read(api.post("/api/me/uploads/" + fileId + "/complete", null, admin), "$.publicUrl");
		mvc.perform(get(URI.create(publicUrl))).andExpect(status().isOk()).andExpect(content().bytes(png));
		api.patch("/api/me", Map.of("avatarUrl", publicUrl), admin).andExpect(jsonPath("$.avatarUrl").value(publicUrl));
	}

	@Test
	void courseResourcesHoldFilesAndLinks() throws Exception {
		var admin = api.newOrg();
		var student = api.member(admin, "STUDENT");
		var outsider = api.member(admin, "STUDENT");
		var course = api.publishedCourse(admin, "Resources", 0);
		api.post("/api/me/enrollments", Map.of("courseId", course.id().toString()), student);

		String fileId = upload(admin, "RESOURCE", "slides.pdf", "application/pdf", "slides".getBytes(),
				course.id().toString());
		api.post("/api/instructor/courses/" + course.id() + "/resources",
				Map.of("title", "Lesson slides (PDF)", "fileId", fileId, "lessonId", course.lessonIds().get(0).toString()),
				admin)
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.kind").value("FILE"));
		api.post("/api/instructor/courses/" + course.id() + "/resources",
				Map.of("title", "Practice notebook", "url", "https://colab.example.com/nb"), admin)
			.andExpect(jsonPath("$.kind").value("LINK"));
		api.post("/api/instructor/courses/" + course.id() + "/resources", Map.of("title", "Neither"), admin)
			.andExpect(status().isBadRequest());

		api.get("/api/me/courses/" + course.id() + "/resources", student)
			.andExpect(jsonPath("$.length()").value(2))
			.andExpect(jsonPath("$[0].fileName").value("slides.pdf"));
		api.get("/api/me/courses/" + course.id() + "/resources?lessonId=" + course.lessonIds().get(0), student)
			.andExpect(jsonPath("$.length()").value(1));
		api.get("/api/me/files/" + fileId + "/download", student).andExpect(status().isOk());
		api.get("/api/me/courses/" + course.id() + "/resources", outsider).andExpect(status().isForbidden());
		api.get("/api/me/files/" + fileId + "/download", outsider).andExpect(status().isNotFound());
	}

	@Test
	void lessonsCanUseAPlainVideoUrl() throws Exception {
		var admin = api.newOrg();
		var student = api.member(admin, "STUDENT");
		var course = api.publishedCourse(admin, "Video", 0);
		String lesson = course.lessonIds().get(0).toString();
		api.put("/api/instructor/lessons/" + lesson + "/video",
				Map.of("url", "https://cdn.example.com/intro.mp4", "durationSeconds", 480), admin)
			.andExpect(jsonPath("$.status").value("READY"));
		api.get("/api/me/lessons/" + lesson + "/video", student).andExpect(status().isForbidden());
		api.post("/api/me/enrollments", Map.of("courseId", course.id().toString()), student);
		api.get("/api/me/lessons/" + lesson + "/video", student)
			.andExpect(jsonPath("$.provider").value("URL"))
			.andExpect(jsonPath("$.streamUrl").value("https://cdn.example.com/intro.mp4"));
		// Mux isn't configured in tests.
		api.post("/api/instructor/lessons/" + lesson + "/video/upload", null, admin).andExpect(status().isBadRequest());
		api.put("/api/instructor/lessons/" + course.lessonIds().get(1) + "/video",
				Map.of("url", "https://cdn.example.com/x.mp4"), admin)
			.andExpect(status().isBadRequest());
	}

	@Test
	void muxWebhookMarksVideosReady() throws Exception {
		var admin = api.newOrg();
		var course = api.publishedCourse(admin, "Mux", 0);
		var lessonId = course.lessonIds().get(0);
		var v = videos.save(new MediaEntities.LessonVideo(admin.orgId(), lessonId, MediaEntities.VideoProvider.MUX,
				MediaEntities.VideoStatus.WAITING_UPLOAD));
		v.setMuxUploadId("upload_1");
		videos.save(v);

		send("{\"type\":\"video.upload.asset_created\",\"data\":{\"id\":\"upload_1\",\"asset_id\":\"asset_1\"}}");
		send("{\"type\":\"video.asset.ready\",\"data\":{\"id\":\"asset_1\",\"duration\":482.4,"
				+ "\"playback_ids\":[{\"id\":\"play_1\",\"policy\":\"public\"}]}}");

		api.get("/api/me/lessons/" + lessonId + "/video", admin)
			.andExpect(jsonPath("$.status").value("READY"))
			.andExpect(jsonPath("$.durationSeconds").value(482))
			.andExpect(jsonPath("$.streamUrl").value("https://stream.mux.com/play_1.m3u8"));

		mvc.perform(post("/api/webhooks/mux").contentType(MediaType.APPLICATION_JSON)
			.content("{}")
			.header("Mux-Signature", "t=1,v1=bad")).andExpect(status().isBadRequest());
	}

	private void send(String payload) throws Exception {
		long t = Instant.now().getEpochSecond();
		mvc.perform(post("/api/webhooks/mux").contentType(MediaType.APPLICATION_JSON)
			.content(payload)
			.header("Mux-Signature", "t=" + t + ",v1=" + WebhookSignatures.sign(t + "." + payload, "mux_test_secret")))
			.andExpect(status().isOk());
	}
}
