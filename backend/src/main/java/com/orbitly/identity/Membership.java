package com.orbitly.identity;

import java.time.Instant;

import com.orbitly.common.persistence.BaseEntity;
import com.orbitly.common.security.Role;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** A user's role and status inside one organization. */
@Getter
@Setter
@Entity
@Table(name = "memberships")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Membership extends BaseEntity {

	public enum Status {
		ACTIVE, SUSPENDED
	}

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "org_id", nullable = false, updatable = false)
	private Organization organization;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false, updatable = false)
	private User user;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private Role role;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private Status status = Status.ACTIVE;

	private Instant lastActiveAt;

	public Membership(Organization organization, User user, Role role) {
		this.organization = organization;
		this.user = user;
		this.role = role;
	}

	public boolean isActive() {
		return status == Status.ACTIVE;
	}
}
