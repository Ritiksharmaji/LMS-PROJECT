package com.orbitly.notification;

/** Sends one email. Implementations must not throw for delivery problems; they log them. */
public interface Mailer {

	record Email(String to, String subject, String text, String html) {
	}

	void send(Email email);
}
