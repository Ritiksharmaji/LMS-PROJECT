package com.orbitly.identity;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.orbitly.common.security.CurrentUser;
import com.orbitly.common.security.Role;
import com.orbitly.common.web.ApiException;
import com.orbitly.common.web.PageResponse;
import com.orbitly.identity.IdentityDtos.AcceptInviteRequest;
import com.orbitly.identity.IdentityDtos.AuthResponse;
import com.orbitly.identity.IdentityDtos.ChangePasswordRequest;
import com.orbitly.identity.IdentityDtos.CreateInvitesRequest;
import com.orbitly.identity.IdentityDtos.CreatedInvite;
import com.orbitly.identity.IdentityDtos.InvitePreview;
import com.orbitly.identity.IdentityDtos.InviteView;
import com.orbitly.identity.IdentityDtos.LoginRequest;
import com.orbitly.identity.IdentityDtos.MeResponse;
import com.orbitly.identity.IdentityDtos.MemberCounts;
import com.orbitly.identity.IdentityDtos.MemberView;
import com.orbitly.identity.IdentityDtos.MembershipView;
import com.orbitly.identity.IdentityDtos.OrgSettingsView;
import com.orbitly.identity.IdentityDtos.OrgView;
import com.orbitly.identity.IdentityDtos.RefreshRequest;
import com.orbitly.identity.IdentityDtos.RegisterOrgRequest;
import com.orbitly.identity.IdentityDtos.SignupRequest;
import com.orbitly.identity.IdentityDtos.SwitchOrgRequest;
import com.orbitly.identity.IdentityDtos.UpdateMemberRequest;
import com.orbitly.identity.IdentityDtos.UpdateOrganizationRequest;
import com.orbitly.identity.IdentityDtos.UpdateProfileRequest;
import com.orbitly.identity.IdentityDtos.UserView;

import jakarta.validation.Valid;

final class IdentityControllers {

	private IdentityControllers() {
	}

	@RestController
	@RequestMapping("/api/auth")
	static class AuthController {

		private final AuthService auth;

		private final PasswordResetService passwordResets;

		AuthController(AuthService auth, PasswordResetService passwordResets) {
			this.auth = auth;
			this.passwordResets = passwordResets;
		}

		@PostMapping("/password/forgot")
		@ResponseStatus(HttpStatus.ACCEPTED)
		void forgotPassword(@Valid @RequestBody IdentityDtos.ForgotPasswordRequest req) {
			passwordResets.requestReset(req.email());
		}

		@PostMapping("/password/reset")
		@ResponseStatus(HttpStatus.NO_CONTENT)
		void resetPassword(@Valid @RequestBody IdentityDtos.ResetPasswordRequest req) {
			passwordResets.reset(req.token(), req.password());
		}

		@PostMapping("/register-organization")
		@ResponseStatus(HttpStatus.CREATED)
		AuthResponse registerOrganization(@Valid @RequestBody RegisterOrgRequest req) {
			return auth.registerOrganization(req);
		}

		@PostMapping("/signup")
		@ResponseStatus(HttpStatus.CREATED)
		AuthResponse signup(@Valid @RequestBody SignupRequest req) {
			return auth.signup(req);
		}

		@PostMapping("/login")
		AuthResponse login(@Valid @RequestBody LoginRequest req) {
			return auth.login(req);
		}

		@PostMapping("/refresh")
		AuthResponse refresh(@Valid @RequestBody RefreshRequest req) {
			return auth.refresh(req.refreshToken());
		}

		@PostMapping("/logout")
		@ResponseStatus(HttpStatus.NO_CONTENT)
		void logout(@Valid @RequestBody RefreshRequest req) {
			auth.logout(req.refreshToken());
		}

		@GetMapping("/invites/{token}")
		InvitePreview previewInvite(@PathVariable String token) {
			return auth.previewInvite(token);
		}

		@PostMapping("/invites/accept")
		AuthResponse acceptInvite(@Valid @RequestBody AcceptInviteRequest req) {
			return auth.acceptInvite(req);
		}
	}

	@RestController
	@RequestMapping("/api/public/organizations")
	static class PublicOrganizationController {

		private final UserDirectory directory;

		PublicOrganizationController(UserDirectory directory) {
			this.directory = directory;
		}

		@GetMapping("/{slug}")
		OrgView organization(@PathVariable String slug) {
			return directory.orgBySlug(slug)
				.map(o -> new OrgView(o.id(), o.name(), o.slug(), o.logoUrl()))
				.orElseThrow(() -> ApiException.notFound("Organization"));
		}
	}

	@RestController
	@RequestMapping("/api/me")
	static class MeController {

		private final ProfileService profiles;

		private final AuthService auth;

		MeController(ProfileService profiles, AuthService auth) {
			this.profiles = profiles;
			this.auth = auth;
		}

		@GetMapping
		MeResponse me() {
			return profiles.me(CurrentUser.get());
		}

		@PatchMapping
		UserView updateProfile(@Valid @RequestBody UpdateProfileRequest req) {
			return profiles.updateProfile(CurrentUser.get().userId(), req);
		}

		@PostMapping("/password")
		@ResponseStatus(HttpStatus.NO_CONTENT)
		void changePassword(@Valid @RequestBody ChangePasswordRequest req) {
			profiles.changePassword(CurrentUser.get().userId(), req);
		}

		@GetMapping("/organizations")
		List<MembershipView> organizations() {
			return profiles.myOrganizations(CurrentUser.get().userId());
		}

		@PostMapping("/switch-organization")
		AuthResponse switchOrganization(@Valid @RequestBody SwitchOrgRequest req) {
			return auth.switchOrganization(CurrentUser.get().userId(), req.orgId());
		}
	}

	@RestController
	@RequestMapping("/api/admin")
	static class AdminPeopleController {

		private final AdminPeopleService people;

		AdminPeopleController(AdminPeopleService people) {
			this.people = people;
		}

		@GetMapping("/members")
		PageResponse<MemberView> members(@RequestParam(required = false) Role role,
				@RequestParam(required = false) String q, @RequestParam(defaultValue = "0") int page,
				@RequestParam(defaultValue = "20") int size) {
			return people.members(CurrentUser.get(), role, q, page, size);
		}

		@GetMapping("/members/counts")
		MemberCounts counts() {
			return people.counts(CurrentUser.get());
		}

		@PatchMapping("/members/{id}")
		MemberView updateMember(@PathVariable UUID id, @Valid @RequestBody UpdateMemberRequest req) {
			return people.updateMember(CurrentUser.get(), id, req);
		}

		@DeleteMapping("/members/{id}")
		@ResponseStatus(HttpStatus.NO_CONTENT)
		void removeMember(@PathVariable UUID id) {
			people.removeMember(CurrentUser.get(), id);
		}

		@PostMapping("/invites")
		@ResponseStatus(HttpStatus.CREATED)
		List<CreatedInvite> invite(@Valid @RequestBody CreateInvitesRequest req) {
			return people.invite(CurrentUser.get(), req);
		}

		@GetMapping("/invites")
		List<InviteView> invites() {
			return people.pendingInvites(CurrentUser.get());
		}

		@DeleteMapping("/invites/{id}")
		@ResponseStatus(HttpStatus.NO_CONTENT)
		void revokeInvite(@PathVariable UUID id) {
			people.revokeInvite(CurrentUser.get(), id);
		}

		@GetMapping("/organization")
		OrgSettingsView organization() {
			return people.organization(CurrentUser.get());
		}

		@PatchMapping("/organization")
		OrgSettingsView updateOrganization(@Valid @RequestBody UpdateOrganizationRequest req) {
			return people.updateOrganization(CurrentUser.get(), req);
		}
	}
}
