package com.orbitly.identity;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.orbitly.common.security.Role;

interface OrganizationRepository extends JpaRepository<Organization, UUID> {

	Optional<Organization> findBySlug(String slug);

	boolean existsBySlug(String slug);
}

interface UserRepository extends JpaRepository<User, UUID> {

	Optional<User> findByEmail(String email);

	boolean existsByEmail(String email);
}

interface MembershipRepository extends JpaRepository<Membership, UUID> {

	@Query("select m from Membership m join fetch m.organization join fetch m.user "
			+ "where m.organization.id = :orgId and m.user.id = :userId")
	Optional<Membership> findByOrgAndUser(@Param("orgId") UUID orgId, @Param("userId") UUID userId);

	@Query("select m from Membership m join fetch m.organization join fetch m.user where m.id = :id and m.organization.id = :orgId")
	Optional<Membership> findInOrg(@Param("id") UUID id, @Param("orgId") UUID orgId);

	@Query("select m from Membership m join fetch m.organization where m.user.id = :userId order by m.organization.name")
	List<Membership> findAllForUser(@Param("userId") UUID userId);

	@Query(value = "select m from Membership m join fetch m.user u where m.organization.id = :orgId "
			+ "and (:role is null or m.role = :role) "
			+ "and (:q = '' or lower(u.fullName) like concat('%', :q, '%') or u.email like concat('%', :q, '%'))",
			countQuery = "select count(m) from Membership m join m.user u where m.organization.id = :orgId "
					+ "and (:role is null or m.role = :role) "
					+ "and (:q = '' or lower(u.fullName) like concat('%', :q, '%') or u.email like concat('%', :q, '%'))")
	Page<Membership> search(@Param("orgId") UUID orgId, @Param("role") Role role, @Param("q") String q,
			Pageable pageable);

	@Query("select count(m) from Membership m where m.organization.id = :orgId and m.status = 'ACTIVE'")
	long countActive(@Param("orgId") UUID orgId);

	@Query("select count(m) from Membership m where m.organization.id = :orgId and m.role = :role and m.status = 'ACTIVE'")
	long countActiveByRole(@Param("orgId") UUID orgId, @Param("role") Role role);
}

interface InviteRepository extends JpaRepository<Invite, UUID> {

	Optional<Invite> findByTokenHash(String tokenHash);

	Optional<Invite> findByIdAndOrgId(UUID id, UUID orgId);

	@Query("select i from Invite i where i.orgId = :orgId and i.acceptedAt is null and i.expiresAt > :now order by i.createdAt desc")
	List<Invite> findPending(@Param("orgId") UUID orgId, @Param("now") Instant now);

	@Query("select count(i) from Invite i where i.orgId = :orgId and i.acceptedAt is null and i.expiresAt > :now")
	long countPending(@Param("orgId") UUID orgId, @Param("now") Instant now);
}

interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

	Optional<RefreshToken> findByTokenHash(String tokenHash);

	@Modifying
	@Query("update RefreshToken t set t.revokedAt = :now where t.userId = :userId and t.revokedAt is null")
	int revokeAllForUser(@Param("userId") UUID userId, @Param("now") Instant now);
}

interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {

	Optional<PasswordResetToken> findByTokenHash(String tokenHash);
}
