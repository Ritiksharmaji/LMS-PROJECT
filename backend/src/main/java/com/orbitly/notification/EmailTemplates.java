package com.orbitly.notification;

import org.springframework.web.util.HtmlUtils;

import com.orbitly.notification.Mailer.Email;

/** Plain, readable transactional emails in the Orbitly style: a heading, a short message and one button. */
final class EmailTemplates {

	private EmailTemplates() {
	}

	static Email email(String to, String subject, String heading, String message, String buttonLabel, String link) {
		String text = heading + "\n\n" + message + (link == null ? "" : "\n\n" + buttonLabel + ": " + link)
				+ "\n\n— Orbitly";
		String button = link == null ? ""
				: "<p style=\"margin:28px 0\"><a href=\"" + HtmlUtils.htmlEscape(link)
						+ "\" style=\"background:#FF6B57;color:#fff;text-decoration:none;padding:12px 20px;"
						+ "border-radius:10px;font-weight:600;display:inline-block\">" + HtmlUtils.htmlEscape(buttonLabel)
						+ "</a></p>";
		String html = "<!doctype html><html><body style=\"margin:0;background:#faf9f5;font-family:-apple-system,"
				+ "Segoe UI,sans-serif;color:#0E1024\"><div style=\"max-width:520px;margin:0 auto;padding:40px 24px\">"
				+ "<div style=\"font:700 24px/1 sans-serif;letter-spacing:-0.04em\">orbitly<span style=\"color:#FF6B57\">."
				+ "</span></div><h1 style=\"font-size:22px;margin:28px 0 8px\">" + HtmlUtils.htmlEscape(heading) + "</h1>"
				+ "<p style=\"font-size:15px;line-height:24px;color:#3d3f55;white-space:pre-line\">"
				+ HtmlUtils.htmlEscape(message) + "</p>" + button
				+ "<p style=\"font-size:12px;color:#8a8ca0;margin-top:36px\">You're receiving this because of your "
				+ "Orbitly account.</p></div></body></html>";
		return new Email(to, subject, text, html);
	}
}
