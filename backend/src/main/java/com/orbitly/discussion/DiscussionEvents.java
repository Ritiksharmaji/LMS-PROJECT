package com.orbitly.discussion;

import java.util.UUID;

public final class DiscussionEvents {

	private DiscussionEvents() {
	}

	public record ThreadCreated(UUID orgId, UUID threadId, UUID courseId, UUID authorId, UUID instructorId,
			String preview) {
	}

	public record ReplyCreated(UUID orgId, UUID threadId, UUID replyId, UUID courseId, UUID authorId,
			UUID threadAuthorId, String preview) {
	}
}
