package com.orbitly.common.persistence;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;
import lombok.Setter;

/** An entity owned by one organization. Repositories always query it together with {@code orgId}. */
@Getter
@Setter
@MappedSuperclass
public abstract class TenantEntity extends BaseEntity {

	@Column(name = "org_id", nullable = false, updatable = false)
	private UUID orgId;
}
