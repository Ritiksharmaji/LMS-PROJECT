package com.orbitly.identity;

import java.time.Clock;
import java.time.Instant;

import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.orbitly.common.config.OrbitlyProperties;
import com.orbitly.common.security.SecureTokens;
import com.orbitly.common.security.TokenClaims;
import com.orbitly.common.web.ApiException;
import com.orbitly.identity.IdentityDtos.AuthResponse;
import com.orbitly.identity.IdentityDtos.OrgView;
import com.orbitly.identity.IdentityDtos.UserView;

/** Issues short-lived access JWTs and rotating refresh tokens for a membership. */
@Service
class TokenService {

	private final JwtEncoder encoder;

	private final RefreshTokenRepository refreshTokens;

	private final OrbitlyProperties.Jwt jwt;

	private final Clock clock;

	TokenService(JwtEncoder encoder, RefreshTokenRepository refreshTokens, OrbitlyProperties properties, Clock clock) {
		this.encoder = encoder;
		this.refreshTokens = refreshTokens;
		this.jwt = properties.jwt();
		this.clock = clock;
	}

	@Transactional
	AuthResponse issue(Membership membership) {
		if (!membership.isActive()) {
			throw ApiException.forbidden("Your account in this organization is suspended");
		}
		Instant now = clock.instant();
		membership.setLastActiveAt(now);
		User user = membership.getUser();
		Organization org = membership.getOrganization();

		JwtClaimsSet claims = JwtClaimsSet.builder()
			.issuer(jwt.issuer())
			.subject(user.getId().toString())
			.issuedAt(now)
			.expiresAt(now.plus(jwt.accessTokenTtl()))
			.claim(TokenClaims.ORG, org.getId().toString())
			.claim(TokenClaims.ROLE, membership.getRole().name())
			.claim(TokenClaims.NAME, user.getFullName())
			.build();
		String access = encoder
			.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
			.getTokenValue();

		String refresh = SecureTokens.generate();
		refreshTokens.save(new RefreshToken(user.getId(), org.getId(), SecureTokens.hash(refresh),
				now.plus(jwt.refreshTokenTtl())));

		return new AuthResponse(access, refresh, jwt.accessTokenTtl().toSeconds(), "Bearer", UserView.of(user),
				OrgView.of(org), membership.getRole());
	}

	/**
	 * Validates and revokes a refresh token (single use), returning it so the caller can issue a new pair. Commits
	 * even when it rejects the token, so a detected replay still revokes the user's sessions.
	 */
	@Transactional(noRollbackFor = ApiException.class)
	RefreshToken consume(String rawToken) {
		Instant now = clock.instant();
		RefreshToken token = refreshTokens.findByTokenHash(SecureTokens.hash(rawToken))
			.orElseThrow(() -> ApiException.unauthorized("Invalid refresh token"));
		if (token.getRevokedAt() != null) {
			// A revoked token being replayed means it may have leaked: end every session for this user.
			refreshTokens.revokeAllForUser(token.getUserId(), now);
			throw ApiException.unauthorized("Refresh token was already used");
		}
		if (!token.isUsable(now)) {
			throw ApiException.unauthorized("Refresh token expired");
		}
		token.setRevokedAt(now);
		return token;
	}

	@Transactional
	void revoke(String rawToken) {
		refreshTokens.findByTokenHash(SecureTokens.hash(rawToken)).ifPresent(t -> {
			if (t.getRevokedAt() == null) {
				t.setRevokedAt(clock.instant());
			}
		});
	}

	@Transactional
	void revokeAll(java.util.UUID userId) {
		refreshTokens.revokeAllForUser(userId, clock.instant());
	}
}
