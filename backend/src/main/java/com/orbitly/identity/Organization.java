package com.orbitly.identity;

import com.orbitly.common.persistence.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** A tenant, e.g. "Northfield University". */
@Getter
@Setter
@Entity
@Table(name = "organizations")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Organization extends BaseEntity {

	@Column(nullable = false)
	private String name;

	@Column(nullable = false, unique = true)
	private String slug;

	private String logoUrl;

	/** Maximum active members; {@code null} means unlimited. */
	private Integer seatLimit;

	/** Whether people can create a student account themselves (otherwise invite-only). */
	@Column(nullable = false)
	private boolean selfSignup = true;

	public Organization(String name, String slug) {
		this.name = name;
		this.slug = slug;
	}
}
