package com.orbitly.catalog;

import java.util.UUID;

public final class CatalogEvents {

	private CatalogEvents() {
	}

	/** First publication of a course (re-publishing after archiving doesn't fire again). */
	public record CoursePublished(UUID orgId, UUID courseId, UUID instructorId, String title) {
	}
}
