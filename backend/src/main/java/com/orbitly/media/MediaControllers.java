package com.orbitly.media;

import java.io.IOException;
import java.nio.file.Files;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.core.io.FileSystemResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.orbitly.common.security.CurrentUser;
import com.orbitly.common.web.ApiException;
import com.orbitly.media.MediaDtos.CreateUploadRequest;
import com.orbitly.media.MediaDtos.DownloadLink;
import com.orbitly.media.MediaDtos.FileView;
import com.orbitly.media.MediaDtos.ResourceRequest;
import com.orbitly.media.MediaDtos.ResourceView;
import com.orbitly.media.MediaDtos.UploadTicket;
import com.orbitly.media.MediaDtos.VideoUploadTicket;
import com.orbitly.media.MediaDtos.VideoUrlRequest;
import com.orbitly.media.MediaDtos.VideoView;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

final class MediaControllers {

	private MediaControllers() {
	}

	@RestController
	@RequestMapping("/api/me")
	static class MyMediaController {

		private final MediaService media;

		private final VideoService videos;

		MyMediaController(MediaService media, VideoService videos) {
			this.media = media;
			this.videos = videos;
		}

		@PostMapping("/uploads")
		@ResponseStatus(HttpStatus.CREATED)
		UploadTicket createUpload(@Valid @RequestBody CreateUploadRequest req) {
			return media.createUpload(CurrentUser.get(), req);
		}

		@PostMapping("/uploads/{fileId}/complete")
		FileView complete(@PathVariable UUID fileId) {
			return media.complete(CurrentUser.get(), fileId);
		}

		@GetMapping("/files/{fileId}/download")
		DownloadLink download(@PathVariable UUID fileId) {
			return media.download(CurrentUser.get(), fileId);
		}

		@GetMapping("/courses/{courseId}/resources")
		List<ResourceView> resources(@PathVariable UUID courseId, @RequestParam(required = false) UUID lessonId) {
			return media.resources(CurrentUser.get(), courseId, lessonId);
		}

		@GetMapping("/lessons/{lessonId}/video")
		VideoView video(@PathVariable UUID lessonId) {
			return videos.get(CurrentUser.get(), lessonId);
		}
	}

	@RestController
	@RequestMapping("/api/instructor")
	static class InstructorMediaController {

		private final MediaService media;

		private final VideoService videos;

		InstructorMediaController(MediaService media, VideoService videos) {
			this.media = media;
			this.videos = videos;
		}

		@PostMapping("/courses/{courseId}/resources")
		@ResponseStatus(HttpStatus.CREATED)
		ResourceView addResource(@PathVariable UUID courseId, @Valid @RequestBody ResourceRequest req) {
			return media.addResource(CurrentUser.get(), courseId, req);
		}

		@DeleteMapping("/resources/{id}")
		@ResponseStatus(HttpStatus.NO_CONTENT)
		void deleteResource(@PathVariable UUID id) {
			media.deleteResource(CurrentUser.get(), id);
		}

		@PutMapping("/lessons/{lessonId}/video")
		VideoView setVideoUrl(@PathVariable UUID lessonId, @Valid @RequestBody VideoUrlRequest req) {
			return videos.setUrl(CurrentUser.get(), lessonId, req);
		}

		@PostMapping("/lessons/{lessonId}/video/upload")
		VideoUploadTicket uploadVideo(@PathVariable UUID lessonId) {
			return videos.startUpload(CurrentUser.get(), lessonId);
		}

		@DeleteMapping("/lessons/{lessonId}/video")
		@ResponseStatus(HttpStatus.NO_CONTENT)
		void removeVideo(@PathVariable UUID lessonId) {
			videos.remove(CurrentUser.get(), lessonId);
		}
	}

	/** Byte transfer for local storage. Authorized by the link's signature, so no login is needed. */
	@RestController
	@RequestMapping("/api/public/media/local")
	static class LocalStorageController {

		private final Optional<LocalFileStorage> storage;

		private final LinkSigner signer;

		private final MediaService media;

		LocalStorageController(Optional<LocalFileStorage> storage, LinkSigner signer, MediaService media) {
			this.storage = storage;
			this.signer = signer;
			this.media = media;
		}

		@PutMapping("/upload")
		ResponseEntity<Void> upload(@RequestParam String key, @RequestParam long exp, @RequestParam String sig,
				HttpServletRequest request) throws IOException {
			LocalFileStorage local = local();
			if (!signer.verify("PUT", key, exp, sig)) {
				throw ApiException.forbidden("This upload link is invalid or expired");
			}
			var file = media.byKey(key);
			if (!local.write(key, request.getInputStream(), file.getPurpose().maxBytes())) {
				throw ApiException.badRequest("The file is too large");
			}
			return ResponseEntity.ok().build();
		}

		@GetMapping("/download")
		ResponseEntity<FileSystemResource> download(@RequestParam String key, @RequestParam long exp,
				@RequestParam String sig, @RequestParam(required = false) String name) throws IOException {
			if (!signer.verify("GET", key, exp, sig)) {
				throw ApiException.forbidden("This download link is invalid or expired");
			}
			return serve(key, name, true);
		}

		@GetMapping("/public")
		ResponseEntity<FileSystemResource> publicFile(@RequestParam String key) throws IOException {
			if (!media.isPublic(key)) {
				throw ApiException.notFound("File");
			}
			return serve(key, null, false);
		}

		private ResponseEntity<FileSystemResource> serve(String key, String name, boolean attachment) throws IOException {
			var path = local().resolve(key);
			if (!Files.exists(path)) {
				throw ApiException.notFound("File");
			}
			var file = media.byKey(key);
			var builder = ResponseEntity.ok().contentType(MediaType.parseMediaType(file.getContentType()));
			if (attachment) {
				builder.header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
					.filename(name != null ? name : file.getFileName(), java.nio.charset.StandardCharsets.UTF_8)
					.build()
					.toString());
			}
			else {
				builder.header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400");
			}
			return builder.body(new FileSystemResource(path));
		}

		private LocalFileStorage local() {
			return storage.orElseThrow(() -> ApiException.notFound("Not found"));
		}
	}

	@RestController
	@RequestMapping("/api/webhooks")
	static class MuxWebhookController {

		private final VideoService videos;

		MuxWebhookController(VideoService videos) {
			this.videos = videos;
		}

		@PostMapping("/mux")
		void mux(@RequestBody String payload, @RequestHeader(name = "Mux-Signature", required = false) String sig) {
			videos.handleMuxWebhook(payload, sig);
		}
	}
}
