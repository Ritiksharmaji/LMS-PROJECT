package com.orbitly.media;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Clock;
import java.time.Duration;
import java.util.Map;
import java.util.OptionalLong;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Development storage on local disk. Upload/download links point back at this API and carry an HMAC signature that
 * expires (see {@link LinkSigner}).
 */
@Component
@ConditionalOnProperty(prefix = "orbitly.media", name = "storage", havingValue = "local", matchIfMissing = true)
class LocalFileStorage implements FileStorage {

	private final Path root;

	private final String apiUrl;

	private final LinkSigner signer;

	private final Clock clock;

	LocalFileStorage(MediaProperties properties, LinkSigner signer, Clock clock) {
		this.root = Path.of(properties.local().root()).toAbsolutePath().normalize();
		this.apiUrl = properties.apiUrl();
		this.signer = signer;
		this.clock = clock;
	}

	@Override
	public UploadTarget presignUpload(String key, String contentType, long sizeBytes, Duration ttl) {
		long exp = clock.instant().plus(ttl).getEpochSecond();
		String url = apiUrl + "/api/public/media/local/upload?key=" + enc(key) + "&exp=" + exp + "&sig="
				+ signer.sign("PUT", key, exp);
		return new UploadTarget(url, "PUT", Map.of("Content-Type", contentType));
	}

	@Override
	public String presignDownload(String key, String fileName, Duration ttl) {
		long exp = clock.instant().plus(ttl).getEpochSecond();
		return apiUrl + "/api/public/media/local/download?key=" + enc(key) + "&exp=" + exp + "&name=" + enc(fileName)
				+ "&sig=" + signer.sign("GET", key, exp);
	}

	@Override
	public String publicUrl(String key) {
		return apiUrl + "/api/public/media/local/public?key=" + enc(key);
	}

	@Override
	public OptionalLong size(String key) {
		try {
			Path p = resolve(key);
			return Files.exists(p) ? OptionalLong.of(Files.size(p)) : OptionalLong.empty();
		}
		catch (IOException ex) {
			throw new UncheckedIOException(ex);
		}
	}

	@Override
	public void delete(String key) {
		try {
			Files.deleteIfExists(resolve(key));
		}
		catch (IOException ex) {
			throw new UncheckedIOException(ex);
		}
	}

	/** Writes at most {@code maxBytes}; returns false (and writes nothing) if the body is larger. */
	boolean write(String key, InputStream body, long maxBytes) throws IOException {
		Path target = resolve(key);
		Files.createDirectories(target.getParent());
		Path tmp = Files.createTempFile(target.getParent(), ".upload", null);
		try (InputStream in = body) {
			byte[] buf = new byte[64 * 1024];
			long total = 0;
			try (var out = Files.newOutputStream(tmp)) {
				for (int n; (n = in.read(buf)) > 0;) {
					total += n;
					if (total > maxBytes) {
						return false;
					}
					out.write(buf, 0, n);
				}
			}
			Files.move(tmp, target, StandardCopyOption.REPLACE_EXISTING);
			return true;
		}
		finally {
			Files.deleteIfExists(tmp);
		}
	}

	Path resolve(String key) {
		Path p = root.resolve(key).normalize();
		if (!p.startsWith(root)) {
			throw new IllegalArgumentException("Invalid key");
		}
		return p;
	}

	private static String enc(String s) {
		return URLEncoder.encode(s, StandardCharsets.UTF_8);
	}
}
