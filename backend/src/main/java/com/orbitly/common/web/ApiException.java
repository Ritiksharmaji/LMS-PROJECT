package com.orbitly.common.web;

import org.springframework.http.HttpStatus;

import lombok.Getter;

/** A failure that maps directly to an HTTP status and a stable, machine-readable {@code code}. */
@Getter
public class ApiException extends RuntimeException {

	private final HttpStatus status;

	private final String code;

	public ApiException(HttpStatus status, String code, String message) {
		super(message);
		this.status = status;
		this.code = code;
	}

	public static ApiException badRequest(String message) {
		return new ApiException(HttpStatus.BAD_REQUEST, "bad_request", message);
	}

	public static ApiException unauthorized(String message) {
		return new ApiException(HttpStatus.UNAUTHORIZED, "unauthorized", message);
	}

	public static ApiException forbidden(String message) {
		return new ApiException(HttpStatus.FORBIDDEN, "forbidden", message);
	}

	public static ApiException notFound(String what) {
		return new ApiException(HttpStatus.NOT_FOUND, "not_found", what + " not found");
	}

	public static ApiException conflict(String message) {
		return new ApiException(HttpStatus.CONFLICT, "conflict", message);
	}
}
