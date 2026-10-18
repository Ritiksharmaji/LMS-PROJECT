package com.orbitly.support;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

import org.springframework.boot.test.context.TestComponent;
import org.springframework.context.annotation.Primary;

import com.orbitly.notification.Mailer;

/** Captures outgoing email so tests can read invite and reset links. */
@Primary
@TestComponent
public class RecordingMailer implements Mailer {

	private final List<Email> sent = new CopyOnWriteArrayList<>();

	@Override
	public void send(Email email) {
		sent.add(email);
	}

	public List<Email> to(String address) {
		return sent.stream().filter(e -> e.to().equalsIgnoreCase(address)).toList();
	}

	public Email last(String address) {
		var list = to(address);
		if (list.isEmpty()) {
			throw new AssertionError("No email sent to " + address);
		}
		return list.get(list.size() - 1);
	}
}
