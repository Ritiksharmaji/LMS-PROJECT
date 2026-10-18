package com.orbitly.discussion;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class DiscussionDtos {

	private DiscussionDtos() {
	}

	public record NewThreadRequest(@Size(max = 200) String title, @NotBlank @Size(max = 10000) String body,
			UUID lessonId) {
	}

	public record EditThreadRequest(@Size(max = 200) String title, @NotBlank @Size(max = 10000) String body) {
	}

	public record BodyRequest(@NotBlank @Size(max = 10000) String body) {
	}

	/** {@code staff} is true for the course's instructor and admins. */
	public record Author(UUID id, String fullName, String avatarUrl, boolean staff) {
	}

	public record ThreadSummary(UUID id, UUID courseId, UUID lessonId, String title, String body, Author author,
			boolean pinned, boolean resolved, int replyCount, Instant lastActivityAt, Instant createdAt,
			Instant editedAt, boolean deleted) {
	}

	public record ReplyView(UUID id, UUID threadId, String body, Author author, boolean answer, Instant createdAt,
			Instant editedAt, boolean deleted) {
	}

	public record ThreadDetail(ThreadSummary thread, List<ReplyView> replies) {
	}
}
