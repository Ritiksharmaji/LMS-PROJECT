package com.orbitly.identity;

import java.time.Instant;
import java.util.UUID;

import com.orbitly.common.persistence.TenantEntity;
import com.orbitly.common.security.Role;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** An emailed invitation to join an organization with a given role. Only a hash of the token is stored. */
@Getter
@Setter
@Entity
@Table(name = "invites")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Invite extends TenantEntity {

	@Column(nullable = false)
	private String email;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private Role role;

	@Column(nullable = false, unique = true)
	private String tokenHash;

	private UUID invitedBy;

	@Column(nullable = false)
	private Instant expiresAt;

	private Instant acceptedAt;

	public Invite(UUID orgId, String email, Role role, String tokenHash, UUID invitedBy, Instant expiresAt) {
		setOrgId(orgId);
		this.email = User.normalizeEmail(email);
		this.role = role;
		this.tokenHash = tokenHash;
		this.invitedBy = invitedBy;
		this.expiresAt = expiresAt;
	}

	public boolean isPending(Instant now) {
		return acceptedAt == null && expiresAt.isAfter(now);
	}
}
