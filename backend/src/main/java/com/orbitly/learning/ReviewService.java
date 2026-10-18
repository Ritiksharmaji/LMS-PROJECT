package com.orbitly.learning;

import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.orbitly.catalog.CourseCatalog;
import com.orbitly.catalog.CourseStatus;
import com.orbitly.common.security.CurrentUser;
import com.orbitly.common.web.ApiException;
import com.orbitly.common.web.PageResponse;
import com.orbitly.identity.UserDirectory;
import com.orbitly.learning.LearningDtos.ReviewRequest;
import com.orbitly.learning.LearningDtos.ReviewSummary;
import com.orbitly.learning.LearningDtos.ReviewView;
import com.orbitly.learning.LearningEntities.Review;

/** One review per enrolled learner per course; keeps the course's rating average current. */
@Service
class ReviewService {

	private final ReviewRepository reviews;

	private final Enrollments enrollments;

	private final CourseCatalog catalog;

	private final UserDirectory directory;

	ReviewService(ReviewRepository reviews, Enrollments enrollments, CourseCatalog catalog, UserDirectory directory) {
		this.reviews = reviews;
		this.enrollments = enrollments;
		this.catalog = catalog;
		this.directory = directory;
	}

	@Transactional(readOnly = true)
	PageResponse<ReviewView> list(UUID orgId, UUID courseId, int page, int size) {
		catalog.course(orgId, courseId)
			.filter(c -> c.status() == CourseStatus.PUBLISHED)
			.orElseThrow(() -> ApiException.notFound("Course"));
		var result = reviews.findByCourseIdOrderByCreatedAtDesc(courseId, PageRequest.of(page, Math.min(size, 50)));
		var people = directory.people(result.getContent().stream().map(Review::getUserId).toList());
		return PageResponse.of(result, r -> {
			var p = people.get(r.getUserId());
			return new ReviewView(r.getId(), r.getRating(), r.getComment(), r.getUserId(),
					p == null ? null : p.fullName(), p == null ? null : p.avatarUrl(), r.getCreatedAt(), r.getUpdatedAt());
		});
	}

	@Transactional(readOnly = true)
	ReviewSummary summary(UUID courseId) {
		Object[] stats = reviews.stats(courseId).get(0);
		Map<Integer, Long> histogram = new TreeMap<>();
		for (int i = 1; i <= 5; i++) {
			histogram.put(i, 0L);
		}
		reviews.histogram(courseId).forEach(r -> histogram.put(((Number) r[0]).intValue(), (Long) r[1]));
		return new ReviewSummary(((Number) stats[0]).doubleValue(), (Long) stats[1], histogram);
	}

	@Transactional
	ReviewView upsert(CurrentUser me, UUID courseId, ReviewRequest req) {
		catalog.course(me.orgId(), courseId).orElseThrow(() -> ApiException.notFound("Course"));
		if (!enrollments.isEnrolled(me.userId(), courseId)) {
			throw ApiException.forbidden("Only enrolled learners can review a course");
		}
		Review r = reviews.findByCourseIdAndUserId(courseId, me.userId())
			.orElseGet(() -> new Review(me.orgId(), courseId, me.userId()));
		r.setRating(req.rating().shortValue());
		r.setComment(req.comment() == null || req.comment().isBlank() ? null : req.comment().trim());
		r = reviews.saveAndFlush(r);
		refreshRating(me.orgId(), courseId);
		var p = directory.person(me.userId()).orElse(null);
		return new ReviewView(r.getId(), r.getRating(), r.getComment(), me.userId(), p == null ? null : p.fullName(),
				p == null ? null : p.avatarUrl(), r.getCreatedAt(), r.getUpdatedAt());
	}

	@Transactional
	void delete(CurrentUser me, UUID courseId) {
		reviews.findByCourseIdAndUserId(courseId, me.userId())
			.filter(r -> r.getOrgId().equals(me.orgId()))
			.ifPresent(r -> {
				reviews.delete(r);
				reviews.flush();
				refreshRating(me.orgId(), courseId);
			});
	}

	private void refreshRating(UUID orgId, UUID courseId) {
		Object[] stats = reviews.stats(courseId).get(0);
		catalog.updateRating(orgId, courseId, ((Number) stats[0]).doubleValue(), ((Long) stats[1]).intValue());
	}
}
