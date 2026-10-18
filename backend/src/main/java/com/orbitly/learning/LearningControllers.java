package com.orbitly.learning;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.orbitly.catalog.CourseCatalog;
import com.orbitly.common.security.CurrentUser;
import com.orbitly.common.web.ApiException;
import com.orbitly.common.web.PageResponse;
import com.orbitly.identity.UserDirectory;
import com.orbitly.learning.LearningDtos.AssignLearnersRequest;
import com.orbitly.learning.LearningDtos.CertificateView;
import com.orbitly.learning.LearningDtos.CompletionResult;
import com.orbitly.learning.LearningDtos.EnrollRequest;
import com.orbitly.learning.LearningDtos.EnrollmentView;
import com.orbitly.learning.LearningDtos.LearnerView;
import com.orbitly.learning.LearningDtos.LearningSummary;
import com.orbitly.learning.LearningDtos.LessonContent;
import com.orbitly.learning.LearningDtos.PlayerView;
import com.orbitly.learning.LearningDtos.PositionRequest;
import com.orbitly.learning.LearningDtos.ReviewRequest;
import com.orbitly.learning.LearningDtos.ReviewSummary;
import com.orbitly.learning.LearningDtos.ReviewView;

import jakarta.validation.Valid;

final class LearningControllers {

	private LearningControllers() {
	}

	@RestController
	@RequestMapping("/api/me")
	static class MyLearningController {

		private final LearningService learning;

		private final ReviewService reviews;

		MyLearningController(LearningService learning, ReviewService reviews) {
			this.learning = learning;
			this.reviews = reviews;
		}

		@PostMapping("/enrollments")
		@ResponseStatus(HttpStatus.CREATED)
		EnrollmentView enroll(@Valid @RequestBody EnrollRequest req) {
			return learning.enroll(CurrentUser.get(), req.courseId());
		}

		@GetMapping("/enrollments")
		List<EnrollmentView> enrollments(@RequestParam(required = false) EnrollmentStatus status) {
			return learning.myEnrollments(CurrentUser.get(), status);
		}

		@GetMapping("/learning/summary")
		LearningSummary summary() {
			return learning.summary(CurrentUser.get());
		}

		@GetMapping("/courses/{courseId}/player")
		PlayerView player(@PathVariable UUID courseId) {
			return learning.player(CurrentUser.get(), courseId);
		}

		@GetMapping("/lessons/{lessonId}")
		LessonContent lesson(@PathVariable UUID lessonId) {
			return learning.lesson(CurrentUser.get(), lessonId);
		}

		@PostMapping("/lessons/{lessonId}/complete")
		CompletionResult complete(@PathVariable UUID lessonId) {
			return learning.complete(CurrentUser.get(), lessonId);
		}

		@DeleteMapping("/lessons/{lessonId}/complete")
		CompletionResult uncomplete(@PathVariable UUID lessonId) {
			return learning.uncomplete(CurrentUser.get(), lessonId);
		}

		@PutMapping("/lessons/{lessonId}/position")
		@ResponseStatus(HttpStatus.NO_CONTENT)
		void position(@PathVariable UUID lessonId, @Valid @RequestBody PositionRequest req) {
			learning.savePosition(CurrentUser.get(), lessonId, req.seconds());
		}

		@PutMapping("/courses/{courseId}/review")
		ReviewView review(@PathVariable UUID courseId, @Valid @RequestBody ReviewRequest req) {
			return reviews.upsert(CurrentUser.get(), courseId, req);
		}

		@DeleteMapping("/courses/{courseId}/review")
		@ResponseStatus(HttpStatus.NO_CONTENT)
		void deleteReview(@PathVariable UUID courseId) {
			reviews.delete(CurrentUser.get(), courseId);
		}
	}

	@RestController
	@RequestMapping("/api/public")
	static class PublicLearningController {

		private final ReviewService reviews;

		private final LearningService learning;

		private final UserDirectory directory;

		private final CourseCatalog catalog;

		PublicLearningController(ReviewService reviews, LearningService learning, UserDirectory directory,
				CourseCatalog catalog) {
			this.reviews = reviews;
			this.learning = learning;
			this.directory = directory;
			this.catalog = catalog;
		}

		@GetMapping("/organizations/{orgSlug}/courses/{courseId}/reviews")
		PageResponse<ReviewView> reviews(@PathVariable String orgSlug, @PathVariable UUID courseId,
				@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size) {
			return reviews.list(orgId(orgSlug), courseId, page, size);
		}

		@GetMapping("/organizations/{orgSlug}/courses/{courseId}/reviews/summary")
		ReviewSummary reviewSummary(@PathVariable String orgSlug, @PathVariable UUID courseId) {
			catalog.course(orgId(orgSlug), courseId).orElseThrow(() -> ApiException.notFound("Course"));
			return reviews.summary(courseId);
		}

		@GetMapping("/certificates/{code}")
		CertificateView certificate(@PathVariable String code) {
			return learning.certificate(code);
		}

		private UUID orgId(String slug) {
			return directory.orgBySlug(slug).orElseThrow(() -> ApiException.notFound("Organization")).id();
		}
	}

	@RestController
	@RequestMapping("/api/instructor")
	static class LearnerAdminController {

		private final LearningService learning;

		LearnerAdminController(LearningService learning) {
			this.learning = learning;
		}

		@GetMapping("/courses/{courseId}/learners")
		PageResponse<LearnerView> learners(@PathVariable UUID courseId, @RequestParam(defaultValue = "0") int page,
				@RequestParam(defaultValue = "25") int size) {
			return learning.learners(CurrentUser.get(), courseId, page, size);
		}

		@PostMapping("/courses/{courseId}/learners")
		Map<String, Integer> assign(@PathVariable UUID courseId, @Valid @RequestBody AssignLearnersRequest req) {
			return Map.of("enrolled", learning.assign(CurrentUser.get(), courseId, req.userIds()));
		}

		@DeleteMapping("/enrollments/{enrollmentId}")
		@ResponseStatus(HttpStatus.NO_CONTENT)
		void unenroll(@PathVariable UUID enrollmentId) {
			learning.unenroll(CurrentUser.get(), enrollmentId);
		}
	}
}
