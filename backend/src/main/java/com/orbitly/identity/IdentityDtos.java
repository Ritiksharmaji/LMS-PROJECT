package com.orbitly.identity;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.orbitly.common.security.Role;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class IdentityDtos {

	private IdentityDtos() {
	}

	// ---- Requests -------------------------------------------------------------------------------------------

	public record RegisterOrgRequest(@NotBlank @Size(max = 160) String orgName,
			@NotBlank @Pattern(regexp = "^[a-z0-9](?:[a-z0-9-]{1,78}[a-z0-9])$",
					message = "use 3-80 lowercase letters, digits or dashes") String orgSlug,
			@NotBlank @Size(max = 160) String fullName, @NotBlank @Email @Size(max = 254) String email,
			@NotBlank @Size(min = 8, max = 128) String password) {
	}

	public record SignupRequest(@NotBlank String orgSlug, @NotBlank @Size(max = 160) String fullName,
			@NotBlank @Email @Size(max = 254) String email, @NotBlank @Size(min = 8, max = 128) String password) {
	}

	public record LoginRequest(@NotBlank String orgSlug, @NotBlank @Email String email, @NotBlank String password) {
	}

	public record RefreshRequest(@NotBlank String refreshToken) {
	}

	public record SwitchOrgRequest(@NotNull UUID orgId) {
	}

	public record AcceptInviteRequest(@NotBlank String token, @Size(max = 160) String fullName,
			@NotBlank @Size(min = 8, max = 128) String password) {
	}

	public record UpdateProfileRequest(@Size(min = 1, max = 160) String fullName, @Size(max = 500) String avatarUrl) {
	}

	public record ChangePasswordRequest(@NotBlank String currentPassword,
			@NotBlank @Size(min = 8, max = 128) String newPassword) {
	}

	public record CreateInvitesRequest(@NotEmpty @Size(max = 100) List<@NotBlank @Email String> emails,
			@NotNull Role role) {
	}

	public record UpdateMemberRequest(Role role, Membership.Status status) {
	}

	public record UpdateOrganizationRequest(@Size(min = 1, max = 160) String name, @Size(max = 500) String logoUrl,
			@Min(0) @Max(1_000_000) Integer seatLimit, Boolean clearSeatLimit, Boolean selfSignup) {
	}

	// ---- Responses ------------------------------------------------------------------------------------------

	public record UserView(UUID id, String email, String fullName, String avatarUrl) {

		static UserView of(User u) {
			return new UserView(u.getId(), u.getEmail(), u.getFullName(), u.getAvatarUrl());
		}
	}

	public record OrgView(UUID id, String name, String slug, String logoUrl) {

		static OrgView of(Organization o) {
			return new OrgView(o.getId(), o.getName(), o.getSlug(), o.getLogoUrl());
		}
	}

	public record OrgSettingsView(UUID id, String name, String slug, String logoUrl, Integer seatLimit,
			boolean selfSignup, long seatsUsed, long pendingInvites) {
	}

	public record AuthResponse(String accessToken, String refreshToken, long expiresIn, String tokenType,
			UserView user, OrgView organization, Role role) {
	}

	public record MeResponse(UserView user, OrgView organization, Role role) {
	}

	public record MembershipView(UUID membershipId, OrgView organization, Role role, Membership.Status status) {
	}

	public record MemberView(UUID id, UUID userId, String fullName, String email, String avatarUrl, Role role,
			Membership.Status status, Instant joinedAt, Instant lastActiveAt) {

		static MemberView of(Membership m) {
			User u = m.getUser();
			return new MemberView(m.getId(), u.getId(), u.getFullName(), u.getEmail(), u.getAvatarUrl(), m.getRole(),
					m.getStatus(), m.getCreatedAt(), m.getLastActiveAt());
		}
	}

	public record MemberCounts(long everyone, long students, long instructors, long admins) {
	}

	public record InviteView(UUID id, String email, Role role, Instant expiresAt, Instant createdAt) {

		static InviteView of(Invite i) {
			return new InviteView(i.getId(), i.getEmail(), i.getRole(), i.getExpiresAt(), i.getCreatedAt());
		}
	}

	/** Returned once, at creation time; {@code link} contains the raw token. */
	public record CreatedInvite(UUID id, String email, Role role, Instant expiresAt, String link) {
	}

	public record InvitePreview(String email, Role role, OrgView organization, boolean existingAccount) {
	}
}
