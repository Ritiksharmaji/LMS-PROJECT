package com.orbitly.discussion;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.orbitly.catalog.CourseCatalog;
import com.orbitly.catalog.CourseCatalog.CourseRef;
import com.orbitly.common.security.CurrentUser;
import com.orbitly.common.web.ApiException;
import com.orbitly.common.web.PageResponse;
import com.orbitly.discussion.DiscussionDtos.Author;
import com.orbitly.discussion.DiscussionDtos.NewThreadRequest;
import com.orbitly.discussion.DiscussionDtos.ReplyView;
import com.orbitly.discussion.DiscussionDtos.ThreadDetail;
import com.orbitly.discussion.DiscussionDtos.ThreadSummary;
import com.orbitly.discussion.DiscussionEntities.DiscussionReply;
import com.orbitly.discussion.DiscussionEntities.DiscussionThread;
import com.orbitly.identity.UserDirectory;
import com.orbitly.learning.Enrollments;

/**
 * Course discussions. Anyone with access to the course can read and post; authors edit their own posts; course
 * staff moderate (pin, delete any post, mark answers).
 */
@Service
class DiscussionService {

	static final String DELETED = "[deleted]";

	private final ThreadRepository threads;

	private final ReplyRepository replies;

	private final CourseCatalog catalog;

	private final Enrollments enrollments;

	private final UserDirectory directory;

	private final ApplicationEventPublisher events;

	private final Clock clock;

	DiscussionService(ThreadRepository threads, ReplyRepository replies, CourseCatalog catalog, Enrollments enrollments,
			UserDirectory directory, ApplicationEventPublisher events, Clock clock) {
		this.threads = threads;
		this.replies = replies;
		this.catalog = catalog;
		this.enrollments = enrollments;
		this.directory = directory;
		this.events = events;
		this.clock = clock;
	}

	@Transactional(readOnly = true)
	PageResponse<ThreadSummary> list(CurrentUser me, UUID courseId, UUID lessonId, boolean unresolved, int page,
			int size) {
		CourseRef course = accessible(me, courseId);
		var result = threads.forCourse(courseId, lessonId, unresolved, PageRequest.of(page, Math.min(size, 50)));
		var authors = authors(course, result.getContent().stream().map(DiscussionThread::getAuthorId).toList());
		return PageResponse.of(result, t -> summary(t, authors));
	}

	@Transactional
	ThreadDetail create(CurrentUser me, UUID courseId, NewThreadRequest req) {
		CourseRef course = accessible(me, courseId);
		if (req.lessonId() != null) {
			var lesson = catalog.lesson(me.orgId(), req.lessonId()).orElseThrow(() -> ApiException.badRequest("Unknown lesson"));
			if (!lesson.courseId().equals(courseId)) {
				throw ApiException.badRequest("That lesson belongs to another course");
			}
		}
		DiscussionThread t = new DiscussionThread(me.orgId(), courseId, me.userId(), req.body().trim(), clock.instant());
		t.setLessonId(req.lessonId());
		t.setTitle(req.title() == null || req.title().isBlank() ? null : req.title().trim());
		t = threads.save(t);
		events.publishEvent(new DiscussionEvents.ThreadCreated(me.orgId(), t.getId(), courseId, me.userId(),
				course.instructorId(), preview(t.getBody())));
		return detail(course, t);
	}

	@Transactional(readOnly = true)
	ThreadDetail get(CurrentUser me, UUID threadId) {
		DiscussionThread t = thread(me, threadId);
		return detail(accessible(me, t.getCourseId()), t);
	}

	@Transactional
	ThreadDetail edit(CurrentUser me, UUID threadId, String body, String title) {
		DiscussionThread t = thread(me, threadId);
		CourseRef course = accessible(me, t.getCourseId());
		requireAuthor(me, t.getAuthorId());
		t.setBody(body.trim());
		if (title != null) {
			t.setTitle(title.isBlank() ? null : title.trim());
		}
		t.setEditedAt(clock.instant());
		return detail(course, t);
	}

	/** Soft delete: the thread disappears from lists; replies stay attached for context. */
	@Transactional
	void delete(CurrentUser me, UUID threadId) {
		DiscussionThread t = thread(me, threadId);
		CourseRef course = accessible(me, t.getCourseId());
		if (!t.getAuthorId().equals(me.userId()) && !Enrollments.isStaff(me, course)) {
			throw ApiException.forbidden("Only the author or course staff can delete this");
		}
		t.setDeletedAt(clock.instant());
	}

	@Transactional
	ThreadDetail setPinned(CurrentUser me, UUID threadId, boolean pinned) {
		DiscussionThread t = thread(me, threadId);
		CourseRef course = staff(me, t.getCourseId());
		t.setPinned(pinned);
		return detail(course, t);
	}

	@Transactional
	ThreadDetail setResolved(CurrentUser me, UUID threadId, boolean resolved) {
		DiscussionThread t = thread(me, threadId);
		CourseRef course = accessible(me, t.getCourseId());
		if (!t.getAuthorId().equals(me.userId()) && !Enrollments.isStaff(me, course)) {
			throw ApiException.forbidden("Only the author or course staff can resolve this");
		}
		t.setResolved(resolved);
		return detail(course, t);
	}

	@Transactional
	ReplyView reply(CurrentUser me, UUID threadId, String body) {
		DiscussionThread t = thread(me, threadId);
		CourseRef course = accessible(me, t.getCourseId());
		Instant now = clock.instant();
		DiscussionReply r = replies.save(new DiscussionReply(me.orgId(), t.getId(), me.userId(), body.trim()));
		t.setReplyCount(t.getReplyCount() + 1);
		t.setLastActivityAt(now);
		events.publishEvent(new DiscussionEvents.ReplyCreated(me.orgId(), t.getId(), r.getId(), t.getCourseId(),
				me.userId(), t.getAuthorId(), preview(r.getBody())));
		return replyView(r, authors(course, List.of(me.userId())));
	}

	@Transactional
	ReplyView editReply(CurrentUser me, UUID replyId, String body) {
		DiscussionReply r = replyOf(me, replyId);
		DiscussionThread t = thread(me, r.getThreadId());
		CourseRef course = accessible(me, t.getCourseId());
		requireAuthor(me, r.getAuthorId());
		r.setBody(body.trim());
		r.setEditedAt(clock.instant());
		return replyView(r, authors(course, List.of(r.getAuthorId())));
	}

	@Transactional
	void deleteReply(CurrentUser me, UUID replyId) {
		DiscussionReply r = replyOf(me, replyId);
		DiscussionThread t = thread(me, r.getThreadId());
		CourseRef course = accessible(me, t.getCourseId());
		if (!r.getAuthorId().equals(me.userId()) && !Enrollments.isStaff(me, course)) {
			throw ApiException.forbidden("Only the author or course staff can delete this");
		}
		if (r.getDeletedAt() == null) {
			r.setDeletedAt(clock.instant());
			r.setAnswer(false);
			t.setReplyCount(Math.max(0, t.getReplyCount() - 1));
		}
	}

	/** The thread's author or course staff mark the reply that answered the question; the thread is resolved. */
	@Transactional
	ReplyView markAnswer(CurrentUser me, UUID replyId, boolean answer) {
		DiscussionReply r = replyOf(me, replyId);
		DiscussionThread t = thread(me, r.getThreadId());
		CourseRef course = accessible(me, t.getCourseId());
		if (!t.getAuthorId().equals(me.userId()) && !Enrollments.isStaff(me, course)) {
			throw ApiException.forbidden("Only the question's author or course staff can mark answers");
		}
		if (r.getDeletedAt() != null) {
			throw ApiException.badRequest("Deleted replies can't be answers");
		}
		r.setAnswer(answer);
		if (answer) {
			t.setResolved(true);
		}
		return replyView(r, authors(course, List.of(r.getAuthorId())));
	}

	// ---- Helpers --------------------------------------------------------------------------------------------

	private ThreadDetail detail(CourseRef course, DiscussionThread t) {
		var list = replies.findByThreadIdOrderByCreatedAtAsc(t.getId());
		Set<UUID> ids = new HashSet<>();
		ids.add(t.getAuthorId());
		list.forEach(r -> ids.add(r.getAuthorId()));
		var authors = authors(course, new ArrayList<>(ids));
		return new ThreadDetail(summary(t, authors), list.stream().map(r -> replyView(r, authors)).toList());
	}

	private static ThreadSummary summary(DiscussionThread t, java.util.Map<UUID, Author> authors) {
		boolean deleted = t.getDeletedAt() != null;
		return new ThreadSummary(t.getId(), t.getCourseId(), t.getLessonId(), deleted ? null : t.getTitle(),
				deleted ? DELETED : t.getBody(), authors.get(t.getAuthorId()), t.isPinned(), t.isResolved(),
				t.getReplyCount(), t.getLastActivityAt(), t.getCreatedAt(), t.getEditedAt(), deleted);
	}

	private static ReplyView replyView(DiscussionReply r, java.util.Map<UUID, Author> authors) {
		boolean deleted = r.getDeletedAt() != null;
		return new ReplyView(r.getId(), r.getThreadId(), deleted ? DELETED : r.getBody(), authors.get(r.getAuthorId()),
				r.isAnswer(), r.getCreatedAt(), r.getEditedAt(), deleted);
	}

	/** Author cards, flagging the course's staff so the UI can badge instructor replies. */
	private java.util.Map<UUID, Author> authors(CourseRef course, List<UUID> ids) {
		var people = directory.people(new HashSet<>(ids));
		java.util.Map<UUID, Author> out = new java.util.HashMap<>();
		people.forEach((id, p) -> {
			boolean staff = id.equals(course.instructorId()) || directory.activeRole(course.orgId(), id)
				.map(r -> r == com.orbitly.common.security.Role.ADMIN)
				.orElse(false);
			out.put(id, new Author(id, p.fullName(), p.avatarUrl(), staff));
		});
		return out;
	}

	private DiscussionThread thread(CurrentUser me, UUID id) {
		return threads.findByIdAndOrgId(id, me.orgId()).orElseThrow(() -> ApiException.notFound("Thread"));
	}

	private DiscussionReply replyOf(CurrentUser me, UUID id) {
		return replies.findByIdAndOrgId(id, me.orgId()).orElseThrow(() -> ApiException.notFound("Reply"));
	}

	private CourseRef accessible(CurrentUser me, UUID courseId) {
		CourseRef course = catalog.course(me.orgId(), courseId).orElseThrow(() -> ApiException.notFound("Course"));
		if (!enrollments.canAccess(me, course)) {
			throw ApiException.forbidden("Enroll in this course to join its discussion");
		}
		return course;
	}

	private CourseRef staff(CurrentUser me, UUID courseId) {
		CourseRef course = accessible(me, courseId);
		if (!Enrollments.isStaff(me, course)) {
			throw ApiException.forbidden("Only course staff can do that");
		}
		return course;
	}

	private static void requireAuthor(CurrentUser me, UUID authorId) {
		if (!authorId.equals(me.userId())) {
			throw ApiException.forbidden("You can only edit your own posts");
		}
	}

	private static String preview(String body) {
		return body.length() <= 140 ? body : body.substring(0, 137) + "...";
	}
}
