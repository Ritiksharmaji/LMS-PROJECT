package com.orbitly.schedule;

import java.time.Instant;
import java.util.UUID;

import com.orbitly.common.persistence.TenantEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "live_sessions")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class LiveSession extends TenantEntity {

	enum Kind {
		LIVE_CLASS, OFFICE_HOURS, STUDY_GROUP, WORKSHOP
	}

	@Column(nullable = false)
	private UUID courseId;

	@Column(nullable = false)
	private UUID hostId;

	@Column(nullable = false)
	private String title;

	private String description;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private Kind kind;

	@Column(nullable = false)
	private Instant startsAt;

	@Column(nullable = false)
	private Instant endsAt;

	private String meetingUrl;

	private String location;

	private Instant cancelledAt;

	LiveSession(UUID orgId, UUID courseId, UUID hostId) {
		setOrgId(orgId);
		this.courseId = courseId;
		this.hostId = hostId;
	}
}
