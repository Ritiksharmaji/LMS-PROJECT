package com.orbitly.identity;

import com.orbitly.common.persistence.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** A person. One account can belong to several organizations through {@link Membership}. */
@Getter
@Setter
@Entity
@Table(name = "users")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User extends BaseEntity {

	/** Always stored lower-case. */
	@Column(nullable = false, unique = true)
	private String email;

	@Column(nullable = false)
	private String passwordHash;

	@Column(nullable = false)
	private String fullName;

	private String avatarUrl;

	public User(String email, String passwordHash, String fullName) {
		this.email = normalizeEmail(email);
		this.passwordHash = passwordHash;
		this.fullName = fullName;
	}

	public static String normalizeEmail(String email) {
		return email.trim().toLowerCase(java.util.Locale.ROOT);
	}
}
