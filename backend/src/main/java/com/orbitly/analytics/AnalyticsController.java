package com.orbitly.analytics;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.orbitly.analytics.AnalyticsDtos.ActivityPoint;
import com.orbitly.analytics.AnalyticsDtos.AdminOverview;
import com.orbitly.analytics.AnalyticsDtos.InstructorOverview;
import com.orbitly.analytics.AnalyticsDtos.Range;
import com.orbitly.common.security.CurrentUser;

@RestController
class AnalyticsController {

	private final AnalyticsService analytics;

	AnalyticsController(AnalyticsService analytics) {
		this.analytics = analytics;
	}

	@GetMapping("/api/admin/analytics/overview")
	AdminOverview adminOverview(@RequestParam(defaultValue = "MONTHS_6") Range range) {
		return analytics.adminOverview(CurrentUser.get(), range);
	}

	@GetMapping(value = "/api/admin/analytics/report.csv", produces = "text/csv")
	ResponseEntity<String> report() {
		return ResponseEntity.ok()
			.header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"orbitly-course-report.csv\"")
			.contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
			.body(analytics.reportCsv(CurrentUser.get()));
	}

	@GetMapping("/api/instructor/analytics/overview")
	InstructorOverview instructorOverview() {
		return analytics.instructorOverview(CurrentUser.get());
	}

	@GetMapping("/api/instructor/courses/{courseId}/activity")
	List<ActivityPoint> courseActivity(@PathVariable UUID courseId, @RequestParam(defaultValue = "WEEK") String range) {
		return analytics.courseActivity(CurrentUser.get(), courseId, "TERM".equalsIgnoreCase(range));
	}
}
