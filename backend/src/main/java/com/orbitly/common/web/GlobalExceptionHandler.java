package com.orbitly.common.web;

import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/** Renders every error as RFC 9457 problem+json with an extra {@code code} (and {@code errors} for validation). */
@RestControllerAdvice
class GlobalExceptionHandler {

	private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

	@ExceptionHandler(ApiException.class)
	ProblemDetail handleApi(ApiException ex) {
		return problem(ex.getStatus(), ex.getCode(), ex.getMessage());
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	ProblemDetail handleValidation(MethodArgumentNotValidException ex) {
		Map<String, String> errors = new LinkedHashMap<>();
		ex.getBindingResult().getFieldErrors().forEach(e -> errors.putIfAbsent(e.getField(), e.getDefaultMessage()));
		ProblemDetail pd = problem(HttpStatus.BAD_REQUEST, "validation_failed", "Some fields are invalid");
		pd.setProperty("errors", errors);
		return pd;
	}

	@ExceptionHandler(MethodArgumentTypeMismatchException.class)
	ProblemDetail handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
		return problem(HttpStatus.BAD_REQUEST, "bad_request", "Invalid value for '" + ex.getName() + "'");
	}

	@ExceptionHandler(AccessDeniedException.class)
	ProblemDetail handleAccessDenied(AccessDeniedException ex) {
		return problem(HttpStatus.FORBIDDEN, "forbidden", "You don't have access to this resource");
	}

	@ExceptionHandler(DataIntegrityViolationException.class)
	ProblemDetail handleIntegrity(DataIntegrityViolationException ex) {
		log.debug("Constraint violation", ex);
		return problem(HttpStatus.CONFLICT, "conflict", "This conflicts with existing data");
	}

	@ExceptionHandler(NoResourceFoundException.class)
	ProblemDetail handleNoResource(NoResourceFoundException ex) {
		return problem(HttpStatus.NOT_FOUND, "not_found", "Not found");
	}

	@ExceptionHandler(Exception.class)
	ProblemDetail handleUnexpected(Exception ex) {
		log.error("Unhandled error", ex);
		return problem(HttpStatus.INTERNAL_SERVER_ERROR, "internal_error", "Something went wrong");
	}

	private static ProblemDetail problem(HttpStatus status, String code, String detail) {
		ProblemDetail pd = ProblemDetail.forStatusAndDetail(status, detail);
		pd.setProperty("code", code);
		return pd;
	}
}
