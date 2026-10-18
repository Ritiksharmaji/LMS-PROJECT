package com.orbitly.identity;

import java.time.Instant;
import java.util.UUID;

import com.orbitly.common.security.Role;

/** Events other modules (notifications, analytics) react to. Published inside the originating transaction. */
public final class IdentityEvents {

	private IdentityEvents() {
	}

	public record InviteCreated(UUID orgId, String orgName, String email, Role role, String link, String invitedByName,
			Instant expiresAt) {
	}

	public record MemberJoined(UUID orgId, UUID userId, Role role) {
	}
}
