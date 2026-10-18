package com.orbitly.notification;

import java.nio.charset.StandardCharsets;
import java.util.concurrent.Executor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.SyncTaskExecutor;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Configuration
class NotificationConfig {

	private static final Logger log = LoggerFactory.getLogger(NotificationConfig.class);

	@Bean
	Executor notificationExecutor(NotificationProperties properties) {
		if (!properties.async()) {
			return new SyncTaskExecutor();
		}
		ThreadPoolTaskExecutor pool = new ThreadPoolTaskExecutor();
		pool.setThreadNamePrefix("notify-");
		pool.setCorePoolSize(2);
		pool.setMaxPoolSize(8);
		pool.setQueueCapacity(1000);
		pool.initialize();
		return pool;
	}

	@Bean
	@ConditionalOnProperty(prefix = "orbitly.notifications", name = "mail-mode", havingValue = "smtp")
	Mailer smtpMailer(JavaMailSender sender, NotificationProperties properties) {
		return email -> {
			try {
				var message = sender.createMimeMessage();
				var helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
				helper.setFrom(properties.fromAddress());
				helper.setTo(email.to());
				helper.setSubject(email.subject());
				helper.setText(email.text(), email.html());
				sender.send(message);
			}
			catch (Exception ex) {
				log.warn("Could not send email '{}' to {}: {}", email.subject(), email.to(), ex.getMessage());
			}
		};
	}

	@Bean
	@ConditionalOnProperty(prefix = "orbitly.notifications", name = "mail-mode", havingValue = "log", matchIfMissing = true)
	Mailer logMailer() {
		return email -> log.info("Email to {} | {}\n{}", email.to(), email.subject(), email.text());
	}
}
