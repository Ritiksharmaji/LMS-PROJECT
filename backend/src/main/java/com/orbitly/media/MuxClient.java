package com.orbitly.media;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.interfaces.RSAPrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Clock;
import java.time.Duration;
import java.util.Base64;
import java.util.Date;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.orbitly.common.web.ApiException;

import tools.jackson.databind.JsonNode;

/** Mux Video: direct uploads and (optionally) signed playback tokens. Inactive unless tokens are configured. */
@Component
class MuxClient {

	static final Duration PLAYBACK_TTL = Duration.ofHours(6);

	private final MediaProperties.Mux config;

	private final RestClient http;

	private final RSAPrivateKey signingKey;

	private final Clock clock;

	MuxClient(MediaProperties properties, Clock clock) {
		this.config = properties.mux();
		this.clock = clock;
		this.http = config.enabled() ? RestClient.builder()
			.baseUrl(config.apiBase())
			.defaultHeader("Authorization", "Basic " + Base64.getEncoder()
				.encodeToString((config.tokenId() + ":" + config.tokenSecret()).getBytes(StandardCharsets.UTF_8)))
			.build() : null;
		this.signingKey = config.signedPlayback() ? parseKey(config.signingPrivateKey()) : null;
	}

	boolean enabled() {
		return http != null;
	}

	record DirectUpload(String id, String url) {
	}

	DirectUpload createUpload(String corsOrigin, String passthrough) {
		if (!enabled()) {
			throw ApiException.badRequest("Video uploads aren't configured. Use a video URL instead.");
		}
		var body = Map.of("cors_origin", corsOrigin, "new_asset_settings",
				Map.of("playback_policy", List.of(signingKey != null ? "signed" : "public"), "passthrough", passthrough));
		try {
			JsonNode res = http.post().uri("/video/v1/uploads").contentType(MediaType.APPLICATION_JSON).body(body).retrieve()
				.body(JsonNode.class);
			JsonNode data = res.path("data");
			return new DirectUpload(data.path("id").asString(), data.path("url").asString());
		}
		catch (RestClientResponseException ex) {
			throw new ApiException(HttpStatus.BAD_GATEWAY, "video_provider_error",
					"The video service rejected the upload (" + ex.getStatusCode().value() + ")");
		}
	}

	/** Playback token for a signed playback id; {@code null} when playback is public. */
	String token(String playbackId, String audience) {
		if (signingKey == null) {
			return null;
		}
		try {
			var claims = new JWTClaimsSet.Builder().subject(playbackId)
				.audience(audience)
				.expirationTime(Date.from(clock.instant().plus(PLAYBACK_TTL)))
				.build();
			var jwt = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256).keyID(config.signingKeyId()).build(), claims);
			jwt.sign(new RSASSASigner(signingKey));
			return jwt.serialize();
		}
		catch (Exception ex) {
			throw new IllegalStateException("Could not sign Mux playback token", ex);
		}
	}

	/**
	 * Mux hands out the signing key as base64 of a PEM. Accepts PKCS#8 ("BEGIN PRIVATE KEY") or PKCS#1 ("BEGIN RSA
	 * PRIVATE KEY"), which is wrapped into PKCS#8.
	 */
	static RSAPrivateKey parseKey(String base64OrPem) {
		try {
			String pem = base64OrPem.contains("BEGIN") ? base64OrPem
					: new String(Base64.getDecoder().decode(base64OrPem.trim()), StandardCharsets.US_ASCII);
			boolean pkcs1 = pem.contains("BEGIN RSA PRIVATE KEY");
			byte[] der = Base64.getMimeDecoder().decode(pem.replaceAll("-----[A-Z ]+-----", "").replaceAll("\\s", ""));
			byte[] pkcs8 = pkcs1 ? wrapPkcs1(der) : der;
			return (RSAPrivateKey) KeyFactory.getInstance("RSA").generatePrivate(new PKCS8EncodedKeySpec(pkcs8));
		}
		catch (Exception ex) {
			throw new IllegalStateException("orbitly.media.mux.signing-private-key is not a valid RSA key", ex);
		}
	}

	private static byte[] wrapPkcs1(byte[] pkcs1) {
		byte[] algorithm = { 0x30, 0x0d, 0x06, 0x09, 0x2a, (byte) 0x86, 0x48, (byte) 0x86, (byte) 0xf7, 0x0d, 0x01, 0x01,
				0x01, 0x05, 0x00 };
		ByteArrayOutputStream inner = new ByteArrayOutputStream();
		inner.writeBytes(new byte[] { 0x02, 0x01, 0x00 });
		inner.writeBytes(algorithm);
		inner.write(0x04);
		inner.writeBytes(derLength(pkcs1.length));
		inner.writeBytes(pkcs1);
		ByteArrayOutputStream out = new ByteArrayOutputStream();
		out.write(0x30);
		out.writeBytes(derLength(inner.size()));
		out.writeBytes(inner.toByteArray());
		return out.toByteArray();
	}

	private static byte[] derLength(int len) {
		if (len < 0x80) {
			return new byte[] { (byte) len };
		}
		if (len < 0x100) {
			return new byte[] { (byte) 0x81, (byte) len };
		}
		if (len < 0x10000) {
			return new byte[] { (byte) 0x82, (byte) (len >> 8), (byte) len };
		}
		return new byte[] { (byte) 0x83, (byte) (len >> 16), (byte) (len >> 8), (byte) len };
	}
}
