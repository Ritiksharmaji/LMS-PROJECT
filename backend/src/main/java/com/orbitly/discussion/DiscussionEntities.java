package com.orbitly.discussion;

import java.time.Instant;
import java.util.UUID;

import com.orbitly.common.persistence.TenantEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

final class DiscussionEntities {

	private DiscussionEntities() {
	}

	@Getter
	@Setter
	@Entity(name = "DiscussionThread")
	@Table(name = "discussion_threads")
	@NoArgsConstructor(access = AccessLevel.PROTECTED)
	static class DiscussionThread extends TenantEntity {

		@Column(nullable = false)
		private UUID courseId;

		private UUID lessonId;

		@Column(nullable = false)
		private UUID authorId;

		private String title;

		@Column(nullable = false)
		private String body;

		private boolean pinned;

		private boolean resolved;

		private int replyCount;

		@Column(nullable = false)
		private Instant lastActivityAt;

		private Instant editedAt;

		private Instant deletedAt;

		DiscussionThread(UUID orgId, UUID courseId, UUID authorId, String body, Instant now) {
			setOrgId(orgId);
			this.courseId = courseId;
			this.authorId = authorId;
			this.body = body;
			this.lastActivityAt = now;
		}
	}

	@Getter
	@Setter
	@Entity(name = "DiscussionReply")
	@Table(name = "discussion_replies")
	@NoArgsConstructor(access = AccessLevel.PROTECTED)
	static class DiscussionReply extends TenantEntity {

		@Column(nullable = false)
		private UUID threadId;

		@Column(nullable = false)
		private UUID authorId;

		@Column(nullable = false)
		private String body;

		private boolean answer;

		private Instant editedAt;

		private Instant deletedAt;

		DiscussionReply(UUID orgId, UUID threadId, UUID authorId, String body) {
			setOrgId(orgId);
			this.threadId = threadId;
			this.authorId = authorId;
			this.body = body;
		}
	}
}
