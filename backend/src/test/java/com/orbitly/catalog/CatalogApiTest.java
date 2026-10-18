package com.orbitly.catalog;

import static com.orbitly.support.Api.read;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.orbitly.support.Api;
import com.orbitly.support.IntegrationTest;

@IntegrationTest
class CatalogApiTest {

	@Autowired
	Api api;

	@Test
	void instructorsBuildAndPublishACourse() throws Exception {
		var admin = api.newOrg();
		var instructor = api.member(admin, "INSTRUCTOR");
		String categoryId = read(api.post("/api/admin/categories",
				Map.of("name", "Data science", "icon", "brain", "hue", "orbit"), admin), "$.id");

		var created = api.post("/api/instructor/courses", Map.of("title", "Intro to Machine Learning", "tagline",
				"Build, train and evaluate your first models.", "categoryId", categoryId, "level", "BEGINNER",
				"priceCents", 4999, "hue", "orbit", "icon", "brain", "outcomes", List.of("Train a model")), instructor)
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.course.slug").value("intro-to-machine-learning"))
			.andExpect(jsonPath("$.course.status").value("DRAFT"));
		String courseId = read(created, "$.course.id");

		// Drafts aren't public and can't be published empty.
		api.get("/api/public/organizations/" + admin.orgSlug() + "/courses/intro-to-machine-learning", null)
			.andExpect(status().isNotFound());
		api.post("/api/instructor/courses/" + courseId + "/publish", null, instructor).andExpect(status().isBadRequest());

		String sectionId = read(api.post("/api/instructor/courses/" + courseId + "/sections",
				Map.of("title", "Foundations"), instructor), "$.id");
		api.post("/api/instructor/sections/" + sectionId + "/lessons",
				Map.of("title", "What is a model?", "kind", "VIDEO", "durationMinutes", 8, "preview", true), instructor)
			.andExpect(status().isCreated());
		api.post("/api/instructor/sections/" + sectionId + "/lessons",
				Map.of("title", "Gradient descent", "kind", "VIDEO", "durationMinutes", 12), instructor);

		api.post("/api/instructor/courses/" + courseId + "/publish", null, instructor)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.course.status").value("PUBLISHED"))
			.andExpect(jsonPath("$.course.durationMinutes").value(20))
			.andExpect(jsonPath("$.course.lessonCount").value(2));

		api.get("/api/public/organizations/" + admin.orgSlug() + "/courses/intro-to-machine-learning", null)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.course.categoryName").value("Data science"))
			.andExpect(jsonPath("$.course.instructorName").value("INSTRUCTOR Person"))
			.andExpect(jsonPath("$.instructor.publishedCourses").value(1))
			.andExpect(jsonPath("$.outcomes[0]").value("Train a model"))
			.andExpect(jsonPath("$.curriculum[0].lessons.length()").value(2))
			.andExpect(jsonPath("$.curriculum[0].lessons[0].preview").value(true))
			// The public outline never includes lesson content.
			.andExpect(jsonPath("$.curriculum[0].lessons[0].content").doesNotExist());
	}

	@Test
	void catalogFiltersSortsAndSearches() throws Exception {
		var admin = api.newOrg();
		var instructor = api.member(admin, "INSTRUCTOR");
		api.publishedCourse(instructor, "Python from Zero", 0);
		api.publishedCourse(instructor, "SQL for Analysts", 2999);
		api.publishedCourse(instructor, "Applied Deep Learning", 7999);
		api.post("/api/instructor/courses", Map.of("title", "Unpublished draft"), instructor);

		String base = "/api/public/organizations/" + admin.orgSlug() + "/courses";
		api.get(base, null).andExpect(jsonPath("$.total").value(3));
		api.get(base + "?price=free", null)
			.andExpect(jsonPath("$.total").value(1))
			.andExpect(jsonPath("$.items[0].title").value("Python from Zero"));
		api.get(base + "?sort=PRICE_DESC", null).andExpect(jsonPath("$.items[0].title").value("Applied Deep Learning"));
		api.get(base + "?sort=PRICE_ASC", null).andExpect(jsonPath("$.items[0].title").value("Python from Zero"));
		api.get(base + "?q=sql", null).andExpect(jsonPath("$.total").value(1));
		api.get(base + "?category=unknown", null).andExpect(jsonPath("$.total").value(0));
	}

	@Test
	void categoriesShowPublishedCourseCounts() throws Exception {
		var admin = api.newOrg();
		String designId = read(api.post("/api/admin/categories", Map.of("name", "Design"), admin), "$.id");
		api.post("/api/admin/categories", Map.of("name", "Business"), admin);
		var course = api.publishedCourse(admin, "Visual Design Foundations", 0);
		api.patch("/api/instructor/courses/" + course.id(), Map.of("categoryId", designId), admin);

		api.get("/api/public/organizations/" + admin.orgSlug() + "/categories", null)
			.andExpect(jsonPath("$.length()").value(2))
			.andExpect(jsonPath("$[0].name").value("Design"))
			.andExpect(jsonPath("$[0].courseCount").value(1))
			.andExpect(jsonPath("$[1].courseCount").value(0));
		api.get("/api/public/organizations/" + admin.orgSlug() + "/courses?category=design", null)
			.andExpect(jsonPath("$.total").value(1));
		api.post("/api/admin/categories", Map.of("name", "Design"), admin).andExpect(status().isConflict());
	}

	@Test
	void instructorsCanOnlyEditTheirOwnCourses() throws Exception {
		var admin = api.newOrg();
		var alice = api.member(admin, "INSTRUCTOR");
		var bob = api.member(admin, "INSTRUCTOR");
		var student = api.member(admin, "STUDENT");
		var course = api.publishedCourse(alice, "Alice's course", 0);

		api.patch("/api/instructor/courses/" + course.id(), Map.of("title", "Hijacked"), bob)
			.andExpect(status().isForbidden());
		api.get("/api/instructor/courses", bob).andExpect(jsonPath("$.length()").value(0));
		api.get("/api/instructor/courses", student).andExpect(status().isForbidden());
		// Admins can edit any course in their organization.
		api.patch("/api/instructor/courses/" + course.id(), Map.of("title", "Renamed by admin"), admin)
			.andExpect(status().isOk());
		api.get("/api/instructor/courses", admin).andExpect(jsonPath("$.length()").value(1));
	}

	@Test
	void onlyAdminsReassignOrFeatureCourses() throws Exception {
		var admin = api.newOrg();
		var alice = api.member(admin, "INSTRUCTOR");
		var bob = api.member(admin, "INSTRUCTOR");
		var student = api.member(admin, "STUDENT");
		var course = api.publishedCourse(alice, "Shared course", 0);

		api.patch("/api/instructor/courses/" + course.id(), Map.of("featured", true), alice)
			.andExpect(status().isForbidden());
		api.patch("/api/instructor/courses/" + course.id(), Map.of("instructorId", student.userId().toString()), admin)
			.andExpect(status().isBadRequest());
		api.patch("/api/instructor/courses/" + course.id(),
				Map.of("instructorId", bob.userId().toString(), "featured", true), admin)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.course.featured").value(true))
			.andExpect(jsonPath("$.course.instructorId").value(bob.userId().toString()));
	}

	@Test
	void coursesAreInvisibleToOtherOrganizations() throws Exception {
		var orgA = api.newOrg();
		var orgB = api.newOrg();
		var course = api.publishedCourse(orgA, "Org A only", 0);
		api.get("/api/instructor/courses/" + course.id(), orgB).andExpect(status().isNotFound());
		api.get("/api/public/organizations/" + orgB.orgSlug() + "/courses/" + course.slug(), null)
			.andExpect(status().isNotFound());
		api.put("/api/me/wishlist/" + course.id(), null, orgB).andExpect(status().isNotFound());
	}

	@Test
	void reorderingMovesLessonsBetweenSections() throws Exception {
		var admin = api.newOrg();
		var course = api.publishedCourse(admin, "Reorder me", 0);
		String section2 = read(api.post("/api/instructor/courses/" + course.id() + "/sections",
				Map.of("title", "Second"), admin), "$.id");
		String section1 = read(api.get("/api/instructor/courses/" + course.id(), admin), "$.sections[0].id");
		var l = course.lessonIds();

		api.put("/api/instructor/courses/" + course.id() + "/order", Map.of("sections",
				List.of(Map.of("id", section2, "lessonIds", List.of(l.get(3), l.get(0))),
						Map.of("id", section1, "lessonIds", List.of(l.get(1), l.get(2))))),
				admin)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.sections[0].title").value("Second"))
			.andExpect(jsonPath("$.sections[0].lessons[0].title").value("Problem set"))
			.andExpect(jsonPath("$.sections[1].lessons.length()").value(2));

		// Leaving a lesson out is rejected.
		api.put("/api/instructor/courses/" + course.id() + "/order",
				Map.of("sections", List.of(Map.of("id", section1, "lessonIds", List.of(l.get(0))))), admin)
			.andExpect(status().isBadRequest());
	}

	@Test
	void deletingLessonsAndSectionsKeepsTotalsRight() throws Exception {
		var admin = api.newOrg();
		var course = api.publishedCourse(admin, "Totals", 0);
		api.delete("/api/instructor/lessons/" + course.lessonIds().get(0), admin).andExpect(status().isNoContent());
		api.get("/api/instructor/courses/" + course.id(), admin)
			.andExpect(jsonPath("$.course.lessonCount").value(3))
			.andExpect(jsonPath("$.course.durationMinutes").value(30))
			.andExpect(jsonPath("$.sections[0].lessons[0].position").value(0));

		String sectionId = read(api.get("/api/instructor/courses/" + course.id(), admin), "$.sections[0].id");
		api.delete("/api/instructor/sections/" + sectionId, admin).andExpect(status().isNoContent());
		api.get("/api/instructor/courses/" + course.id(), admin).andExpect(jsonPath("$.course.lessonCount").value(0));
	}

	@Test
	void publishedCoursesCanBeArchivedButNotDeleted() throws Exception {
		var admin = api.newOrg();
		var course = api.publishedCourse(admin, "Keep forever", 0);
		api.delete("/api/instructor/courses/" + course.id(), admin).andExpect(status().isConflict());
		api.post("/api/instructor/courses/" + course.id() + "/archive", null, admin)
			.andExpect(jsonPath("$.course.status").value("ARCHIVED"));
		api.get("/api/public/organizations/" + admin.orgSlug() + "/courses", null).andExpect(jsonPath("$.total").value(0));

		String draft = read(api.post("/api/instructor/courses", Map.of("title", "Throwaway"), admin), "$.course.id");
		api.delete("/api/instructor/courses/" + draft, admin).andExpect(status().isNoContent());
	}

	@Test
	void wishlistAddsAndRemovesCourses() throws Exception {
		var admin = api.newOrg();
		var student = api.member(admin, "STUDENT");
		var course = api.publishedCourse(admin, "Wish for it", 0);

		api.put("/api/me/wishlist/" + course.id(), null, student).andExpect(status().isNoContent());
		api.put("/api/me/wishlist/" + course.id(), null, student).andExpect(status().isNoContent());
		api.get("/api/me/wishlist", student)
			.andExpect(jsonPath("$.length()").value(1))
			.andExpect(jsonPath("$[0].course.title").value("Wish for it"));
		api.delete("/api/me/wishlist/" + course.id(), student).andExpect(status().isNoContent());
		api.get("/api/me/wishlist", student).andExpect(jsonPath("$.length()").value(0));
	}
}
