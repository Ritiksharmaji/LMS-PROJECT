package com.orbitly.notification;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.orbitly.assessment.AssessmentDeadlines;
import com.orbitly.catalog.CourseCatalog;
import com.orbitly.common.config.OrbitlyProperties;
import com.orbitly.notification.NotificationEntities.ReminderSent;
import com.orbitly.notification.Notifier.EmailPolicy;

/** Every 30 minutes: remind learners about quizzes and assignments due in the next 24 hours, once per due date. */
@Component
class DeadlineReminderJob {

	private static final Logger log = LoggerFactory.getLogger(DeadlineReminderJob.class);

	static final Duration WINDOW = Duration.ofHours(24);

	private final AssessmentDeadlines deadlines;

	private final ReminderSentRepository sent;

	private final Notifier notifier;

	private final CourseCatalog catalog;

	private final NotificationProperties properties;

	private final String app;

	private final Clock clock;

	DeadlineReminderJob(AssessmentDeadlines deadlines, ReminderSentRepository sent, Notifier notifier,
			CourseCatalog catalog, NotificationProperties properties, OrbitlyProperties app, Clock clock) {
		this.deadlines = deadlines;
		this.sent = sent;
		this.notifier = notifier;
		this.catalog = catalog;
		this.properties = properties;
		this.app = app.appUrl();
		this.clock = clock;
	}

	@Scheduled(fixedDelayString = "PT30M", initialDelayString = "PT1M")
	void scheduled() {
		if (properties.reminders()) {
			run();
		}
	}

	/** Returns how many reminders were sent. */
	int run() {
		Instant now = clock.instant();
		int count = 0;
		for (var item : deadlines.dueBetween(now, now.plus(WINDOW))) {
			var lesson = catalog.lesson(item.orgId(), item.lessonId()).orElse(null);
			var course = catalog.course(item.orgId(), item.courseId()).orElse(null);
			if (lesson == null || course == null) {
				continue;
			}
			for (var learner : deadlines.pendingLearners(item)) {
				if (sent.existsByUserIdAndLessonIdAndDueAt(learner, item.lessonId(), item.dueAt())) {
					continue;
				}
				sent.save(new ReminderSent(learner, item.lessonId(), item.dueAt()));
				notifier.notify(item.orgId(), learner, "DEADLINE_SOON", lesson.title() + " is due soon",
						course.title() + " · due " + NotificationListeners.WHEN.format(item.dueAt()),
						app + "/learn/lessons/" + item.lessonId(), EmailPolicy.OPTIONAL, "Open lesson");
				count++;
			}
		}
		if (count > 0) {
			log.info("Sent {} deadline reminders", count);
		}
		return count;
	}
}
