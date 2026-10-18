package com.orbitly.catalog;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.orbitly.catalog.CatalogDtos.CategoryRequest;
import com.orbitly.catalog.CatalogDtos.CategoryView;
import com.orbitly.catalog.CatalogDtos.CourseCard;
import com.orbitly.catalog.CatalogDtos.CourseDetail;
import com.orbitly.catalog.CatalogDtos.CourseEditorView;
import com.orbitly.catalog.CatalogDtos.CreateCourseRequest;
import com.orbitly.catalog.CatalogDtos.LessonRequest;
import com.orbitly.catalog.CatalogDtos.LessonView;
import com.orbitly.catalog.CatalogDtos.ReorderRequest;
import com.orbitly.catalog.CatalogDtos.SectionRequest;
import com.orbitly.catalog.CatalogDtos.SectionView;
import com.orbitly.catalog.CatalogDtos.UpdateCourseRequest;
import com.orbitly.catalog.CatalogDtos.UpdateLessonRequest;
import com.orbitly.catalog.CatalogDtos.WishlistEntry;
import com.orbitly.catalog.PublicCatalogService.SortBy;
import com.orbitly.common.security.CurrentUser;
import com.orbitly.common.web.PageResponse;

import jakarta.validation.Valid;

final class CatalogControllers {

	private CatalogControllers() {
	}

	@RestController
	@RequestMapping("/api/public/organizations/{orgSlug}")
	static class PublicCatalogController {

		private final PublicCatalogService catalog;

		PublicCatalogController(PublicCatalogService catalog) {
			this.catalog = catalog;
		}

		@GetMapping("/categories")
		List<CategoryView> categories(@PathVariable String orgSlug) {
			return catalog.categories(catalog.orgId(orgSlug));
		}

		@GetMapping("/courses")
		PageResponse<CourseCard> courses(@PathVariable String orgSlug, @RequestParam(required = false) String category,
				@RequestParam(required = false) CourseLevel level, @RequestParam(required = false) String price,
				@RequestParam(required = false) String q, @RequestParam(defaultValue = "POPULAR") SortBy sort,
				@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "12") int size) {
			return catalog.search(catalog.orgId(orgSlug), category, level, price, q, sort, page, size);
		}

		@GetMapping("/courses/{courseSlug}")
		CourseDetail course(@PathVariable String orgSlug, @PathVariable String courseSlug) {
			return catalog.detail(catalog.orgId(orgSlug), courseSlug);
		}
	}

	@RestController
	@RequestMapping("/api/me/wishlist")
	static class WishlistController {

		private final CategoryAndWishlistService service;

		WishlistController(CategoryAndWishlistService service) {
			this.service = service;
		}

		@GetMapping
		List<WishlistEntry> wishlist() {
			return service.wishlist(CurrentUser.get());
		}

		@PutMapping("/{courseId}")
		@ResponseStatus(HttpStatus.NO_CONTENT)
		void add(@PathVariable UUID courseId) {
			service.addToWishlist(CurrentUser.get(), courseId);
		}

		@DeleteMapping("/{courseId}")
		@ResponseStatus(HttpStatus.NO_CONTENT)
		void remove(@PathVariable UUID courseId) {
			service.removeFromWishlist(CurrentUser.get(), courseId);
		}
	}

	@RestController
	@RequestMapping("/api/admin/categories")
	static class AdminCategoryController {

		private final CategoryAndWishlistService service;

		AdminCategoryController(CategoryAndWishlistService service) {
			this.service = service;
		}

		@PostMapping
		@ResponseStatus(HttpStatus.CREATED)
		CategoryView create(@Valid @RequestBody CategoryRequest req) {
			return service.createCategory(CurrentUser.get(), req);
		}

		@PutMapping("/{id}")
		CategoryView update(@PathVariable UUID id, @Valid @RequestBody CategoryRequest req) {
			return service.updateCategory(CurrentUser.get(), id, req);
		}

		@DeleteMapping("/{id}")
		@ResponseStatus(HttpStatus.NO_CONTENT)
		void delete(@PathVariable UUID id) {
			service.deleteCategory(CurrentUser.get(), id);
		}
	}

	@RestController
	@RequestMapping("/api/instructor")
	static class CourseAuthoringController {

		private final CourseAuthoringService authoring;

		CourseAuthoringController(CourseAuthoringService authoring) {
			this.authoring = authoring;
		}

		@GetMapping("/courses")
		List<CourseCard> courses() {
			return authoring.myCourses(CurrentUser.get());
		}

		@PostMapping("/courses")
		@ResponseStatus(HttpStatus.CREATED)
		CourseEditorView create(@Valid @RequestBody CreateCourseRequest req) {
			return authoring.create(CurrentUser.get(), req);
		}

		@GetMapping("/courses/{id}")
		CourseEditorView get(@PathVariable UUID id) {
			return authoring.get(CurrentUser.get(), id);
		}

		@PatchMapping("/courses/{id}")
		CourseEditorView update(@PathVariable UUID id, @Valid @RequestBody UpdateCourseRequest req) {
			return authoring.update(CurrentUser.get(), id, req);
		}

		@PostMapping("/courses/{id}/publish")
		CourseEditorView publish(@PathVariable UUID id) {
			return authoring.publish(CurrentUser.get(), id);
		}

		@PostMapping("/courses/{id}/archive")
		CourseEditorView archive(@PathVariable UUID id) {
			return authoring.archive(CurrentUser.get(), id);
		}

		@DeleteMapping("/courses/{id}")
		@ResponseStatus(HttpStatus.NO_CONTENT)
		void delete(@PathVariable UUID id) {
			authoring.delete(CurrentUser.get(), id);
		}

		@PutMapping("/courses/{id}/order")
		CourseEditorView reorder(@PathVariable UUID id, @Valid @RequestBody ReorderRequest req) {
			return authoring.reorder(CurrentUser.get(), id, req);
		}

		@PostMapping("/courses/{id}/sections")
		@ResponseStatus(HttpStatus.CREATED)
		SectionView addSection(@PathVariable UUID id, @Valid @RequestBody SectionRequest req) {
			return authoring.addSection(CurrentUser.get(), id, req);
		}

		@PatchMapping("/sections/{id}")
		SectionView renameSection(@PathVariable UUID id, @Valid @RequestBody SectionRequest req) {
			return authoring.renameSection(CurrentUser.get(), id, req);
		}

		@DeleteMapping("/sections/{id}")
		@ResponseStatus(HttpStatus.NO_CONTENT)
		void deleteSection(@PathVariable UUID id) {
			authoring.deleteSection(CurrentUser.get(), id);
		}

		@PostMapping("/sections/{id}/lessons")
		@ResponseStatus(HttpStatus.CREATED)
		LessonView addLesson(@PathVariable UUID id, @Valid @RequestBody LessonRequest req) {
			return authoring.addLesson(CurrentUser.get(), id, req);
		}

		@PatchMapping("/lessons/{id}")
		LessonView updateLesson(@PathVariable UUID id, @Valid @RequestBody UpdateLessonRequest req) {
			return authoring.updateLesson(CurrentUser.get(), id, req);
		}

		@DeleteMapping("/lessons/{id}")
		@ResponseStatus(HttpStatus.NO_CONTENT)
		void deleteLesson(@PathVariable UUID id) {
			authoring.deleteLesson(CurrentUser.get(), id);
		}
	}
}
