package com.orbitly.notification;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * {@code mailMode}: {@code log} writes emails to the log (development), {@code smtp} sends them. {@code async}
 * delivers notifications on a background pool (tests turn it off).
 */
@ConfigurationProperties(prefix = "orbitly.notifications")
record NotificationProperties(String mailMode, String fromAddress, Boolean async, Boolean reminders) {

	NotificationProperties {
		mailMode = mailMode == null || mailMode.isBlank() ? "log" : mailMode;
		fromAddress = fromAddress == null || fromAddress.isBlank() ? "Orbitly <no-reply@orbitly.local>" : fromAddress;
		async = async == null || async;
		reminders = reminders == null || reminders;
	}
}
