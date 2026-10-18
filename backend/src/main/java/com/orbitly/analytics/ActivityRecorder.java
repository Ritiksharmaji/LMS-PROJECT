package com.orbitly.analytics;

import java.sql.Timestamp;
import java.time.Clock;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

import com.orbitly.assessment.AssessmentEvents;
import com.orbitly.billing.BillingEvents;
import com.orbitly.catalog.CatalogEvents;
import com.orbitly.discussion.DiscussionEvents;
import com.orbitly.identity.IdentityEvents;
import com.orbitly.learning.LearningEvents;

/** Writes one row to {@code activity_events} for each meaningful thing that happens, after it commits. */
@Component
class ActivityRecorder {

	private final JdbcClient jdbc;

	private final Clock clock;

	ActivityRecorder(JdbcClient jdbc, Clock clock) {
		this.jdbc = jdbc;
		this.clock = clock;
	}

	@Async("notificationExecutor")
	@TransactionalEventListener(fallbackExecution = true)
	public void on(IdentityEvents.MemberJoined e) {
		record(e.orgId(), e.userId(), null, "MEMBER_JOINED");
	}

	@Async("notificationExecutor")
	@TransactionalEventListener(fallbackExecution = true)
	public void on(CatalogEvents.CoursePublished e) {
		record(e.orgId(), e.instructorId(), e.courseId(), "COURSE_PUBLISHED");
	}

	@Async("notificationExecutor")
	@TransactionalEventListener(fallbackExecution = true)
	public void on(LearningEvents.EnrollmentCreated e) {
		record(e.orgId(), e.userId(), e.courseId(), "ENROLLED");
	}

	@Async("notificationExecutor")
	@TransactionalEventListener(fallbackExecution = true)
	public void on(LearningEvents.LessonViewed e) {
		record(e.orgId(), e.userId(), e.courseId(), "LESSON_VIEWED");
	}

	@Async("notificationExecutor")
	@TransactionalEventListener(fallbackExecution = true)
	public void on(LearningEvents.LessonCompleted e) {
		record(e.orgId(), e.userId(), e.courseId(), "LESSON_COMPLETED");
	}

	@Async("notificationExecutor")
	@TransactionalEventListener(fallbackExecution = true)
	public void on(LearningEvents.CourseCompleted e) {
		record(e.orgId(), e.userId(), e.courseId(), "COURSE_COMPLETED");
	}

	@Async("notificationExecutor")
	@TransactionalEventListener(fallbackExecution = true)
	public void on(AssessmentEvents.QuizSubmitted e) {
		record(e.orgId(), e.userId(), e.courseId(), "QUIZ_SUBMITTED");
	}

	@Async("notificationExecutor")
	@TransactionalEventListener(fallbackExecution = true)
	public void on(AssessmentEvents.AssignmentSubmitted e) {
		record(e.orgId(), e.userId(), e.courseId(), "ASSIGNMENT_SUBMITTED");
	}

	@Async("notificationExecutor")
	@TransactionalEventListener(fallbackExecution = true)
	public void on(DiscussionEvents.ThreadCreated e) {
		record(e.orgId(), e.authorId(), e.courseId(), "THREAD_CREATED");
	}

	@Async("notificationExecutor")
	@TransactionalEventListener(fallbackExecution = true)
	public void on(DiscussionEvents.ReplyCreated e) {
		record(e.orgId(), e.authorId(), e.courseId(), "REPLY_CREATED");
	}

	@Async("notificationExecutor")
	@TransactionalEventListener(fallbackExecution = true)
	public void on(BillingEvents.OrderPaid e) {
		record(e.orgId(), e.userId(), e.courseId(), "ORDER_PAID");
	}

	private void record(UUID orgId, UUID userId, UUID courseId, String kind) {
		Timestamp now = Timestamp.from(clock.instant());
		jdbc.sql("insert into activity_events (id, org_id, user_id, course_id, kind, occurred_at, created_at, updated_at) "
				+ "values (?, ?, ?, ?, ?, ?, ?, ?)")
			.params(UUID.randomUUID(), orgId, userId, courseId, kind, now, now, now)
			.update();
	}
}
