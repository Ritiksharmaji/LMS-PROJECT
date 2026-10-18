package com.orbitly.schedule;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.orbitly.common.security.CurrentUser;
import com.orbitly.schedule.ScheduleDtos.SessionRequest;
import com.orbitly.schedule.ScheduleDtos.SessionView;
import com.orbitly.schedule.ScheduleDtos.UpdateSessionRequest;

import jakarta.validation.Valid;

final class ScheduleControllers {

	private ScheduleControllers() {
	}

	@RestController
	@RequestMapping("/api/me")
	static class MyScheduleController {

		private final ScheduleService schedule;

		MyScheduleController(ScheduleService schedule) {
			this.schedule = schedule;
		}

		@GetMapping("/schedule")
		List<SessionView> schedule(@RequestParam(required = false) Instant from,
				@RequestParam(required = false) Instant to) {
			return schedule.mySchedule(CurrentUser.get(), from, to);
		}

		@GetMapping("/courses/{courseId}/sessions")
		List<SessionView> courseSessions(@PathVariable UUID courseId) {
			return schedule.courseSessions(CurrentUser.get(), courseId);
		}
	}

	@RestController
	@RequestMapping("/api/instructor")
	static class InstructorScheduleController {

		private final ScheduleService schedule;

		InstructorScheduleController(ScheduleService schedule) {
			this.schedule = schedule;
		}

		@GetMapping("/sessions")
		List<SessionView> sessions(@RequestParam(required = false) Instant from,
				@RequestParam(required = false) Instant to) {
			return schedule.teaching(CurrentUser.get(), from, to);
		}

		@PostMapping("/courses/{courseId}/sessions")
		@ResponseStatus(HttpStatus.CREATED)
		SessionView create(@PathVariable UUID courseId, @Valid @RequestBody SessionRequest req) {
			return schedule.create(CurrentUser.get(), courseId, req);
		}

		@PatchMapping("/sessions/{id}")
		SessionView update(@PathVariable UUID id, @Valid @RequestBody UpdateSessionRequest req) {
			return schedule.update(CurrentUser.get(), id, req);
		}

		@PostMapping("/sessions/{id}/cancel")
		SessionView cancel(@PathVariable UUID id) {
			return schedule.cancel(CurrentUser.get(), id);
		}

		@DeleteMapping("/sessions/{id}")
		@ResponseStatus(HttpStatus.NO_CONTENT)
		void delete(@PathVariable UUID id) {
			schedule.delete(CurrentUser.get(), id);
		}
	}
}
