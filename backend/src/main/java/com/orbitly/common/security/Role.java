package com.orbitly.common.security;

/**
 * A member's role inside one organization. Stored on the membership, carried in the access token.
 */
public enum Role {
	STUDENT, INSTRUCTOR, ADMIN;

	public String authority() {
		return "ROLE_" + name();
	}
}
