package com.orbitly.schedule;

import java.time.Instant;
import java.util.UUID;

public final class ScheduleEvents {

	private ScheduleEvents() {
	}

	/** A new session, or an existing one moved to a new time ({@code rescheduled}). */
	public record SessionScheduled(UUID orgId, UUID sessionId, UUID courseId, String title, Instant startsAt,
			boolean rescheduled) {
	}

	public record SessionCancelled(UUID orgId, UUID sessionId, UUID courseId, String title, Instant startsAt) {
	}
}
