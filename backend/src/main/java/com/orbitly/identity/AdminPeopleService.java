package com.orbitly.identity;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.UUID;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.orbitly.common.config.OrbitlyProperties;
import com.orbitly.common.security.CurrentUser;
import com.orbitly.common.security.Role;
import com.orbitly.common.security.SecureTokens;
import com.orbitly.common.web.ApiException;
import com.orbitly.common.web.PageResponse;
import com.orbitly.identity.IdentityDtos.CreateInvitesRequest;
import com.orbitly.identity.IdentityDtos.CreatedInvite;
import com.orbitly.identity.IdentityDtos.InviteView;
import com.orbitly.identity.IdentityDtos.MemberCounts;
import com.orbitly.identity.IdentityDtos.MemberView;
import com.orbitly.identity.IdentityDtos.OrgSettingsView;
import com.orbitly.identity.IdentityDtos.UpdateMemberRequest;
import com.orbitly.identity.IdentityDtos.UpdateOrganizationRequest;

/** The admin "People" area: members, roles, invites, seats and organization settings. */
@Service
class AdminPeopleService {

	static final Duration INVITE_TTL = Duration.ofDays(14);

	private final OrganizationRepository orgs;

	private final UserRepository users;

	private final MembershipRepository memberships;

	private final InviteRepository invites;

	private final ApplicationEventPublisher events;

	private final OrbitlyProperties properties;

	private final Clock clock;

	AdminPeopleService(OrganizationRepository orgs, UserRepository users, MembershipRepository memberships,
			InviteRepository invites, ApplicationEventPublisher events, OrbitlyProperties properties, Clock clock) {
		this.orgs = orgs;
		this.users = users;
		this.memberships = memberships;
		this.invites = invites;
		this.events = events;
		this.properties = properties;
		this.clock = clock;
	}

	@Transactional(readOnly = true)
	PageResponse<MemberView> members(CurrentUser admin, Role role, String q, int page, int size) {
		String query = q == null ? "" : q.trim().toLowerCase();
		var pageable = PageRequest.of(page, Math.min(size, 100), Sort.by(Sort.Direction.DESC, "createdAt"));
		return PageResponse.of(memberships.search(admin.orgId(), role, query, pageable), MemberView::of);
	}

	@Transactional(readOnly = true)
	MemberCounts counts(CurrentUser admin) {
		UUID org = admin.orgId();
		return new MemberCounts(memberships.countActive(org), memberships.countActiveByRole(org, Role.STUDENT),
				memberships.countActiveByRole(org, Role.INSTRUCTOR), memberships.countActiveByRole(org, Role.ADMIN));
	}

	@Transactional
	MemberView updateMember(CurrentUser admin, UUID membershipId, UpdateMemberRequest req) {
		Membership m = memberships.findInOrg(membershipId, admin.orgId())
			.orElseThrow(() -> ApiException.notFound("Member"));
		boolean losesAdmin = m.getRole() == Role.ADMIN && m.isActive()
				&& ((req.role() != null && req.role() != Role.ADMIN) || req.status() == Membership.Status.SUSPENDED);
		if (losesAdmin) {
			requireAnotherAdmin(admin, m);
		}
		if (req.status() == Membership.Status.ACTIVE && !m.isActive()) {
			Organization org = m.getOrganization();
			if (org.getSeatLimit() != null && memberships.countActive(org.getId()) >= org.getSeatLimit()) {
				throw ApiException.conflict("No free seats to reactivate this member");
			}
		}
		if (req.role() != null) {
			m.setRole(req.role());
		}
		if (req.status() != null) {
			m.setStatus(req.status());
		}
		return MemberView.of(m);
	}

	@Transactional
	void removeMember(CurrentUser admin, UUID membershipId) {
		Membership m = memberships.findInOrg(membershipId, admin.orgId())
			.orElseThrow(() -> ApiException.notFound("Member"));
		if (m.getRole() == Role.ADMIN && m.isActive()) {
			requireAnotherAdmin(admin, m);
		}
		memberships.delete(m);
	}

	@Transactional
	List<CreatedInvite> invite(CurrentUser admin, CreateInvitesRequest req) {
		Organization org = orgs.findById(admin.orgId()).orElseThrow(() -> ApiException.notFound("Organization"));
		User inviter = users.findById(admin.userId()).orElseThrow(() -> ApiException.notFound("User"));
		Instant now = clock.instant();
		Instant expires = now.plus(INVITE_TTL);
		var emails = new LinkedHashSet<String>();
		req.emails().forEach(e -> emails.add(User.normalizeEmail(e)));

		if (org.getSeatLimit() != null) {
			long committed = memberships.countActive(org.getId()) + invites.countPending(org.getId(), now);
			if (committed + emails.size() > org.getSeatLimit()) {
				throw ApiException.conflict("Not enough free seats for " + emails.size() + " more people");
			}
		}

		List<CreatedInvite> created = new ArrayList<>();
		for (String email : emails) {
			var existingUser = users.findByEmail(email);
			if (existingUser.isPresent()
					&& memberships.findByOrgAndUser(org.getId(), existingUser.get().getId()).isPresent()) {
				continue; // already a member
			}
			String raw = SecureTokens.generate();
			Invite invite = invites
				.save(new Invite(org.getId(), email, req.role(), SecureTokens.hash(raw), admin.userId(), expires));
			String link = properties.appUrl() + "/invite/" + raw;
			created.add(new CreatedInvite(invite.getId(), email, invite.getRole(), expires, link));
			events.publishEvent(new IdentityEvents.InviteCreated(org.getId(), org.getName(), email, req.role(), link,
					inviter.getFullName(), expires));
		}
		return created;
	}

	@Transactional(readOnly = true)
	List<InviteView> pendingInvites(CurrentUser admin) {
		return invites.findPending(admin.orgId(), clock.instant()).stream().map(InviteView::of).toList();
	}

	@Transactional
	void revokeInvite(CurrentUser admin, UUID inviteId) {
		Invite invite = invites.findByIdAndOrgId(inviteId, admin.orgId())
			.orElseThrow(() -> ApiException.notFound("Invite"));
		invites.delete(invite);
	}

	@Transactional(readOnly = true)
	OrgSettingsView organization(CurrentUser admin) {
		Organization org = orgs.findById(admin.orgId()).orElseThrow(() -> ApiException.notFound("Organization"));
		return settings(org);
	}

	@Transactional
	OrgSettingsView updateOrganization(CurrentUser admin, UpdateOrganizationRequest req) {
		Organization org = orgs.findById(admin.orgId()).orElseThrow(() -> ApiException.notFound("Organization"));
		if (req.name() != null) {
			org.setName(req.name().trim());
		}
		if (req.logoUrl() != null) {
			org.setLogoUrl(req.logoUrl().isBlank() ? null : req.logoUrl());
		}
		if (Boolean.TRUE.equals(req.clearSeatLimit())) {
			org.setSeatLimit(null);
		}
		else if (req.seatLimit() != null) {
			org.setSeatLimit(req.seatLimit());
		}
		if (req.selfSignup() != null) {
			org.setSelfSignup(req.selfSignup());
		}
		return settings(org);
	}

	private OrgSettingsView settings(Organization org) {
		return new OrgSettingsView(org.getId(), org.getName(), org.getSlug(), org.getLogoUrl(), org.getSeatLimit(),
				org.isSelfSignup(), memberships.countActive(org.getId()),
				invites.countPending(org.getId(), clock.instant()));
	}

	private void requireAnotherAdmin(CurrentUser admin, Membership target) {
		if (memberships.countActiveByRole(admin.orgId(), Role.ADMIN) <= 1) {
			throw ApiException.conflict("An organization needs at least one active admin");
		}
	}
}
