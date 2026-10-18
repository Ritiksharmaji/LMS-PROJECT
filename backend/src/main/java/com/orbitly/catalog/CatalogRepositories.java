package com.orbitly.catalog;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.orbitly.catalog.CatalogEntities.Category;
import com.orbitly.catalog.CatalogEntities.Course;
import com.orbitly.catalog.CatalogEntities.Lesson;
import com.orbitly.catalog.CatalogEntities.Section;
import com.orbitly.catalog.CatalogEntities.WishlistItem;

interface CategoryRepository extends JpaRepository<Category, UUID> {

	List<Category> findByOrgIdOrderByPositionAscNameAsc(UUID orgId);

	Optional<Category> findByIdAndOrgId(UUID id, UUID orgId);

	Optional<Category> findByOrgIdAndSlug(UUID orgId, String slug);

	boolean existsByOrgIdAndSlug(UUID orgId, String slug);
}

interface CourseRepository extends JpaRepository<Course, UUID> {

	Optional<Course> findByIdAndOrgId(UUID id, UUID orgId);

	Optional<Course> findByOrgIdAndSlug(UUID orgId, String slug);

	boolean existsByOrgIdAndSlug(UUID orgId, String slug);

	List<Course> findByOrgIdAndIdIn(UUID orgId, Collection<UUID> ids);

	@Query("""
			select c from Course c where c.orgId = :orgId and c.status = 'PUBLISHED'
			and (:categoryId is null or c.categoryId = :categoryId)
			and (:level is null or c.level = :level)
			and (:free is null or (:free = true and c.priceCents = 0) or (:free = false and c.priceCents > 0))
			and (:q = '' or lower(c.title) like concat('%', :q, '%') or lower(c.tagline) like concat('%', :q, '%'))
			""")
	Page<Course> searchPublished(@Param("orgId") UUID orgId, @Param("categoryId") UUID categoryId,
			@Param("level") CourseLevel level, @Param("free") Boolean free, @Param("q") String q, Pageable pageable);

	@Query("select c from Course c where c.orgId = :orgId and (:instructorId is null or c.instructorId = :instructorId) order by c.updatedAt desc")
	List<Course> findManaged(@Param("orgId") UUID orgId, @Param("instructorId") UUID instructorId);

	@Query("select c.categoryId, count(c) from Course c where c.orgId = :orgId and c.status = 'PUBLISHED' and c.categoryId is not null group by c.categoryId")
	List<Object[]> countPublishedByCategory(@Param("orgId") UUID orgId);

	@Query("select count(c) from Course c where c.orgId = :orgId and c.instructorId = :instructorId and c.status = 'PUBLISHED'")
	long countPublishedByInstructor(@Param("orgId") UUID orgId, @Param("instructorId") UUID instructorId);

	@Modifying
	@Query("update Course c set c.enrollmentCount = c.enrollmentCount + :delta where c.id = :id")
	void addEnrollments(@Param("id") UUID id, @Param("delta") int delta);
}

interface SectionRepository extends JpaRepository<Section, UUID> {

	List<Section> findByCourseIdOrderByPositionAsc(UUID courseId);

	Optional<Section> findByIdAndOrgId(UUID id, UUID orgId);

	int countByCourseId(UUID courseId);
}

interface LessonRepository extends JpaRepository<Lesson, UUID> {

	List<Lesson> findByCourseIdOrderByPositionAsc(UUID courseId);

	List<Lesson> findBySectionIdOrderByPositionAsc(UUID sectionId);

	Optional<Lesson> findByIdAndOrgId(UUID id, UUID orgId);

	int countBySectionId(UUID sectionId);

	@Query("select coalesce(sum(l.durationMinutes), 0) from Lesson l where l.courseId = :courseId")
	int totalMinutes(@Param("courseId") UUID courseId);

	int countByCourseId(UUID courseId);
}

interface WishlistRepository extends JpaRepository<WishlistItem, UUID> {

	List<WishlistItem> findByOrgIdAndUserIdOrderByCreatedAtDesc(UUID orgId, UUID userId);

	Optional<WishlistItem> findByUserIdAndCourseId(UUID userId, UUID courseId);

	boolean existsByUserIdAndCourseId(UUID userId, UUID courseId);
}
