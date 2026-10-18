package com.orbitly.media;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.security.KeyPairGenerator;
import java.util.Arrays;
import java.util.Base64;

import org.junit.jupiter.api.Test;

class MuxKeyParsingTest {

	@Test
	void parsesPkcs8AndPkcs1KeysInPemOrBase64() throws Exception {
		var gen = KeyPairGenerator.getInstance("RSA");
		gen.initialize(2048);
		var pair = gen.generateKeyPair();
		byte[] pkcs8 = pair.getPrivate().getEncoded();
		// For 2048-bit RSA keys the PKCS#8 header is 26 bytes; the rest is the PKCS#1 structure Mux hands out.
		byte[] pkcs1 = Arrays.copyOfRange(pkcs8, 26, pkcs8.length);

		String pem8 = "-----BEGIN PRIVATE KEY-----\n" + Base64.getMimeEncoder().encodeToString(pkcs8)
				+ "\n-----END PRIVATE KEY-----";
		String pem1 = "-----BEGIN RSA PRIVATE KEY-----\n" + Base64.getMimeEncoder().encodeToString(pkcs1)
				+ "\n-----END RSA PRIVATE KEY-----";

		assertThat(MuxClient.parseKey(pem8)).isEqualTo(pair.getPrivate());
		assertThat(MuxClient.parseKey(pem1).getModulus())
			.isEqualTo(((java.security.interfaces.RSAPrivateKey) pair.getPrivate()).getModulus());
		String b64 = Base64.getEncoder().encodeToString(pem1.getBytes(StandardCharsets.US_ASCII));
		assertThat(MuxClient.parseKey(b64).getModulus()).isEqualTo(MuxClient.parseKey(pem1).getModulus());
	}
}
