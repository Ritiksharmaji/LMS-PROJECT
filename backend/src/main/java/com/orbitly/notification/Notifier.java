package com.orbitly.notification;

import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.orbitly.identity.UserDirectory;
import com.orbitly.notification.NotificationEntities.Notification;

/** Stores in-app notifications and sends the matching email when the person allows it. */
@Service
class Notifier {

	enum EmailPolicy {
		/** No email. */
		NONE,
		/** Email unless the person turned emails off. */
		OPTIONAL,
		/** Always email (receipts, security). */
		ESSENTIAL
	}

	private final NotificationRepository notifications;

	private final NotificationSettingRepository settings;

	private final UserDirectory directory;

	private final Mailer mailer;

	Notifier(NotificationRepository notifications, NotificationSettingRepository settings, UserDirectory directory,
			Mailer mailer) {
		this.notifications = notifications;
		this.settings = settings;
		this.directory = directory;
		this.mailer = mailer;
	}

	/**
	 * Runs in its own transaction: listeners fire after the triggering transaction has committed.
	 */
	@Transactional(propagation = Propagation.REQUIRES_NEW)
	void notify(UUID orgId, UUID userId, String kind, String title, String body, String link, EmailPolicy policy,
			String buttonLabel) {
		notifications.save(new Notification(orgId, userId, kind, title, body, link));
		if (policy == EmailPolicy.NONE) {
			return;
		}
		boolean allowed = policy == EmailPolicy.ESSENTIAL
				|| settings.findByUserId(userId).map(NotificationEntities.NotificationSetting::isEmailEnabled).orElse(true);
		if (allowed) {
			directory.person(userId)
				.ifPresent(p -> mailer.send(EmailTemplates.email(p.email(), title, title, body == null ? "" : body,
						buttonLabel, link)));
		}
	}

	/** For people who may not have an account yet (invites) or account-level mail (password resets). */
	void emailOnly(String to, String subject, String heading, String message, String buttonLabel, String link) {
		mailer.send(EmailTemplates.email(to, subject, heading, message, buttonLabel, link));
	}
}
