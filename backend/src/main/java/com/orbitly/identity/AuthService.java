package com.orbitly.identity;

import java.time.Clock;
import java.util.UUID;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.orbitly.common.security.Role;
import com.orbitly.common.security.SecureTokens;
import com.orbitly.common.web.ApiException;
import com.orbitly.identity.IdentityDtos.AcceptInviteRequest;
import com.orbitly.identity.IdentityDtos.AuthResponse;
import com.orbitly.identity.IdentityDtos.InvitePreview;
import com.orbitly.identity.IdentityDtos.LoginRequest;
import com.orbitly.identity.IdentityDtos.OrgView;
import com.orbitly.identity.IdentityDtos.RegisterOrgRequest;
import com.orbitly.identity.IdentityDtos.SignupRequest;

@Service
class AuthService {

	/** Hash used when the email is unknown, so login takes the same time either way. */
	private final String dummyHash;

	private final OrganizationRepository orgs;

	private final UserRepository users;

	private final MembershipRepository memberships;

	private final InviteRepository invites;

	private final TokenService tokens;

	private final SeatPolicy seats;

	private final PasswordEncoder passwordEncoder;

	private final ApplicationEventPublisher events;

	private final Clock clock;

	AuthService(OrganizationRepository orgs, UserRepository users, MembershipRepository memberships,
			InviteRepository invites, TokenService tokens, SeatPolicy seats, PasswordEncoder passwordEncoder,
			ApplicationEventPublisher events, Clock clock) {
		this.orgs = orgs;
		this.users = users;
		this.memberships = memberships;
		this.invites = invites;
		this.tokens = tokens;
		this.seats = seats;
		this.passwordEncoder = passwordEncoder;
		this.events = events;
		this.clock = clock;
		this.dummyHash = passwordEncoder.encode("not-a-real-password");
	}

	/** Creates a new organization with the caller as its first admin. */
	@Transactional
	AuthResponse registerOrganization(RegisterOrgRequest req) {
		if (orgs.existsBySlug(req.orgSlug())) {
			throw ApiException.conflict("That organization URL is taken");
		}
		Organization org = orgs.save(new Organization(req.orgName().trim(), req.orgSlug()));
		User user = findOrCreateUser(req.email(), req.fullName(), req.password());
		return join(org, user, Role.ADMIN);
	}

	/** Self-service student sign-up for organizations that allow it. */
	@Transactional
	AuthResponse signup(SignupRequest req) {
		Organization org = orgBySlug(req.orgSlug());
		if (!org.isSelfSignup()) {
			throw ApiException.forbidden("This organization is invite-only");
		}
		User user = findOrCreateUser(req.email(), req.fullName(), req.password());
		if (memberships.findByOrgAndUser(org.getId(), user.getId()).isPresent()) {
			throw ApiException.conflict("You already have an account here. Sign in instead.");
		}
		seats.requireFreeSeat(org);
		return join(org, user, Role.STUDENT);
	}

	@Transactional
	AuthResponse login(LoginRequest req) {
		Organization org = orgBySlug(req.orgSlug());
		User user = users.findByEmail(User.normalizeEmail(req.email())).orElse(null);
		String hash = user != null ? user.getPasswordHash() : dummyHash;
		if (!passwordEncoder.matches(req.password(), hash) || user == null) {
			throw ApiException.unauthorized("Incorrect email or password");
		}
		Membership membership = memberships.findByOrgAndUser(org.getId(), user.getId())
			.orElseThrow(() -> ApiException.forbidden("You're not a member of " + org.getName()));
		return tokens.issue(membership);
	}

	@Transactional(noRollbackFor = ApiException.class)
	AuthResponse refresh(String rawRefreshToken) {
		RefreshToken old = tokens.consume(rawRefreshToken);
		Membership membership = memberships.findByOrgAndUser(old.getOrgId(), old.getUserId())
			.orElseThrow(() -> ApiException.unauthorized("Membership no longer exists"));
		return tokens.issue(membership);
	}

	@Transactional
	void logout(String rawRefreshToken) {
		tokens.revoke(rawRefreshToken);
	}

	@Transactional
	AuthResponse switchOrganization(UUID userId, UUID orgId) {
		Membership membership = memberships.findByOrgAndUser(orgId, userId)
			.orElseThrow(() -> ApiException.forbidden("You're not a member of that organization"));
		return tokens.issue(membership);
	}

	@Transactional(readOnly = true)
	InvitePreview previewInvite(String rawToken) {
		Invite invite = pendingInvite(rawToken);
		Organization org = orgs.findById(invite.getOrgId()).orElseThrow(() -> ApiException.notFound("Organization"));
		return new InvitePreview(invite.getEmail(), invite.getRole(), OrgView.of(org),
				users.existsByEmail(invite.getEmail()));
	}

	/**
	 * Accepts an invite. New people choose a password; people who already have an Orbitly account confirm theirs.
	 */
	@Transactional
	AuthResponse acceptInvite(AcceptInviteRequest req) {
		Invite invite = pendingInvite(req.token());
		Organization org = orgs.findById(invite.getOrgId()).orElseThrow(() -> ApiException.notFound("Organization"));
		User user = users.findByEmail(invite.getEmail()).orElse(null);
		if (user == null) {
			if (req.fullName() == null || req.fullName().isBlank()) {
				throw ApiException.badRequest("Full name is required");
			}
			user = users.save(new User(invite.getEmail(), passwordEncoder.encode(req.password()), req.fullName().trim()));
		}
		else if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
			throw ApiException.unauthorized("Incorrect password for " + user.getEmail());
		}
		invite.setAcceptedAt(clock.instant());

		var existing = memberships.findByOrgAndUser(org.getId(), user.getId());
		if (existing.isPresent()) {
			return tokens.issue(existing.get());
		}
		seats.requireFreeSeat(org);
		return join(org, user, invite.getRole());
	}

	private AuthResponse join(Organization org, User user, Role role) {
		Membership membership = memberships.save(new Membership(org, user, role));
		events.publishEvent(new IdentityEvents.MemberJoined(org.getId(), user.getId(), role));
		return tokens.issue(membership);
	}

	/**
	 * Returns the existing account for this email if the password matches, otherwise creates one. Prevents someone
	 * from attaching another person's existing account to a new organization.
	 */
	private User findOrCreateUser(String email, String fullName, String password) {
		var existing = users.findByEmail(User.normalizeEmail(email));
		if (existing.isPresent()) {
			if (!passwordEncoder.matches(password, existing.get().getPasswordHash())) {
				throw ApiException.conflict("An account with this email already exists. Use its password.");
			}
			return existing.get();
		}
		return users.save(new User(email, passwordEncoder.encode(password), fullName.trim()));
	}

	private Organization orgBySlug(String slug) {
		return orgs.findBySlug(slug.trim().toLowerCase()).orElseThrow(() -> ApiException.notFound("Organization"));
	}

	private Invite pendingInvite(String rawToken) {
		Invite invite = invites.findByTokenHash(SecureTokens.hash(rawToken))
			.orElseThrow(() -> ApiException.notFound("Invite"));
		if (!invite.isPending(clock.instant())) {
			throw ApiException.badRequest("This invite has expired or was already used");
		}
		return invite;
	}
}
