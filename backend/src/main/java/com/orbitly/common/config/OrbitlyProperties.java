package com.orbitly.common.config;

import java.time.Duration;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "orbitly")
public record OrbitlyProperties(String appUrl, Cors cors, Jwt jwt) {

	public record Cors(List<String> allowedOrigins) {
	}

	public record Jwt(String secret, String issuer, Duration accessTokenTtl, Duration refreshTokenTtl) {
	}
}
