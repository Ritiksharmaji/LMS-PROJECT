package com.orbitly.notification;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.orbitly.common.persistence.BaseEntity;
import com.orbitly.common.persistence.TenantEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

final class NotificationEntities {

	private NotificationEntities() {
	}

	@Getter
	@Setter
	@Entity(name = "Notification")
	@Table(name = "notifications")
	@NoArgsConstructor(access = AccessLevel.PROTECTED)
	static class Notification extends TenantEntity {

		@Column(nullable = false)
		private UUID userId;

		@Column(nullable = false)
		private String kind;

		@Column(nullable = false)
		private String title;

		private String body;

		private String link;

		private Instant readAt;

		Notification(UUID orgId, UUID userId, String kind, String title, String body, String link) {
			setOrgId(orgId);
			this.userId = userId;
			this.kind = kind;
			this.title = title;
			this.body = body;
			this.link = link;
		}
	}

	@Getter
	@Setter
	@Entity(name = "NotificationSetting")
	@Table(name = "notification_settings")
	@NoArgsConstructor(access = AccessLevel.PROTECTED)
	static class NotificationSetting extends BaseEntity {

		@Column(nullable = false, unique = true)
		private UUID userId;

		private boolean emailEnabled = true;

		NotificationSetting(UUID userId) {
			this.userId = userId;
		}
	}

	@Getter
	@Entity(name = "ReminderSent")
	@Table(name = "reminders_sent")
	@NoArgsConstructor(access = AccessLevel.PROTECTED)
	static class ReminderSent extends BaseEntity {

		@Column(nullable = false)
		private UUID userId;

		@Column(nullable = false)
		private UUID lessonId;

		@Column(nullable = false)
		private Instant dueAt;

		ReminderSent(UUID userId, UUID lessonId, Instant dueAt) {
			this.userId = userId;
			this.lessonId = lessonId;
			this.dueAt = dueAt;
		}
	}
}

interface NotificationRepository extends JpaRepository<NotificationEntities.Notification, UUID> {

	@Query("select n from Notification n where n.userId = :userId and n.orgId = :orgId "
			+ "and (:unread = false or n.readAt is null) order by n.createdAt desc")
	Page<NotificationEntities.Notification> forUser(@Param("orgId") UUID orgId, @Param("userId") UUID userId,
			@Param("unread") boolean unread, Pageable pageable);

	@Query("select count(n) from Notification n where n.userId = :userId and n.orgId = :orgId and n.readAt is null")
	long unread(@Param("orgId") UUID orgId, @Param("userId") UUID userId);

	Optional<NotificationEntities.Notification> findByIdAndUserId(UUID id, UUID userId);

	@Modifying
	@Query("update Notification n set n.readAt = :now where n.userId = :userId and n.orgId = :orgId and n.readAt is null")
	int markAllRead(@Param("orgId") UUID orgId, @Param("userId") UUID userId, @Param("now") Instant now);
}

interface NotificationSettingRepository extends JpaRepository<NotificationEntities.NotificationSetting, UUID> {

	Optional<NotificationEntities.NotificationSetting> findByUserId(UUID userId);
}

interface ReminderSentRepository extends JpaRepository<NotificationEntities.ReminderSent, UUID> {

	boolean existsByUserIdAndLessonIdAndDueAt(UUID userId, UUID lessonId, Instant dueAt);
}
