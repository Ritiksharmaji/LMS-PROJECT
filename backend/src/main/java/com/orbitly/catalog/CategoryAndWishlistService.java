package com.orbitly.catalog;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.orbitly.catalog.CatalogDtos.CategoryRequest;
import com.orbitly.catalog.CatalogDtos.CategoryView;
import com.orbitly.catalog.CatalogDtos.WishlistEntry;
import com.orbitly.catalog.CatalogEntities.Category;
import com.orbitly.catalog.CatalogEntities.Course;
import com.orbitly.catalog.CatalogEntities.WishlistItem;
import com.orbitly.common.security.CurrentUser;
import com.orbitly.common.web.ApiException;
import com.orbitly.common.web.Slugs;

@Service
class CategoryAndWishlistService {

	private final CategoryRepository categories;

	private final CourseRepository courses;

	private final WishlistRepository wishlist;

	private final CourseViews views;

	CategoryAndWishlistService(CategoryRepository categories, CourseRepository courses, WishlistRepository wishlist,
			CourseViews views) {
		this.categories = categories;
		this.courses = courses;
		this.wishlist = wishlist;
		this.views = views;
	}

	// ---- Categories (admin) ---------------------------------------------------------------------------------

	@Transactional
	CategoryView createCategory(CurrentUser admin, CategoryRequest req) {
		String slug = Slugs.of(req.name());
		if (categories.existsByOrgIdAndSlug(admin.orgId(), slug)) {
			throw ApiException.conflict("A category with that name exists");
		}
		Category c = new Category(admin.orgId(), req.name().trim(), slug);
		apply(c, req);
		if (req.position() == null) {
			c.setPosition(categories.findByOrgIdOrderByPositionAscNameAsc(admin.orgId()).size());
		}
		return CourseViews.category(categories.save(c), 0);
	}

	@Transactional
	CategoryView updateCategory(CurrentUser admin, UUID id, CategoryRequest req) {
		Category c = categories.findByIdAndOrgId(id, admin.orgId()).orElseThrow(() -> ApiException.notFound("Category"));
		String slug = Slugs.of(req.name());
		if (!slug.equals(c.getSlug()) && categories.existsByOrgIdAndSlug(admin.orgId(), slug)) {
			throw ApiException.conflict("A category with that name exists");
		}
		c.setName(req.name().trim());
		c.setSlug(slug);
		apply(c, req);
		return CourseViews.category(c, 0);
	}

	/** Courses in a deleted category become uncategorized (FK is ON DELETE SET NULL). */
	@Transactional
	void deleteCategory(CurrentUser admin, UUID id) {
		Category c = categories.findByIdAndOrgId(id, admin.orgId()).orElseThrow(() -> ApiException.notFound("Category"));
		categories.delete(c);
	}

	private static void apply(Category c, CategoryRequest req) {
		if (req.icon() != null) {
			c.setIcon(req.icon());
		}
		if (req.hue() != null) {
			c.setHue(req.hue());
		}
		if (req.position() != null) {
			c.setPosition(req.position());
		}
	}

	// ---- Wishlist -------------------------------------------------------------------------------------------

	@Transactional(readOnly = true)
	List<WishlistEntry> wishlist(CurrentUser me) {
		var items = wishlist.findByOrgIdAndUserIdOrderByCreatedAtDesc(me.orgId(), me.userId());
		var byId = courses.findByOrgIdAndIdIn(me.orgId(), items.stream().map(WishlistItem::getCourseId).toList())
			.stream()
			.filter(c -> c.getStatus() == CourseStatus.PUBLISHED)
			.toList();
		var cards = views.cards(byId);
		return items.stream()
			.flatMap(i -> cards.stream()
				.filter(card -> card.id().equals(i.getCourseId()))
				.map(card -> new WishlistEntry(card, i.getCreatedAt())))
			.toList();
	}

	@Transactional
	void addToWishlist(CurrentUser me, UUID courseId) {
		Course c = courses.findByIdAndOrgId(courseId, me.orgId())
			.filter(x -> x.getStatus() == CourseStatus.PUBLISHED)
			.orElseThrow(() -> ApiException.notFound("Course"));
		if (!wishlist.existsByUserIdAndCourseId(me.userId(), c.getId())) {
			wishlist.save(new WishlistItem(me.orgId(), me.userId(), c.getId()));
		}
	}

	@Transactional
	void removeFromWishlist(CurrentUser me, UUID courseId) {
		wishlist.findByUserIdAndCourseId(me.userId(), courseId)
			.filter(i -> i.getOrgId().equals(me.orgId()))
			.ifPresent(wishlist::delete);
	}
}
