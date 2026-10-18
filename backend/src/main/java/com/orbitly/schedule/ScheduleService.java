package com.orbitly.schedule;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.orbitly.catalog.CourseCatalog;
import com.orbitly.catalog.CourseCatalog.CourseRef;
import com.orbitly.catalog.CourseStatus;
import com.orbitly.common.security.CurrentUser;
import com.orbitly.common.security.Role;
import com.orbitly.common.web.ApiException;
import com.orbitly.identity.UserDirectory;
import com.orbitly.learning.Enrollments;
import com.orbitly.schedule.ScheduleDtos.SessionRequest;
import com.orbitly.schedule.ScheduleDtos.SessionView;
import com.orbitly.schedule.ScheduleDtos.UpdateSessionRequest;

@Service
class ScheduleService {

	static final Duration MAX_RANGE = Duration.ofDays(92);

	private final LiveSessionRepository sessions;

	private final CourseCatalog catalog;

	private final Enrollments enrollments;

	private final UserDirectory directory;

	private final ApplicationEventPublisher events;

	private final Clock clock;

	ScheduleService(LiveSessionRepository sessions, CourseCatalog catalog, Enrollments enrollments,
			UserDirectory directory, ApplicationEventPublisher events, Clock clock) {
		this.sessions = sessions;
		this.catalog = catalog;
		this.enrollments = enrollments;
		this.directory = directory;
		this.events = events;
		this.clock = clock;
	}

	@Transactional
	SessionView create(CurrentUser me, UUID courseId, SessionRequest req) {
		CourseRef course = staffCourse(me, courseId);
		if (course.status() == CourseStatus.ARCHIVED) {
			throw ApiException.badRequest("Archived courses can't get new sessions");
		}
		requireOrder(req.startsAt(), req.endsAt());
		LiveSession s = new LiveSession(me.orgId(), courseId, me.userId());
		s.setTitle(req.title().trim());
		s.setDescription(req.description());
		s.setKind(req.kind());
		s.setStartsAt(req.startsAt());
		s.setEndsAt(req.endsAt());
		s.setMeetingUrl(req.meetingUrl());
		s.setLocation(req.location());
		s = sessions.save(s);
		events.publishEvent(new ScheduleEvents.SessionScheduled(me.orgId(), s.getId(), courseId, s.getTitle(),
				s.getStartsAt(), false));
		return views(me.orgId(), List.of(s)).get(0);
	}

	@Transactional
	SessionView update(CurrentUser me, UUID sessionId, UpdateSessionRequest req) {
		LiveSession s = staffSession(me, sessionId);
		if (req.title() != null) {
			s.setTitle(req.title().trim());
		}
		if (req.description() != null) {
			s.setDescription(req.description());
		}
		if (req.kind() != null) {
			s.setKind(req.kind());
		}
		boolean moved = false;
		if (req.startsAt() != null && !req.startsAt().equals(s.getStartsAt())) {
			s.setStartsAt(req.startsAt());
			moved = true;
		}
		if (req.endsAt() != null) {
			s.setEndsAt(req.endsAt());
		}
		requireOrder(s.getStartsAt(), s.getEndsAt());
		if (req.meetingUrl() != null) {
			s.setMeetingUrl(req.meetingUrl().isBlank() ? null : req.meetingUrl());
		}
		if (req.location() != null) {
			s.setLocation(req.location().isBlank() ? null : req.location());
		}
		if (moved && s.getCancelledAt() == null) {
			events.publishEvent(new ScheduleEvents.SessionScheduled(me.orgId(), s.getId(), s.getCourseId(), s.getTitle(),
					s.getStartsAt(), true));
		}
		return views(me.orgId(), List.of(s)).get(0);
	}

	@Transactional
	SessionView cancel(CurrentUser me, UUID sessionId) {
		LiveSession s = staffSession(me, sessionId);
		if (s.getCancelledAt() == null) {
			s.setCancelledAt(clock.instant());
			events.publishEvent(
					new ScheduleEvents.SessionCancelled(me.orgId(), s.getId(), s.getCourseId(), s.getTitle(), s.getStartsAt()));
		}
		return views(me.orgId(), List.of(s)).get(0);
	}

	@Transactional
	void delete(CurrentUser me, UUID sessionId) {
		sessions.delete(staffSession(me, sessionId));
	}

	/** The caller's calendar: sessions of courses they're enrolled in and courses they teach. */
	@Transactional(readOnly = true)
	List<SessionView> mySchedule(CurrentUser me, Instant from, Instant to) {
		Instant[] range = range(from, to);
		Set<UUID> courseIds = new HashSet<>(enrollments.courseIds(me.orgId(), me.userId()));
		if (me.isStaff()) {
			catalog.managedBy(me.orgId(), me.userId()).stream()
				.filter(c -> c.instructorId().equals(me.userId()))
				.forEach(c -> courseIds.add(c.id()));
		}
		if (courseIds.isEmpty()) {
			return List.of();
		}
		return views(me.orgId(), sessions.inRange(me.orgId(), courseIds, range[0], range[1]));
	}

	/** Sessions of the courses an instructor manages (admins: every course). */
	@Transactional(readOnly = true)
	List<SessionView> teaching(CurrentUser me, Instant from, Instant to) {
		Instant[] range = range(from, to);
		var courseIds = catalog.managedBy(me.orgId(), me.is(Role.ADMIN) ? null : me.userId())
			.stream()
			.map(CourseRef::id)
			.toList();
		if (courseIds.isEmpty()) {
			return List.of();
		}
		return views(me.orgId(), sessions.inRange(me.orgId(), courseIds, range[0], range[1]));
	}

	@Transactional(readOnly = true)
	List<SessionView> courseSessions(CurrentUser me, UUID courseId) {
		CourseRef course = catalog.course(me.orgId(), courseId).orElseThrow(() -> ApiException.notFound("Course"));
		if (!enrollments.canAccess(me, course)) {
			throw ApiException.forbidden("Enroll in this course to see its sessions");
		}
		Instant now = clock.instant();
		return views(me.orgId(), sessions.inRange(me.orgId(), List.of(courseId), now, now.plus(MAX_RANGE)));
	}

	private Instant[] range(Instant from, Instant to) {
		Instant start = from != null ? from : clock.instant().minus(Duration.ofHours(12));
		Instant end = to != null ? to : start.plus(Duration.ofDays(7));
		if (!end.isAfter(start)) {
			throw ApiException.badRequest("'to' must be after 'from'");
		}
		if (Duration.between(start, end).compareTo(MAX_RANGE) > 0) {
			throw ApiException.badRequest("Ask for at most 92 days at a time");
		}
		return new Instant[] { start, end };
	}

	private List<SessionView> views(UUID orgId, List<LiveSession> list) {
		if (list.isEmpty()) {
			return List.of();
		}
		Map<UUID, CourseRef> courses = catalog.courses(orgId, list.stream().map(LiveSession::getCourseId).distinct().toList());
		var hosts = directory.people(list.stream().map(LiveSession::getHostId).distinct().toList());
		return list.stream().map(s -> {
			CourseRef c = courses.get(s.getCourseId());
			var host = hosts.get(s.getHostId());
			return new SessionView(s.getId(), s.getCourseId(), c == null ? null : c.title(), c == null ? null : c.hue(),
					s.getTitle(), s.getDescription(), s.getKind(), s.getStartsAt(), s.getEndsAt(), s.getMeetingUrl(),
					s.getLocation(), s.getHostId(), host == null ? null : host.fullName(), s.getCancelledAt() != null);
		}).toList();
	}

	private LiveSession staffSession(CurrentUser me, UUID sessionId) {
		LiveSession s = sessions.findByIdAndOrgId(sessionId, me.orgId()).orElseThrow(() -> ApiException.notFound("Session"));
		staffCourse(me, s.getCourseId());
		return s;
	}

	private CourseRef staffCourse(CurrentUser me, UUID courseId) {
		CourseRef course = catalog.course(me.orgId(), courseId).orElseThrow(() -> ApiException.notFound("Course"));
		if (!Enrollments.isStaff(me, course)) {
			throw ApiException.forbidden("Only this course's instructor or an admin can schedule sessions");
		}
		return course;
	}

	private static void requireOrder(Instant start, Instant end) {
		if (!end.isAfter(start)) {
			throw ApiException.badRequest("A session must end after it starts");
		}
		if (Duration.between(start, end).compareTo(Duration.ofHours(12)) > 0) {
			throw ApiException.badRequest("Sessions can be at most 12 hours long");
		}
	}
}
