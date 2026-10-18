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

@Getter
@Setter
@Entity
@Table(name = "password_reset_tokens")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class PasswordResetToken extends BaseEntity {

	@Column(nullable = false)
	private UUID userId;

	@Column(nullable = false, unique = true)
	private String tokenHash;

	@Column(nullable = false)
	private Instant expiresAt;

	private Instant usedAt;

	PasswordResetToken(UUID userId, String tokenHash, Instant expiresAt) {
		this.userId = userId;
		this.tokenHash = tokenHash;
		this.expiresAt = expiresAt;
	}
}
