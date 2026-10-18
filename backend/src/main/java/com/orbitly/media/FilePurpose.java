package com.orbitly.media;

import java.util.Set;

/**
 * What a file is for. Decides who may upload it, who may read it, its size limit and allowed types. Images used on
 * public pages (avatars, logos, covers) get a public URL; everything else is served through short-lived signed links.
 */
public enum FilePurpose {

	AVATAR(5, true, Kinds.IMAGES), ORG_LOGO(5, true, Kinds.IMAGES), COURSE_COVER(5, true, Kinds.IMAGES),
	RESOURCE(100, false, Set.of()), SUBMISSION(50, false, Kinds.DOCUMENTS);

	private final long maxBytes;

	private final boolean publicRead;

	/** Allowed content types; empty means any. */
	private final Set<String> contentTypes;

	FilePurpose(int maxMegabytes, boolean publicRead, Set<String> contentTypes) {
		this.maxBytes = maxMegabytes * 1024L * 1024L;
		this.publicRead = publicRead;
		this.contentTypes = contentTypes;
	}

	public long maxBytes() {
		return maxBytes;
	}

	public boolean publicRead() {
		return publicRead;
	}

	public boolean allows(String contentType) {
		return contentTypes.isEmpty() || contentTypes.contains(contentType);
	}

	public boolean needsCourse() {
		return this == COURSE_COVER || this == RESOURCE || this == SUBMISSION;
	}

	private static final class Kinds {

		static final Set<String> IMAGES = Set.of("image/png", "image/jpeg", "image/webp", "image/gif");

		static final Set<String> DOCUMENTS = Set.of("application/pdf", "application/zip", "application/x-zip-compressed",
				"application/x-ipynb+json", "application/json", "text/plain", "text/csv", "text/markdown",
				"application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
				"application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
				"application/vnd.ms-powerpoint",
				"application/vnd.openxmlformats-officedocument.presentationml.presentation", "image/png", "image/jpeg",
				"application/octet-stream");
	}
}
