package com.orbitly.media;

import java.net.URI;
import java.time.Duration;
import java.util.Map;
import java.util.OptionalLong;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

/** S3 or any S3-compatible store (Cloudflare R2, MinIO) via presigned URLs. */
@Component
@ConditionalOnProperty(prefix = "orbitly.media", name = "storage", havingValue = "s3")
class S3FileStorage implements FileStorage {

	private final String bucket;

	private final String publicBaseUrl;

	private final S3Client client;

	private final S3Presigner presigner;

	S3FileStorage(MediaProperties properties) {
		var cfg = properties.s3();
		if (cfg.bucket() == null || cfg.bucket().isBlank()) {
			throw new IllegalStateException("orbitly.media.s3.bucket is required when storage=s3");
		}
		this.bucket = cfg.bucket();
		this.publicBaseUrl = cfg.publicBaseUrl();
		Region region = Region.of(cfg.region() == null || cfg.region().isBlank() ? "auto" : cfg.region());
		AwsCredentialsProvider credentials = cfg.accessKey() != null && !cfg.accessKey().isBlank()
				? StaticCredentialsProvider.create(AwsBasicCredentials.create(cfg.accessKey(), cfg.secretKey()))
				: DefaultCredentialsProvider.builder().build();
		var s3cfg = S3Configuration.builder().pathStyleAccessEnabled(cfg.endpoint() != null).build();
		var clientBuilder = S3Client.builder().region(region).credentialsProvider(credentials).serviceConfiguration(s3cfg);
		var presignerBuilder = S3Presigner.builder().region(region).credentialsProvider(credentials).serviceConfiguration(s3cfg);
		if (cfg.endpoint() != null && !cfg.endpoint().isBlank()) {
			clientBuilder.endpointOverride(URI.create(cfg.endpoint()));
			presignerBuilder.endpointOverride(URI.create(cfg.endpoint()));
		}
		this.client = clientBuilder.build();
		this.presigner = presignerBuilder.build();
	}

	@Override
	public UploadTarget presignUpload(String key, String contentType, long sizeBytes, Duration ttl) {
		var req = presigner.presignPutObject(p -> p.signatureDuration(ttl)
			.putObjectRequest(o -> o.bucket(bucket).key(key).contentType(contentType).contentLength(sizeBytes)));
		return new UploadTarget(req.url().toString(), "PUT", Map.of("Content-Type", contentType));
	}

	@Override
	public String presignDownload(String key, String fileName, Duration ttl) {
		String disposition = "attachment; filename=\"" + fileName.replace("\"", "") + "\"";
		return presigner
			.presignGetObject(p -> p.signatureDuration(ttl)
				.getObjectRequest(o -> o.bucket(bucket).key(key).responseContentDisposition(disposition)))
			.url()
			.toString();
	}

	@Override
	public String publicUrl(String key) {
		if (publicBaseUrl == null || publicBaseUrl.isBlank()) {
			return presignDownload(key, key.substring(key.lastIndexOf('/') + 1), Duration.ofDays(7));
		}
		return publicBaseUrl.replaceAll("/+$", "") + "/" + key;
	}

	@Override
	public OptionalLong size(String key) {
		try {
			return OptionalLong.of(client.headObject(h -> h.bucket(bucket).key(key)).contentLength());
		}
		catch (NoSuchKeyException ex) {
			return OptionalLong.empty();
		}
		catch (S3Exception ex) {
			if (ex.statusCode() == 404) {
				return OptionalLong.empty();
			}
			throw ex;
		}
	}

	@Override
	public void delete(String key) {
		client.deleteObject(d -> d.bucket(bucket).key(key));
	}
}
