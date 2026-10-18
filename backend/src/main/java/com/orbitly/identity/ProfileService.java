package com.orbitly.identity;

import java.util.List;
import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.orbitly.common.security.CurrentUser;
import com.orbitly.common.web.ApiException;
import com.orbitly.identity.IdentityDtos.ChangePasswordRequest;
import com.orbitly.identity.IdentityDtos.MeResponse;
import com.orbitly.identity.IdentityDtos.MembershipView;
import com.orbitly.identity.IdentityDtos.OrgView;
import com.orbitly.identity.IdentityDtos.UpdateProfileRequest;
import com.orbitly.identity.IdentityDtos.UserView;

@Service
class ProfileService {

	private final UserRepository users;

	private final MembershipRepository memberships;

	private final TokenService tokens;

	private final PasswordEncoder passwordEncoder;

	ProfileService(UserRepository users, MembershipRepository memberships, TokenService tokens,
			PasswordEncoder passwordEncoder) {
		this.users = users;
		this.memberships = memberships;
		this.tokens = tokens;
		this.passwordEncoder = passwordEncoder;
	}

	@Transactional(readOnly = true)
	MeResponse me(CurrentUser current) {
		Membership m = memberships.findByOrgAndUser(current.orgId(), current.userId())
			.orElseThrow(() -> ApiException.unauthorized("Membership no longer exists"));
		return new MeResponse(UserView.of(m.getUser()), OrgView.of(m.getOrganization()), m.getRole());
	}

	@Transactional(readOnly = true)
	List<MembershipView> myOrganizations(UUID userId) {
		return memberships.findAllForUser(userId)
			.stream()
			.map(m -> new MembershipView(m.getId(), OrgView.of(m.getOrganization()), m.getRole(), m.getStatus()))
			.toList();
	}

	@Transactional
	UserView updateProfile(UUID userId, UpdateProfileRequest req) {
		User user = users.findById(userId).orElseThrow(() -> ApiException.notFound("User"));
		if (req.fullName() != null) {
			user.setFullName(req.fullName().trim());
		}
		if (req.avatarUrl() != null) {
			user.setAvatarUrl(req.avatarUrl().isBlank() ? null : req.avatarUrl());
		}
		return UserView.of(user);
	}

	/** Changing the password signs out every other session. */
	@Transactional
	void changePassword(UUID userId, ChangePasswordRequest req) {
		User user = users.findById(userId).orElseThrow(() -> ApiException.notFound("User"));
		if (!passwordEncoder.matches(req.currentPassword(), user.getPasswordHash())) {
			throw ApiException.badRequest("Current password is incorrect");
		}
		user.setPasswordHash(passwordEncoder.encode(req.newPassword()));
		tokens.revokeAll(userId);
	}
}
