package com.orbitly.media;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.orbitly.catalog.CourseCatalog;
import com.orbitly.catalog.CourseCatalog.CourseRef;
import com.orbitly.common.security.CurrentUser;
import com.orbitly.common.security.Role;
import com.orbitly.common.web.ApiException;
import com.orbitly.learning.Enrollments;
import com.orbitly.media.MediaDtos.CreateUploadRequest;
import com.orbitly.media.MediaDtos.DownloadLink;
import com.orbitly.media.MediaDtos.FileView;
import com.orbitly.media.MediaDtos.ResourceRequest;
import com.orbitly.media.MediaDtos.ResourceView;
import com.orbitly.media.MediaDtos.UploadTicket;
import com.orbitly.media.MediaEntities.CourseResource;
import com.orbitly.media.MediaEntities.FileStatus;
import com.orbitly.media.MediaEntities.MediaFile;

@Service
class MediaService {

	static final Duration UPLOAD_TTL = Duration.ofMinutes(15);

	static final Duration DOWNLOAD_TTL = Duration.ofMinutes(10);

	private final MediaFileRepository files;

	private final CourseResourceRepository resources;

	private final FileStorage storage;

	private final CourseCatalog catalog;

	private final Enrollments enrollments;

	private final Clock clock;

	MediaService(MediaFileRepository files, CourseResourceRepository resources, FileStorage storage,
			CourseCatalog catalog, Enrollments enrollments, Clock clock) {
		this.files = files;
		this.resources = resources;
		this.storage = storage;
		this.catalog = catalog;
		this.enrollments = enrollments;
		this.clock = clock;
	}

	// ---- Uploads --------------------------------------------------------------------------------------------

	@Transactional
	UploadTicket createUpload(CurrentUser me, CreateUploadRequest req) {
		FilePurpose purpose = req.purpose();
		String contentType = req.contentType().toLowerCase(Locale.ROOT).split(";")[0].trim();
		if (req.sizeBytes() > purpose.maxBytes()) {
			throw ApiException.badRequest("Files for " + purpose.name().toLowerCase().replace('_', ' ') + " can be at most "
					+ purpose.maxBytes() / (1024 * 1024) + " MB");
		}
		if (!purpose.allows(contentType)) {
			throw ApiException.badRequest("This file type isn't allowed here");
		}
		checkUploadPermission(me, purpose, req.courseId());

		String key = me.orgId() + "/" + purpose.name().toLowerCase() + "/" + UUID.randomUUID() + "/"
				+ safeName(req.fileName());
		MediaFile f = new MediaFile(me.orgId(), me.userId(), purpose, key, req.fileName().trim(), contentType,
				req.sizeBytes());
		f.setCourseId(purpose.needsCourse() ? req.courseId() : null);
		f = files.save(f);
		var target = storage.presignUpload(key, contentType, req.sizeBytes(), UPLOAD_TTL);
		return new UploadTicket(f.getId(), target.url(), target.method(), target.headers(),
				clock.instant().plus(UPLOAD_TTL));
	}

	/** Confirms the bytes arrived (and match the declared size). */
	@Transactional
	FileView complete(CurrentUser me, UUID fileId) {
		MediaFile f = files.findByIdAndOrgId(fileId, me.orgId())
			.filter(x -> x.getOwnerId().equals(me.userId()))
			.orElseThrow(() -> ApiException.notFound("File"));
		if (f.getStatus() == FileStatus.READY) {
			return view(f);
		}
		long size = storage.size(f.getStorageKey())
			.orElseThrow(() -> ApiException.badRequest("The file hasn't been uploaded yet"));
		if (size > f.getPurpose().maxBytes()) {
			storage.delete(f.getStorageKey());
			throw ApiException.badRequest("The uploaded file is too large");
		}
		f.setSizeBytes(size);
		f.setStatus(FileStatus.READY);
		return view(f);
	}

	@Transactional(readOnly = true)
	DownloadLink download(CurrentUser me, UUID fileId) {
		MediaFile f = files.findByIdAndOrgId(fileId, me.orgId())
			.filter(x -> x.getStatus() == FileStatus.READY)
			.orElseThrow(() -> ApiException.notFound("File"));
		checkReadPermission(me, f);
		return new DownloadLink(storage.presignDownload(f.getStorageKey(), f.getFileName(), DOWNLOAD_TTL),
				clock.instant().plus(DOWNLOAD_TTL));
	}

	/** Used by the local-storage public endpoint: only public-purpose files are served without a signature. */
	@Transactional(readOnly = true)
	boolean isPublic(String storageKey) {
		return files.findByStorageKey(storageKey)
			.filter(f -> f.getStatus() == FileStatus.READY && f.getPurpose().publicRead())
			.isPresent();
	}

	@Transactional(readOnly = true)
	MediaFile byKey(String storageKey) {
		return files.findByStorageKey(storageKey).orElseThrow(() -> ApiException.notFound("File"));
	}

	// ---- Course resources -----------------------------------------------------------------------------------

	@Transactional(readOnly = true)
	List<ResourceView> resources(CurrentUser me, UUID courseId, UUID lessonId) {
		CourseRef course = catalog.course(me.orgId(), courseId).orElseThrow(() -> ApiException.notFound("Course"));
		if (!enrollments.canAccess(me, course)) {
			throw ApiException.forbidden("Enroll in this course to see its resources");
		}
		return resourceViews(resources.forCourse(courseId, lessonId));
	}

	@Transactional
	ResourceView addResource(CurrentUser me, UUID courseId, ResourceRequest req) {
		staffCourse(me, courseId);
		boolean hasFile = req.fileId() != null;
		boolean hasUrl = req.url() != null && !req.url().isBlank();
		if (hasFile == hasUrl) {
			throw ApiException.badRequest("Give either a file or a link");
		}
		if (req.lessonId() != null) {
			var lesson = catalog.lesson(me.orgId(), req.lessonId()).orElseThrow(() -> ApiException.badRequest("Unknown lesson"));
			if (!lesson.courseId().equals(courseId)) {
				throw ApiException.badRequest("That lesson belongs to another course");
			}
		}
		CourseResource r = new CourseResource(me.orgId(), courseId, req.title().trim());
		r.setLessonId(req.lessonId());
		if (hasFile) {
			MediaFile f = files.findByIdAndOrgId(req.fileId(), me.orgId())
				.filter(x -> x.getStatus() == FileStatus.READY && x.getPurpose() == FilePurpose.RESOURCE
						&& courseId.equals(x.getCourseId()))
				.orElseThrow(() -> ApiException.badRequest("Upload the file for this course first"));
			r.setFileId(f.getId());
		}
		else {
			if (!req.url().startsWith("https://") && !req.url().startsWith("http://")) {
				throw ApiException.badRequest("Links must start with http:// or https://");
			}
			r.setUrl(req.url().trim());
		}
		r.setPosition(resources.countByCourseId(courseId));
		return resourceViews(List.of(resources.save(r))).get(0);
	}

	@Transactional
	void deleteResource(CurrentUser me, UUID resourceId) {
		CourseResource r = resources.findByIdAndOrgId(resourceId, me.orgId())
			.orElseThrow(() -> ApiException.notFound("Resource"));
		staffCourse(me, r.getCourseId());
		resources.delete(r);
	}

	// ---- Helpers --------------------------------------------------------------------------------------------

	private void checkUploadPermission(CurrentUser me, FilePurpose purpose, UUID courseId) {
		if (purpose.needsCourse() && courseId == null) {
			throw ApiException.badRequest("courseId is required for this kind of file");
		}
		switch (purpose) {
			case AVATAR -> {
			}
			case ORG_LOGO -> {
				if (!me.is(Role.ADMIN)) {
					throw ApiException.forbidden("Only admins can change the organization logo");
				}
			}
			case COURSE_COVER, RESOURCE -> staffCourse(me, courseId);
			case SUBMISSION -> {
				catalog.course(me.orgId(), courseId).orElseThrow(() -> ApiException.notFound("Course"));
				if (!enrollments.isEnrolled(me.userId(), courseId)) {
					throw ApiException.forbidden("Only enrolled learners can upload submissions");
				}
			}
		}
	}

	/** Public images: any member. Resources: course access. Submissions: the owner and course staff. */
	private void checkReadPermission(CurrentUser me, MediaFile f) {
		if (f.getPurpose().publicRead() || f.getOwnerId().equals(me.userId())) {
			return;
		}
		CourseRef course = catalog.course(me.orgId(), f.getCourseId()).orElseThrow(() -> ApiException.notFound("File"));
		boolean allowed = switch (f.getPurpose()) {
			case RESOURCE -> enrollments.canAccess(me, course);
			case SUBMISSION -> Enrollments.isStaff(me, course);
			default -> false;
		};
		if (!allowed) {
			throw ApiException.notFound("File");
		}
	}

	private CourseRef staffCourse(CurrentUser me, UUID courseId) {
		CourseRef course = catalog.course(me.orgId(), courseId).orElseThrow(() -> ApiException.notFound("Course"));
		if (!Enrollments.isStaff(me, course)) {
			throw ApiException.forbidden("Only this course's instructor or an admin can do that");
		}
		return course;
	}

	private List<ResourceView> resourceViews(List<CourseResource> list) {
		Map<UUID, MediaFile> byId = files
			.findAllById(list.stream().map(CourseResource::getFileId).filter(id -> id != null).toList())
			.stream()
			.collect(Collectors.toMap(MediaFile::getId, Function.identity()));
		return list.stream().map(r -> {
			MediaFile f = r.getFileId() == null ? null : byId.get(r.getFileId());
			return new ResourceView(r.getId(), r.getCourseId(), r.getLessonId(), r.getTitle(), f == null ? "LINK" : "FILE",
					r.getFileId(), f == null ? null : f.getFileName(), f == null ? null : f.getSizeBytes(),
					f == null ? null : f.getContentType(), r.getUrl(), r.getPosition());
		}).toList();
	}

	FileView view(MediaFile f) {
		String url = f.getPurpose().publicRead() && f.getStatus() == FileStatus.READY ? storage.publicUrl(f.getStorageKey())
				: null;
		return new FileView(f.getId(), f.getPurpose(), f.getFileName(), f.getContentType(), f.getSizeBytes(),
				f.getStatus(), url, f.getCreatedAt());
	}

	static String safeName(String name) {
		String n = name.trim().replaceAll("[^A-Za-z0-9._-]+", "_");
		if (n.length() > 120) {
			n = n.substring(n.length() - 120);
		}
		return n.isEmpty() || n.equals(".") || n.equals("..") ? "file" : n;
	}

	Instant now() {
		return clock.instant();
	}
}
