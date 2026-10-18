package com.orbitly.discussion;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.orbitly.discussion.DiscussionEntities.DiscussionReply;
import com.orbitly.discussion.DiscussionEntities.DiscussionThread;

interface ThreadRepository extends JpaRepository<DiscussionThread, UUID> {

	Optional<DiscussionThread> findByIdAndOrgId(UUID id, UUID orgId);

	@Query("select t from DiscussionThread t where t.courseId = :courseId and t.deletedAt is null "
			+ "and (:lessonId is null or t.lessonId = :lessonId) "
			+ "and (:unresolved = false or t.resolved = false) "
			+ "order by t.pinned desc, t.lastActivityAt desc")
	Page<DiscussionThread> forCourse(@Param("courseId") UUID courseId, @Param("lessonId") UUID lessonId,
			@Param("unresolved") boolean unresolved, Pageable pageable);
}

interface ReplyRepository extends JpaRepository<DiscussionReply, UUID> {

	Optional<DiscussionReply> findByIdAndOrgId(UUID id, UUID orgId);

	List<DiscussionReply> findByThreadIdOrderByCreatedAtAsc(UUID threadId);
}
