package com.orbitly.schedule;

import java.time.Instant;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class ScheduleDtos {

	private ScheduleDtos() {
	}

	public record SessionRequest(@NotBlank @Size(max = 160) String title, @Size(max = 4000) String description,
			@NotNull LiveSession.Kind kind, @NotNull Instant startsAt, @NotNull Instant endsAt,
			@Size(max = 1000) String meetingUrl, @Size(max = 300) String location) {
	}

	public record UpdateSessionRequest(@Size(min = 1, max = 160) String title, @Size(max = 4000) String description,
			LiveSession.Kind kind, Instant startsAt, Instant endsAt, @Size(max = 1000) String meetingUrl,
			@Size(max = 300) String location) {
	}

	public record SessionView(UUID id, UUID courseId, String courseTitle, String courseHue, String title,
			String description, LiveSession.Kind kind, Instant startsAt, Instant endsAt, String meetingUrl,
			String location, UUID hostId, String hostName, boolean cancelled) {
	}
}
