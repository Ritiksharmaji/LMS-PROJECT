package com.orbitly.identity;

import java.util.Collection;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.orbitly.common.security.Role;

/**
 * Read-only access to people and organizations for other modules, so they never touch identity tables directly.
 */
@Service
public class UserDirectory {

	public record Person(UUID id, String fullName, String email, String avatarUrl) {
	}

	public record OrgSummary(UUID id, String name, String slug, String logoUrl) {
	}

	private final UserRepository users;

	private final OrganizationRepository orgs;

	private final MembershipRepository memberships;

	UserDirectory(UserRepository users, OrganizationRepository orgs, MembershipRepository memberships) {
		this.users = users;
		this.orgs = orgs;
		this.memberships = memberships;
	}

	@Transactional(readOnly = true)
	public Map<UUID, Person> people(Collection<UUID> ids) {
		if (ids.isEmpty()) {
			return Map.of();
		}
		return users.findAllById(ids).stream().map(UserDirectory::person).collect(Collectors.toMap(Person::id, Function.identity()));
	}

	@Transactional(readOnly = true)
	public Optional<Person> person(UUID id) {
		return users.findById(id).map(UserDirectory::person);
	}

	@Transactional(readOnly = true)
	public Optional<OrgSummary> orgBySlug(String slug) {
		return orgs.findBySlug(slug.toLowerCase()).map(UserDirectory::org);
	}

	@Transactional(readOnly = true)
	public Optional<OrgSummary> org(UUID id) {
		return orgs.findById(id).map(UserDirectory::org);
	}

	/** The member's role in the organization, if they are an active member. */
	@Transactional(readOnly = true)
	public Optional<Role> activeRole(UUID orgId, UUID userId) {
		return memberships.findByOrgAndUser(orgId, userId).filter(Membership::isActive).map(Membership::getRole);
	}

	@Transactional(readOnly = true)
	public long activeMembers(UUID orgId, Role role) {
		return role == null ? memberships.countActive(orgId) : memberships.countActiveByRole(orgId, role);
	}

	private static Person person(User u) {
		return new Person(u.getId(), u.getFullName(), u.getEmail(), u.getAvatarUrl());
	}

	private static OrgSummary org(Organization o) {
		return new OrgSummary(o.getId(), o.getName(), o.getSlug(), o.getLogoUrl());
	}
}
