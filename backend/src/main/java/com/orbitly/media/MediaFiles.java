package com.orbitly.media;

import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.orbitly.common.web.ApiException;
import com.orbitly.media.MediaEntities.FileStatus;

/** Media's public API for other modules: check that an uploaded file can be attached somewhere. */
@Service
public class MediaFiles {

	public record FileRef(UUID id, String fileName, String contentType, long sizeBytes) {
	}

	private final MediaFileRepository files;

	MediaFiles(MediaFileRepository files) {
		this.files = files;
	}

	/** The file must be READY, owned by {@code ownerId}, uploaded for {@code purpose} and (if given) the course. */
	@Transactional(readOnly = true)
	public FileRef requireOwnedFile(UUID orgId, UUID ownerId, UUID fileId, FilePurpose purpose, UUID courseId) {
		return files.findByIdAndOrgId(fileId, orgId)
			.filter(f -> f.getOwnerId().equals(ownerId) && f.getPurpose() == purpose && f.getStatus() == FileStatus.READY
					&& (courseId == null || courseId.equals(f.getCourseId())))
			.map(f -> new FileRef(f.getId(), f.getFileName(), f.getContentType(), f.getSizeBytes()))
			.orElseThrow(() -> ApiException.badRequest("Upload the file first, then attach it"));
	}
}
