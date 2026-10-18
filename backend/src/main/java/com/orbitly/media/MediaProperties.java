package com.orbitly.media;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * {@code storage}: {@code local} (files on disk, served by this API through signed links) or {@code s3} (any
 * S3-compatible store, e.g. AWS S3 or Cloudflare R2, through presigned URLs). Mux is optional; without it lessons use
 * plain video URLs.
 */
@ConfigurationProperties(prefix = "orbitly.media")
record MediaProperties(String storage, String apiUrl, String linkSecret, Local local, S3 s3, Mux mux) {

	MediaProperties {
		storage = storage == null || storage.isBlank() ? "local" : storage;
		apiUrl = apiUrl == null || apiUrl.isBlank() ? "http://localhost:8080" : apiUrl;
		local = local == null ? new Local(null) : local;
		s3 = s3 == null ? new S3(null, null, null, null, null, null) : s3;
		mux = mux == null ? new Mux(null, null, null, null, null, null) : mux;
	}

	record Local(String root) {

		Local {
			root = root == null || root.isBlank() ? "./storage" : root;
		}
	}

	record S3(String bucket, String region, String endpoint, String accessKey, String secretKey,
			String publicBaseUrl) {
	}

	/** {@code signingKeyId} + base64 PEM {@code signingPrivateKey} enable signed playback. */
	record Mux(String tokenId, String tokenSecret, String webhookSecret, String signingKeyId, String signingPrivateKey,
			String apiBase) {

		Mux {
			apiBase = apiBase == null || apiBase.isBlank() ? "https://api.mux.com" : apiBase;
		}

		boolean enabled() {
			return tokenId != null && !tokenId.isBlank() && tokenSecret != null && !tokenSecret.isBlank();
		}

		boolean signedPlayback() {
			return signingKeyId != null && !signingKeyId.isBlank() && signingPrivateKey != null
					&& !signingPrivateKey.isBlank();
		}
	}
}
