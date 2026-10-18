package com.orbitly.common.security;

/** Custom claim names carried in Orbitly access tokens. The subject ({@code sub}) is the user id. */
public final class TokenClaims {

	public static final String ORG = "org";

	public static final String ROLE = "role";

	public static final String NAME = "name";

	private TokenClaims() {
	}
}
