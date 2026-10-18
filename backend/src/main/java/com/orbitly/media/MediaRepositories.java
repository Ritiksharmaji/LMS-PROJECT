package com.orbitly.media;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.orbitly.media.MediaEntities.CourseResource;
import com.orbitly.media.MediaEntities.LessonVideo;
import com.orbitly.media.MediaEntities.MediaFile;

interface MediaFileRepository extends JpaRepository<MediaFile, UUID> {

	Optional<MediaFile> findByIdAndOrgId(UUID id, UUID orgId);

	Optional<MediaFile> findByStorageKey(String storageKey);
}

interface CourseResourceRepository extends JpaRepository<CourseResource, UUID> {

	Optional<CourseResource> findByIdAndOrgId(UUID id, UUID orgId);

	@Query("select r from CourseResource r where r.courseId = :courseId "
			+ "and (:lessonId is null or r.lessonId = :lessonId) order by r.position, r.createdAt")
	List<CourseResource> forCourse(@Param("courseId") UUID courseId, @Param("lessonId") UUID lessonId);

	int countByCourseId(UUID courseId);
}

interface LessonVideoRepository extends JpaRepository<LessonVideo, UUID> {

	Optional<LessonVideo> findByLessonIdAndOrgId(UUID lessonId, UUID orgId);

	Optional<LessonVideo> findByMuxUploadId(String muxUploadId);

	Optional<LessonVideo> findByMuxAssetId(String muxAssetId);
}
