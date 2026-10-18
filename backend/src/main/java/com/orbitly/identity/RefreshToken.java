package com.orbitly.identity;

import java.time.Instant;
import java.util.UUID;

import com.orbitly.common.persistence.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** A rotating, single-use refresh token bound to one user and one organization. */
@Getter
@Setter
@Entity
@Table(name = "refresh_tokens")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RefreshToken extends BaseEntity {

	@Column(nullable = false)
	private UUID userId;

	@Column(nullable = false)
	private UUID orgId;

	@Column(nullable = false, unique = true)
	private String tokenHash;

	@Column(nullable = false)
	private Instant expiresAt;

	private Instant revokedAt;

	public RefreshToken(UUID userId, UUID orgId, String tokenHash, Instant expiresAt) {
		this.userId = userId;
		this.orgId = orgId;
		this.tokenHash = tokenHash;
		this.expiresAt = expiresAt;
	}

	public boolean isUsable(Instant now) {
		return revokedAt == null && expiresAt.isAfter(now);
	}
}
