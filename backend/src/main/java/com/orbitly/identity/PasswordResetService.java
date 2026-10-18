package com.orbitly.identity;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.orbitly.common.config.OrbitlyProperties;
import com.orbitly.common.security.SecureTokens;
import com.orbitly.common.web.ApiException;

/** "Forgot password": emails a single-use link valid for one hour. */
@Service
class PasswordResetService {

	static final Duration TTL = Duration.ofHours(1);

	private final PasswordResetTokenRepository tokens;

	private final UserRepository users;

	private final TokenService sessions;

	private final PasswordEncoder passwordEncoder;

	private final ApplicationEventPublisher events;

	private final OrbitlyProperties properties;

	private final Clock clock;

	PasswordResetService(PasswordResetTokenRepository tokens, UserRepository users, TokenService sessions,
			PasswordEncoder passwordEncoder, ApplicationEventPublisher events, OrbitlyProperties properties,
			Clock clock) {
		this.tokens = tokens;
		this.users = users;
		this.sessions = sessions;
		this.passwordEncoder = passwordEncoder;
		this.events = events;
		this.properties = properties;
		this.clock = clock;
	}

	/** Always succeeds, so the response doesn't reveal whether an account exists. */
	@Transactional
	void requestReset(String email) {
		users.findByEmail(User.normalizeEmail(email)).ifPresent(user -> {
			String raw = SecureTokens.generate();
			Instant expires = clock.instant().plus(TTL);
			tokens.save(new PasswordResetToken(user.getId(), SecureTokens.hash(raw), expires));
			events.publishEvent(new IdentityEvents.PasswordResetRequested(user.getId(), user.getEmail(),
					user.getFullName(), properties.appUrl() + "/reset-password/" + raw, expires));
		});
	}

	@Transactional
	void reset(String rawToken, String newPassword) {
		PasswordResetToken token = tokens.findByTokenHash(SecureTokens.hash(rawToken))
			.filter(t -> t.getUsedAt() == null && t.getExpiresAt().isAfter(clock.instant()))
			.orElseThrow(() -> ApiException.badRequest("This reset link has expired or was already used"));
		User user = users.findById(token.getUserId()).orElseThrow(() -> ApiException.notFound("User"));
		user.setPasswordHash(passwordEncoder.encode(newPassword));
		token.setUsedAt(clock.instant());
		sessions.revokeAll(user.getId());
	}
}
