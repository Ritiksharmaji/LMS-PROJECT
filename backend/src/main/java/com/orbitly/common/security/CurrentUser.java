package com.orbitly.common.security;

import java.util.UUID;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import com.orbitly.common.web.ApiException;

/**
 * The authenticated caller and the organization (tenant) their token is scoped to. Every tenant-owned query
 * filters by {@link #orgId()}.
 */
public record CurrentUser(UUID userId, UUID orgId, Role role) {

	public static CurrentUser get() {
		Authentication auth = SecurityContextHolder.getContext().getAuthentication();
		if (!(auth instanceof JwtAuthenticationToken token)) {
			throw ApiException.unauthorized("Authentication required");
		}
		var jwt = token.getToken();
		return new CurrentUser(UUID.fromString(jwt.getSubject()), UUID.fromString(jwt.getClaimAsString(TokenClaims.ORG)),
				Role.valueOf(jwt.getClaimAsString(TokenClaims.ROLE)));
	}

	public boolean is(Role r) {
		return role == r;
	}

	public boolean isStaff() {
		return role == Role.INSTRUCTOR || role == Role.ADMIN;
	}
}
