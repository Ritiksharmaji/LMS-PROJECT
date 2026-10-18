package com.orbitly.media;

import java.time.Duration;
import java.util.Map;
import java.util.OptionalLong;

/** Where file bytes live. Browsers upload and download directly; bytes never pass through services. */
interface FileStorage {

	record UploadTarget(String url, String method, Map<String, String> headers) {
	}

	UploadTarget presignUpload(String key, String contentType, long sizeBytes, Duration ttl);

	String presignDownload(String key, String fileName, Duration ttl);

	/** Stable URL for publicly readable files (avatars, logos, covers). */
	String publicUrl(String key);

	/** Size of the stored object, if it exists. */
	OptionalLong size(String key);

	void delete(String key);
}
