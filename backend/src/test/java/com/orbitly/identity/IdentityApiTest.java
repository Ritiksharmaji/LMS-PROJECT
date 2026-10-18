package com.orbitly.identity;

import static com.orbitly.support.Api.PASSWORD;
import static com.orbitly.support.Api.read;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.orbitly.support.Api;
import com.orbitly.support.IntegrationTest;

@IntegrationTest
class IdentityApiTest {

	@Autowired
	Api api;

	@Test
	void registeringAnOrganizationMakesTheCallerItsAdmin() throws Exception {
		var admin = api.newOrg();
		api.get("/api/me", admin)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.role").value("ADMIN"))
			.andExpect(jsonPath("$.organization.slug").value(admin.orgSlug()));
	}

	@Test
	void duplicateOrganizationSlugIsRejected() throws Exception {
		var admin = api.newOrg();
		api.post("/api/auth/register-organization", Map.of("orgName", "Copy", "orgSlug", admin.orgSlug(), "fullName",
				"X", "email", "x-" + admin.orgSlug() + "@example.com", "password", PASSWORD), null)
			.andExpect(status().isConflict());
	}

	@Test
	void loginChecksPasswordAndMembership() throws Exception {
		var admin = api.newOrg();
		api.post("/api/auth/login", Map.of("orgSlug", admin.orgSlug(), "email", admin.email(), "password", PASSWORD),
				null)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.role").value("ADMIN"))
			.andExpect(jsonPath("$.accessToken").isNotEmpty());

		api.post("/api/auth/login", Map.of("orgSlug", admin.orgSlug(), "email", admin.email(), "password", "wrong-pass"),
				null)
			.andExpect(status().isUnauthorized());

		var other = api.newOrg();
		api.post("/api/auth/login", Map.of("orgSlug", other.orgSlug(), "email", admin.email(), "password", PASSWORD),
				null)
			.andExpect(status().isForbidden());
	}

	@Test
	void validationErrorsListTheFields() throws Exception {
		api.post("/api/auth/signup", Map.of("orgSlug", "x", "fullName", "", "email", "not-an-email", "password", "short"),
				null)
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("validation_failed"))
			.andExpect(jsonPath("$.errors.email").exists())
			.andExpect(jsonPath("$.errors.password").exists());
	}

	@Test
	void refreshTokensRotateAndReplayRevokesEverySession() throws Exception {
		var admin = api.newOrg();
		var refreshed = api.post("/api/auth/refresh", Map.of("refreshToken", admin.refreshToken()), null)
			.andExpect(status().isOk());
		String second = read(refreshed, "$.refreshToken");
		assertThat(second).isNotEqualTo(admin.refreshToken());

		// Reusing the first token is treated as theft: it fails and kills the newer token too.
		api.post("/api/auth/refresh", Map.of("refreshToken", admin.refreshToken()), null)
			.andExpect(status().isUnauthorized());
		api.post("/api/auth/refresh", Map.of("refreshToken", second), null).andExpect(status().isUnauthorized());
	}

	@Test
	void logoutRevokesTheRefreshToken() throws Exception {
		var admin = api.newOrg();
		api.post("/api/auth/logout", Map.of("refreshToken", admin.refreshToken()), null)
			.andExpect(status().isNoContent());
		api.post("/api/auth/refresh", Map.of("refreshToken", admin.refreshToken()), null)
			.andExpect(status().isUnauthorized());
	}

	@Test
	void studentsCanSelfSignUpUnlessTheOrgIsInviteOnly() throws Exception {
		var admin = api.newOrg();
		api.post("/api/auth/signup", Map.of("orgSlug", admin.orgSlug(), "fullName", "Maya Okafor", "email",
				"maya-" + admin.orgSlug() + "@example.com", "password", PASSWORD), null)
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.role").value("STUDENT"));

		api.patch("/api/admin/organization", Map.of("selfSignup", false), admin).andExpect(status().isOk());
		api.post("/api/auth/signup", Map.of("orgSlug", admin.orgSlug(), "fullName", "Late", "email",
				"late-" + admin.orgSlug() + "@example.com", "password", PASSWORD), null)
			.andExpect(status().isForbidden());
	}

	@Test
	void seatLimitBlocksNewMembers() throws Exception {
		var admin = api.newOrg();
		api.patch("/api/admin/organization", Map.of("seatLimit", 1), admin)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.seatsUsed").value(1));
		api.post("/api/auth/signup", Map.of("orgSlug", admin.orgSlug(), "fullName", "No Seat", "email",
				"noseat-" + admin.orgSlug() + "@example.com", "password", PASSWORD), null)
			.andExpect(status().isPaymentRequired())
			.andExpect(jsonPath("$.code").value("seat_limit_reached"));
		api.post("/api/admin/invites", Map.of("emails", new String[] { "a@example.com" }, "role", "STUDENT"), admin)
			.andExpect(status().isConflict());
	}

	@Test
	void invitesCreateMembersWithTheInvitedRole() throws Exception {
		var admin = api.newOrg();
		var instructor = api.member(admin, "INSTRUCTOR");
		api.get("/api/me", instructor).andExpect(jsonPath("$.role").value("INSTRUCTOR"));

		api.get("/api/admin/members/counts", admin)
			.andExpect(jsonPath("$.everyone").value(2))
			.andExpect(jsonPath("$.instructors").value(1));
		api.get("/api/admin/members?role=INSTRUCTOR", admin)
			.andExpect(jsonPath("$.total").value(1))
			.andExpect(jsonPath("$.items[0].email").value(instructor.email()));
	}

	@Test
	void inviteTokensAreSingleUse() throws Exception {
		var admin = api.newOrg();
		String link = read(api.post("/api/admin/invites",
				Map.of("emails", new String[] { "once-" + admin.orgSlug() + "@example.com" }, "role", "STUDENT"), admin),
				"$[0].link");
		String token = link.substring(link.lastIndexOf('/') + 1);
		api.get("/api/auth/invites/" + token, null)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.role").value("STUDENT"))
			.andExpect(jsonPath("$.existingAccount").value(false));
		api.post("/api/auth/invites/accept", Map.of("token", token, "fullName", "Once", "password", PASSWORD), null)
			.andExpect(status().isOk());
		api.post("/api/auth/invites/accept", Map.of("token", token, "fullName", "Twice", "password", PASSWORD), null)
			.andExpect(status().isBadRequest());
	}

	@Test
	void nonAdminsCannotUseAdminEndpoints() throws Exception {
		var admin = api.newOrg();
		var student = api.member(admin, "STUDENT");
		var instructor = api.member(admin, "INSTRUCTOR");
		api.get("/api/admin/members", student).andExpect(status().isForbidden());
		api.get("/api/admin/members", instructor).andExpect(status().isForbidden());
		api.get("/api/admin/members", null).andExpect(status().isUnauthorized());
	}

	@Test
	void theLastAdminCannotBeDemotedOrRemoved() throws Exception {
		var admin = api.newOrg();
		String myMembership = read(api.get("/api/admin/members?role=ADMIN", admin), "$.items[0].id");
		api.patch("/api/admin/members/" + myMembership, Map.of("role", "STUDENT"), admin)
			.andExpect(status().isConflict());
		api.delete("/api/admin/members/" + myMembership, admin).andExpect(status().isConflict());
	}

	@Test
	void suspendedMembersCannotSignIn() throws Exception {
		var admin = api.newOrg();
		var student = api.member(admin, "STUDENT");
		String id = read(api.get("/api/admin/members?role=STUDENT", admin), "$.items[0].id");
		api.patch("/api/admin/members/" + id, Map.of("status", "SUSPENDED"), admin)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("SUSPENDED"));
		api.post("/api/auth/login", Map.of("orgSlug", admin.orgSlug(), "email", student.email(), "password", PASSWORD),
				null)
			.andExpect(status().isForbidden());
	}

	@Test
	void adminsCannotTouchAnotherOrganizationsMembers() throws Exception {
		var orgA = api.newOrg();
		var orgB = api.newOrg();
		var studentB = api.member(orgB, "STUDENT");
		String idB = read(api.get("/api/admin/members?role=STUDENT", orgB), "$.items[0].id");

		api.patch("/api/admin/members/" + idB, Map.of("role", "ADMIN"), orgA).andExpect(status().isNotFound());
		api.delete("/api/admin/members/" + idB, orgA).andExpect(status().isNotFound());
		api.get("/api/admin/members", orgA).andExpect(jsonPath("$.total").value(1));
		api.get("/api/me", studentB).andExpect(jsonPath("$.role").value("STUDENT"));
	}

	@Test
	void oneAccountCanBelongToSeveralOrganizationsAndSwitch() throws Exception {
		var orgA = api.newOrg();
		var orgB = api.newOrg();
		// orgA's admin signs up as a student in orgB with the same account and password.
		api.post("/api/auth/signup", Map.of("orgSlug", orgB.orgSlug(), "fullName", "Same Person", "email", orgA.email(),
				"password", PASSWORD), null)
			.andExpect(status().isCreated());

		api.get("/api/me/organizations", orgA).andExpect(jsonPath("$.length()").value(2));
		var switched = api.post("/api/me/switch-organization", Map.of("orgId", orgB.orgId().toString()), orgA)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.role").value("STUDENT"))
			.andExpect(jsonPath("$.organization.id").value(orgB.orgId().toString()));
		assertThat((String) read(switched, "$.accessToken")).isNotBlank();
	}

	@Test
	void signupWithSomeoneElsesEmailNeedsTheirPassword() throws Exception {
		var orgA = api.newOrg();
		var orgB = api.newOrg();
		api.post("/api/auth/signup", Map.of("orgSlug", orgB.orgSlug(), "fullName", "Impostor", "email", orgA.email(),
				"password", "guessed-password"), null)
			.andExpect(status().isConflict());
	}

	@Test
	void changingPasswordSignsOutOtherSessions() throws Exception {
		var admin = api.newOrg();
		api.post("/api/me/password", Map.of("currentPassword", PASSWORD, "newPassword", "a-brand-new-password"), admin)
			.andExpect(status().isNoContent());
		api.post("/api/auth/refresh", Map.of("refreshToken", admin.refreshToken()), null)
			.andExpect(status().isUnauthorized());
		api.post("/api/auth/login",
				Map.of("orgSlug", admin.orgSlug(), "email", admin.email(), "password", "a-brand-new-password"), null)
			.andExpect(status().isOk());
	}

	@Test
	void publicOrganizationLookup() throws Exception {
		var admin = api.newOrg();
		api.get("/api/public/organizations/" + admin.orgSlug(), null)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.slug").value(admin.orgSlug()));
		api.get("/api/public/organizations/does-not-exist", null).andExpect(status().isNotFound());
	}
}
