package com.orbitly.notification;

import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.UUID;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

import com.orbitly.assessment.AssessmentEvents;
import com.orbitly.billing.BillingEvents;
import com.orbitly.catalog.CourseCatalog;
import com.orbitly.common.config.OrbitlyProperties;
import com.orbitly.discussion.DiscussionEvents;
import com.orbitly.identity.IdentityEvents;
import com.orbitly.identity.UserDirectory;
import com.orbitly.learning.EnrollmentSource;
import com.orbitly.learning.Enrollments;
import com.orbitly.learning.LearningEvents;
import com.orbitly.notification.Notifier.EmailPolicy;
import com.orbitly.schedule.ScheduleEvents;

/**
 * Turns domain events into notifications. Runs after the triggering transaction commits, on the notification
 * executor, so a slow mail server never slows down or fails the original request.
 */
@Component
class NotificationListeners {

	static final DateTimeFormatter WHEN = DateTimeFormatter.ofPattern("EEE d MMM, HH:mm 'UTC'", Locale.ENGLISH)
		.withZone(ZoneOffset.UTC);

	private final Notifier notifier;

	private final UserDirectory directory;

	private final CourseCatalog catalog;

	private final Enrollments enrollments;

	private final String app;

	NotificationListeners(Notifier notifier, UserDirectory directory, CourseCatalog catalog, Enrollments enrollments,
			OrbitlyProperties properties) {
		this.notifier = notifier;
		this.directory = directory;
		this.catalog = catalog;
		this.enrollments = enrollments;
		this.app = properties.appUrl();
	}

	// ---- Identity -------------------------------------------------------------------------------------------

	@Async("notificationExecutor")
	@TransactionalEventListener(fallbackExecution = true)
	public void on(IdentityEvents.InviteCreated e) {
		String role = e.role().name().toLowerCase(Locale.ROOT);
		notifier.emailOnly(e.email(), "You're invited to " + e.orgName() + " on Orbitly",
				"Join " + e.orgName() + " on Orbitly",
				e.invitedByName() + " invited you to join as " + (role.equals("admin") || role.equals("instructor") ? "an " : "a ")
						+ role + ".\nThis invite expires on " + WHEN.format(e.expiresAt()) + ".",
				"Accept invite", e.link());
	}

	@Async("notificationExecutor")
	@TransactionalEventListener(fallbackExecution = true)
	public void on(IdentityEvents.PasswordResetRequested e) {
		notifier.emailOnly(e.email(), "Reset your Orbitly password", "Reset your password",
				"Hi " + e.fullName() + ", use the button below to choose a new password. The link works for one hour. "
						+ "If you didn't ask for this, you can ignore this email.",
				"Choose a new password", e.link());
	}

	// ---- Learning -------------------------------------------------------------------------------------------

	@Async("notificationExecutor")
	@TransactionalEventListener(fallbackExecution = true)
	public void on(LearningEvents.EnrollmentCreated e) {
		if (e.source() != EnrollmentSource.ASSIGNED) {
			return; // self-enrollment needs no notice; purchases get a receipt
		}
		String title = courseTitle(e.orgId(), e.courseId());
		notifier.notify(e.orgId(), e.userId(), "ENROLLED", "You've been enrolled in " + title,
				"Your organization added this course to your learning.", app + "/learn/courses/" + e.courseId(),
				EmailPolicy.OPTIONAL, "Start learning");
	}

	@Async("notificationExecutor")
	@TransactionalEventListener(fallbackExecution = true)
	public void on(LearningEvents.CourseCompleted e) {
		String title = courseTitle(e.orgId(), e.courseId());
		notifier.notify(e.orgId(), e.userId(), "COURSE_COMPLETED", "You completed " + title,
				"Congratulations! Your certificate code is " + e.certificateCode() + ".",
				app + "/certificates/" + e.certificateCode(), EmailPolicy.OPTIONAL, "View certificate");
	}

	// ---- Assessment -----------------------------------------------------------------------------------------

	@Async("notificationExecutor")
	@TransactionalEventListener(fallbackExecution = true)
	public void on(AssessmentEvents.AssignmentSubmitted e) {
		String learner = name(e.userId());
		String lesson = lessonTitle(e.orgId(), e.lessonId());
		notifier.notify(e.orgId(), e.instructorId(), "SUBMISSION_RECEIVED",
				learner + " submitted " + lesson + (e.late() ? " (late)" : ""), courseTitle(e.orgId(), e.courseId()),
				app + "/teach/grading/" + e.submissionId(), EmailPolicy.NONE, null);
	}

	@Async("notificationExecutor")
	@TransactionalEventListener(fallbackExecution = true)
	public void on(AssessmentEvents.SubmissionGraded e) {
		String lesson = lessonTitle(e.orgId(), e.lessonId());
		String title = e.returned() ? lesson + " was returned for revision" : lesson + " was graded";
		String body = e.returned() ? "Your instructor left feedback. Update your work and submit it again."
				: "You scored " + e.points() + " / " + e.maxPoints() + ".";
		notifier.notify(e.orgId(), e.userId(), e.returned() ? "SUBMISSION_RETURNED" : "SUBMISSION_GRADED", title, body,
				app + "/learn/lessons/" + e.lessonId(), EmailPolicy.OPTIONAL, "See feedback");
	}

	// ---- Discussion -----------------------------------------------------------------------------------------

	@Async("notificationExecutor")
	@TransactionalEventListener(fallbackExecution = true)
	public void on(DiscussionEvents.ThreadCreated e) {
		if (e.instructorId().equals(e.authorId())) {
			return;
		}
		notifier.notify(e.orgId(), e.instructorId(), "THREAD_CREATED",
				name(e.authorId()) + " posted in " + courseTitle(e.orgId(), e.courseId()), e.preview(),
				app + "/learn/threads/" + e.threadId(), EmailPolicy.NONE, null);
	}

	@Async("notificationExecutor")
	@TransactionalEventListener(fallbackExecution = true)
	public void on(DiscussionEvents.ReplyCreated e) {
		if (e.threadAuthorId().equals(e.authorId())) {
			return;
		}
		notifier.notify(e.orgId(), e.threadAuthorId(), "THREAD_REPLY", name(e.authorId()) + " replied to your post",
				e.preview(), app + "/learn/threads/" + e.threadId(), EmailPolicy.OPTIONAL, "Read reply");
	}

	// ---- Schedule -------------------------------------------------------------------------------------------

	@Async("notificationExecutor")
	@TransactionalEventListener(fallbackExecution = true)
	public void on(ScheduleEvents.SessionScheduled e) {
		String course = courseTitle(e.orgId(), e.courseId());
		String title = (e.rescheduled() ? "Rescheduled: " : "New session: ") + e.title();
		for (UUID learner : enrollments.learnerIds(e.courseId())) {
			notifier.notify(e.orgId(), learner, e.rescheduled() ? "SESSION_RESCHEDULED" : "SESSION_SCHEDULED", title,
					course + " · " + WHEN.format(e.startsAt()), app + "/learn/schedule", EmailPolicy.OPTIONAL,
					"Open schedule");
		}
	}

	@Async("notificationExecutor")
	@TransactionalEventListener(fallbackExecution = true)
	public void on(ScheduleEvents.SessionCancelled e) {
		String course = courseTitle(e.orgId(), e.courseId());
		for (UUID learner : enrollments.learnerIds(e.courseId())) {
			notifier.notify(e.orgId(), learner, "SESSION_CANCELLED", "Cancelled: " + e.title(),
					course + " · was " + WHEN.format(e.startsAt()), app + "/learn/schedule", EmailPolicy.OPTIONAL,
					"Open schedule");
		}
	}

	// ---- Billing --------------------------------------------------------------------------------------------

	@Async("notificationExecutor")
	@TransactionalEventListener(fallbackExecution = true)
	public void on(BillingEvents.OrderPaid e) {
		String course = courseTitle(e.orgId(), e.courseId());
		notifier.notify(e.orgId(), e.userId(), "ORDER_PAID", "Receipt: " + course,
				"You paid " + money(e.amountCents(), e.currency()) + ". You can request a refund within 30 days.",
				app + "/learn/courses/" + e.courseId(), EmailPolicy.ESSENTIAL, "Start learning");
	}

	@Async("notificationExecutor")
	@TransactionalEventListener(fallbackExecution = true)
	public void on(BillingEvents.OrderRefunded e) {
		String course = courseTitle(e.orgId(), e.courseId());
		notifier.notify(e.orgId(), e.userId(), "ORDER_REFUNDED", "Refund issued: " + course,
				money(e.amountCents(), e.currency()) + " is on its way back to you.", app + "/learn/orders",
				EmailPolicy.ESSENTIAL, "View orders");
	}

	// ---- Helpers --------------------------------------------------------------------------------------------

	private String name(UUID userId) {
		return directory.person(userId).map(UserDirectory.Person::fullName).orElse("Someone");
	}

	private String courseTitle(UUID orgId, UUID courseId) {
		return catalog.course(orgId, courseId).map(CourseCatalog.CourseRef::title).orElse("your course");
	}

	private String lessonTitle(UUID orgId, UUID lessonId) {
		return catalog.lesson(orgId, lessonId).map(CourseCatalog.LessonRef::title).orElse("Your assignment");
	}

	static String money(int cents, String currency) {
		return String.format(Locale.ENGLISH, "%s %.2f", currency, cents / 100.0);
	}
}
