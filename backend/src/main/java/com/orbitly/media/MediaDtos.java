package com.orbitly.media;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import com.orbitly.media.MediaEntities.FileStatus;
import com.orbitly.media.MediaEntities.VideoProvider;
import com.orbitly.media.MediaEntities.VideoStatus;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class MediaDtos {

	private MediaDtos() {
	}

	public record CreateUploadRequest(@NotNull FilePurpose purpose, @NotBlank @Size(max = 255) String fileName,
			@NotBlank @Size(max = 120) String contentType, @NotNull @Min(1) Long sizeBytes, UUID courseId) {
	}

	/** PUT the bytes to {@code uploadUrl} with {@code headers}, then call complete. */
	public record UploadTicket(UUID fileId, String uploadUrl, String method, Map<String, String> headers,
			Instant expiresAt) {
	}

	public record FileView(UUID id, FilePurpose purpose, String fileName, String contentType, long sizeBytes,
			FileStatus status, String publicUrl, Instant createdAt) {
	}

	public record DownloadLink(String url, Instant expiresAt) {
	}

	public record ResourceRequest(@NotBlank @Size(max = 200) String title, UUID lessonId, UUID fileId,
			@Size(max = 1000) String url) {
	}

	public record ResourceView(UUID id, UUID courseId, UUID lessonId, String title, String kind, UUID fileId,
			String fileName, Long sizeBytes, String contentType, String url, int position) {
	}

	public record VideoUrlRequest(@NotBlank @Size(max = 1000) String url, @Min(0) Integer durationSeconds) {
	}

	public record VideoUploadTicket(String uploadUrl, VideoStatus status) {
	}

	/** {@code streamUrl} is an HLS URL for Mux, or the configured URL for plain videos. */
	public record VideoView(UUID lessonId, VideoProvider provider, VideoStatus status, String streamUrl,
			String thumbnailUrl, Integer durationSeconds) {
	}
}
