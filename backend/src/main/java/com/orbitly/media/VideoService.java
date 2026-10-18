package com.orbitly.media;

import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.orbitly.catalog.CourseCatalog;
import com.orbitly.catalog.CourseCatalog.CourseRef;
import com.orbitly.catalog.CourseCatalog.LessonRef;
import com.orbitly.catalog.LessonKind;
import com.orbitly.common.config.OrbitlyProperties;
import com.orbitly.common.security.CurrentUser;
import com.orbitly.common.web.ApiException;
import com.orbitly.learning.Enrollments;
import com.orbitly.media.MediaDtos.VideoUploadTicket;
import com.orbitly.media.MediaDtos.VideoUrlRequest;
import com.orbitly.media.MediaDtos.VideoView;
import com.orbitly.media.MediaEntities.LessonVideo;
import com.orbitly.media.MediaEntities.VideoProvider;
import com.orbitly.media.MediaEntities.VideoStatus;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@Service
class VideoService {

	private static final Logger log = LoggerFactory.getLogger(VideoService.class);

	private final LessonVideoRepository videos;

	private final CourseCatalog catalog;

	private final Enrollments enrollments;

	private final MuxClient mux;

	private final MediaProperties media;

	private final OrbitlyProperties app;

	private final JsonMapper json;

	private final java.time.Clock clock;

	VideoService(LessonVideoRepository videos, CourseCatalog catalog, Enrollments enrollments, MuxClient mux,
			MediaProperties media, OrbitlyProperties app, JsonMapper json, java.time.Clock clock) {
		this.videos = videos;
		this.catalog = catalog;
		this.enrollments = enrollments;
		this.mux = mux;
		this.media = media;
		this.app = app;
		this.json = json;
		this.clock = clock;
	}

	@Transactional
	VideoView setUrl(CurrentUser me, UUID lessonId, VideoUrlRequest req) {
		staffLesson(me, lessonId);
		if (!req.url().startsWith("https://") && !req.url().startsWith("http://")) {
			throw ApiException.badRequest("Video links must start with http:// or https://");
		}
		LessonVideo v = videos.findByLessonIdAndOrgId(lessonId, me.orgId())
			.orElseGet(() -> new LessonVideo(me.orgId(), lessonId, VideoProvider.URL, VideoStatus.READY));
		v.setProvider(VideoProvider.URL);
		v.setStatus(VideoStatus.READY);
		v.setUrl(req.url().trim());
		v.setDurationSeconds(req.durationSeconds());
		v.setMuxUploadId(null);
		v.setMuxAssetId(null);
		v.setPlaybackId(null);
		return view(videos.save(v));
	}

	@Transactional
	VideoUploadTicket startUpload(CurrentUser me, UUID lessonId) {
		staffLesson(me, lessonId);
		LessonVideo v = videos.findByLessonIdAndOrgId(lessonId, me.orgId())
			.orElseGet(() -> new LessonVideo(me.orgId(), lessonId, VideoProvider.MUX, VideoStatus.WAITING_UPLOAD));
		v = videos.save(v);
		var upload = mux.createUpload(app.appUrl(), v.getId().toString());
		v.setProvider(VideoProvider.MUX);
		v.setStatus(VideoStatus.WAITING_UPLOAD);
		v.setMuxUploadId(upload.id());
		v.setMuxAssetId(null);
		v.setPlaybackId(null);
		v.setUrl(null);
		return new VideoUploadTicket(upload.url(), v.getStatus());
	}

	@Transactional
	void remove(CurrentUser me, UUID lessonId) {
		staffLesson(me, lessonId);
		videos.findByLessonIdAndOrgId(lessonId, me.orgId()).ifPresent(videos::delete);
	}

	@Transactional(readOnly = true)
	VideoView get(CurrentUser me, UUID lessonId) {
		LessonRef lesson = catalog.lesson(me.orgId(), lessonId).orElseThrow(() -> ApiException.notFound("Lesson"));
		CourseRef course = catalog.course(me.orgId(), lesson.courseId()).orElseThrow(() -> ApiException.notFound("Course"));
		if (!lesson.preview() && !enrollments.canAccess(me, course)) {
			throw ApiException.forbidden("Enroll in this course to watch its videos");
		}
		return view(videos.findByLessonIdAndOrgId(lessonId, me.orgId())
			.orElseThrow(() -> ApiException.notFound("Video")));
	}

	// ---- Mux webhook ----------------------------------------------------------------------------------------

	@Transactional
	void handleMuxWebhook(String payload, String signature) {
		// Mux uses the same "t=...,v1=<hmac>" scheme as Stripe.
		if (!com.orbitly.common.security.WebhookSignatures.verify(payload, signature, media.mux().webhookSecret(),
				clock.instant())) {
			throw ApiException.badRequest("Invalid signature");
		}
		JsonNode event = json.readTree(payload);
		String type = event.path("type").asString();
		JsonNode data = event.path("data");
		switch (type) {
			case "video.upload.asset_created" -> videos.findByMuxUploadId(data.path("id").asString())
				.ifPresent(v -> {
					v.setMuxAssetId(data.path("asset_id").asString(null));
					v.setStatus(VideoStatus.PROCESSING);
				});
			case "video.asset.ready" -> findForAsset(data).ifPresent(v -> {
				v.setMuxAssetId(data.path("id").asString());
				v.setPlaybackId(data.path("playback_ids").path(0).path("id").asString(null));
				if (data.has("duration")) {
					v.setDurationSeconds((int) Math.round(data.path("duration").asDouble()));
				}
				v.setStatus(VideoStatus.READY);
			});
			case "video.asset.errored" -> findForAsset(data).ifPresent(v -> v.setStatus(VideoStatus.ERRORED));
			default -> log.debug("Ignoring Mux event {}", type);
		}
	}

	private java.util.Optional<LessonVideo> findForAsset(JsonNode data) {
		var byAsset = videos.findByMuxAssetId(data.path("id").asString());
		if (byAsset.isPresent()) {
			return byAsset;
		}
		String passthrough = data.path("passthrough").asString(null);
		if (passthrough == null) {
			return java.util.Optional.empty();
		}
		try {
			return videos.findById(UUID.fromString(passthrough));
		}
		catch (IllegalArgumentException ex) {
			return java.util.Optional.empty();
		}
	}

	private VideoView view(LessonVideo v) {
		String stream = null;
		String thumb = null;
		if (v.getProvider() == VideoProvider.URL) {
			stream = v.getUrl();
		}
		else if (v.getStatus() == VideoStatus.READY && v.getPlaybackId() != null) {
			String vt = mux.token(v.getPlaybackId(), "v");
			String tt = mux.token(v.getPlaybackId(), "t");
			stream = "https://stream.mux.com/" + v.getPlaybackId() + ".m3u8" + (vt == null ? "" : "?token=" + vt);
			thumb = "https://image.mux.com/" + v.getPlaybackId() + "/thumbnail.webp" + (tt == null ? "" : "?token=" + tt);
		}
		return new VideoView(v.getLessonId(), v.getProvider(), v.getStatus(), stream, thumb, v.getDurationSeconds());
	}

	private LessonRef staffLesson(CurrentUser me, UUID lessonId) {
		LessonRef lesson = catalog.lesson(me.orgId(), lessonId).orElseThrow(() -> ApiException.notFound("Lesson"));
		if (lesson.kind() != LessonKind.VIDEO) {
			throw ApiException.badRequest("This lesson is not a video");
		}
		CourseRef course = catalog.course(me.orgId(), lesson.courseId()).orElseThrow();
		if (!Enrollments.isStaff(me, course)) {
			throw ApiException.forbidden("Only this course's instructor or an admin can do that");
		}
		return lesson;
	}
}
