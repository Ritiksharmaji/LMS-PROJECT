package com.orbitly.notification;

import java.time.Clock;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.orbitly.common.security.CurrentUser;
import com.orbitly.common.web.ApiException;
import com.orbitly.common.web.PageResponse;
import com.orbitly.notification.NotificationEntities.Notification;
import com.orbitly.notification.NotificationEntities.NotificationSetting;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

@RestController
@RequestMapping("/api/me")
class NotificationController {

	record NotificationView(UUID id, String kind, String title, String body, String link, boolean read,
			Instant createdAt) {

		static NotificationView of(Notification n) {
			return new NotificationView(n.getId(), n.getKind(), n.getTitle(), n.getBody(), n.getLink(),
					n.getReadAt() != null, n.getCreatedAt());
		}
	}

	record SettingsView(boolean emailEnabled) {
	}

	record SettingsRequest(@NotNull Boolean emailEnabled) {
	}

	private final NotificationRepository notifications;

	private final NotificationSettingRepository settings;

	private final Clock clock;

	NotificationController(NotificationRepository notifications, NotificationSettingRepository settings, Clock clock) {
		this.notifications = notifications;
		this.settings = settings;
		this.clock = clock;
	}

	@GetMapping("/notifications")
	@Transactional(readOnly = true)
	PageResponse<NotificationView> list(@RequestParam(defaultValue = "false") boolean unread,
			@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
		var me = CurrentUser.get();
		return PageResponse.of(
				notifications.forUser(me.orgId(), me.userId(), unread, PageRequest.of(page, Math.min(size, 100))),
				NotificationView::of);
	}

	@GetMapping("/notifications/unread-count")
	@Transactional(readOnly = true)
	Map<String, Long> unreadCount() {
		var me = CurrentUser.get();
		return Map.of("unread", notifications.unread(me.orgId(), me.userId()));
	}

	@PostMapping("/notifications/{id}/read")
	@Transactional
	NotificationView markRead(@PathVariable UUID id) {
		var me = CurrentUser.get();
		Notification n = notifications.findByIdAndUserId(id, me.userId())
			.filter(x -> x.getOrgId().equals(me.orgId()))
			.orElseThrow(() -> ApiException.notFound("Notification"));
		if (n.getReadAt() == null) {
			n.setReadAt(clock.instant());
		}
		return NotificationView.of(n);
	}

	@PostMapping("/notifications/read-all")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	@Transactional
	void markAllRead() {
		var me = CurrentUser.get();
		notifications.markAllRead(me.orgId(), me.userId(), clock.instant());
	}

	@GetMapping("/notification-settings")
	@Transactional(readOnly = true)
	SettingsView getSettings() {
		return new SettingsView(settings.findByUserId(CurrentUser.get().userId())
			.map(NotificationSetting::isEmailEnabled)
			.orElse(true));
	}

	@PutMapping("/notification-settings")
	@Transactional
	SettingsView updateSettings(@Valid @RequestBody SettingsRequest req) {
		UUID userId = CurrentUser.get().userId();
		NotificationSetting s = settings.findByUserId(userId).orElseGet(() -> settings.save(new NotificationSetting(userId)));
		s.setEmailEnabled(req.emailEnabled());
		return new SettingsView(s.isEmailEnabled());
	}
}
