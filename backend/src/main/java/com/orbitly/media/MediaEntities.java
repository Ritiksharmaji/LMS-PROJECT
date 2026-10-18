package com.orbitly.media;

import java.util.UUID;

import com.orbitly.common.persistence.TenantEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

final class MediaEntities {

	private MediaEntities() {
	}

	enum FileStatus {
		PENDING, READY
	}

	enum VideoProvider {
		MUX, URL
	}

	enum VideoStatus {
		WAITING_UPLOAD, PROCESSING, READY, ERRORED
	}

	@Getter
	@Setter
	@Entity(name = "MediaFile")
	@Table(name = "media_files")
	@NoArgsConstructor(access = AccessLevel.PROTECTED)
	static class MediaFile extends TenantEntity {

		@Column(nullable = false)
		private UUID ownerId;

		private UUID courseId;

		@Enumerated(EnumType.STRING)
		@Column(nullable = false)
		private FilePurpose purpose;

		@Column(nullable = false, unique = true)
		private String storageKey;

		@Column(nullable = false)
		private String fileName;

		@Column(nullable = false)
		private String contentType;

		private long sizeBytes;

		@Enumerated(EnumType.STRING)
		@Column(nullable = false)
		private FileStatus status = FileStatus.PENDING;

		MediaFile(UUID orgId, UUID ownerId, FilePurpose purpose, String storageKey, String fileName, String contentType,
				long sizeBytes) {
			setOrgId(orgId);
			this.ownerId = ownerId;
			this.purpose = purpose;
			this.storageKey = storageKey;
			this.fileName = fileName;
			this.contentType = contentType;
			this.sizeBytes = sizeBytes;
		}
	}

	@Getter
	@Setter
	@Entity(name = "CourseResource")
	@Table(name = "course_resources")
	@NoArgsConstructor(access = AccessLevel.PROTECTED)
	static class CourseResource extends TenantEntity {

		@Column(nullable = false)
		private UUID courseId;

		private UUID lessonId;

		@Column(nullable = false)
		private String title;

		private UUID fileId;

		private String url;

		private int position;

		CourseResource(UUID orgId, UUID courseId, String title) {
			setOrgId(orgId);
			this.courseId = courseId;
			this.title = title;
		}
	}

	@Getter
	@Setter
	@Entity(name = "LessonVideo")
	@Table(name = "lesson_videos")
	@NoArgsConstructor(access = AccessLevel.PROTECTED)
	static class LessonVideo extends TenantEntity {

		@Column(nullable = false, unique = true)
		private UUID lessonId;

		@Enumerated(EnumType.STRING)
		@Column(nullable = false)
		private VideoProvider provider;

		@Enumerated(EnumType.STRING)
		@Column(nullable = false)
		private VideoStatus status;

		private String muxUploadId;

		private String muxAssetId;

		private String playbackId;

		private String url;

		private Integer durationSeconds;

		LessonVideo(UUID orgId, UUID lessonId, VideoProvider provider, VideoStatus status) {
			setOrgId(orgId);
			this.lessonId = lessonId;
			this.provider = provider;
			this.status = status;
		}
	}
}
