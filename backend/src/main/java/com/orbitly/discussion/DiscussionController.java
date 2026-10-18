package com.orbitly.discussion;

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

import com.orbitly.common.security.CurrentUser;
import com.orbitly.common.web.PageResponse;
import com.orbitly.discussion.DiscussionDtos.BodyRequest;
import com.orbitly.discussion.DiscussionDtos.EditThreadRequest;
import com.orbitly.discussion.DiscussionDtos.NewThreadRequest;
import com.orbitly.discussion.DiscussionDtos.ReplyView;
import com.orbitly.discussion.DiscussionDtos.ThreadDetail;
import com.orbitly.discussion.DiscussionDtos.ThreadSummary;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/me")
class DiscussionController {

	private final DiscussionService discussions;

	DiscussionController(DiscussionService discussions) {
		this.discussions = discussions;
	}

	@GetMapping("/courses/{courseId}/threads")
	PageResponse<ThreadSummary> threads(@PathVariable UUID courseId, @RequestParam(required = false) UUID lessonId,
			@RequestParam(defaultValue = "false") boolean unresolved, @RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size) {
		return discussions.list(CurrentUser.get(), courseId, lessonId, unresolved, page, size);
	}

	@PostMapping("/courses/{courseId}/threads")
	@ResponseStatus(HttpStatus.CREATED)
	ThreadDetail create(@PathVariable UUID courseId, @Valid @RequestBody NewThreadRequest req) {
		return discussions.create(CurrentUser.get(), courseId, req);
	}

	@GetMapping("/threads/{id}")
	ThreadDetail thread(@PathVariable UUID id) {
		return discussions.get(CurrentUser.get(), id);
	}

	@PatchMapping("/threads/{id}")
	ThreadDetail edit(@PathVariable UUID id, @Valid @RequestBody EditThreadRequest req) {
		return discussions.edit(CurrentUser.get(), id, req.body(), req.title());
	}

	@DeleteMapping("/threads/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void delete(@PathVariable UUID id) {
		discussions.delete(CurrentUser.get(), id);
	}

	@PutMapping("/threads/{id}/pinned")
	ThreadDetail pin(@PathVariable UUID id) {
		return discussions.setPinned(CurrentUser.get(), id, true);
	}

	@DeleteMapping("/threads/{id}/pinned")
	ThreadDetail unpin(@PathVariable UUID id) {
		return discussions.setPinned(CurrentUser.get(), id, false);
	}

	@PutMapping("/threads/{id}/resolved")
	ThreadDetail resolve(@PathVariable UUID id) {
		return discussions.setResolved(CurrentUser.get(), id, true);
	}

	@DeleteMapping("/threads/{id}/resolved")
	ThreadDetail reopen(@PathVariable UUID id) {
		return discussions.setResolved(CurrentUser.get(), id, false);
	}

	@PostMapping("/threads/{id}/replies")
	@ResponseStatus(HttpStatus.CREATED)
	ReplyView reply(@PathVariable UUID id, @Valid @RequestBody BodyRequest req) {
		return discussions.reply(CurrentUser.get(), id, req.body());
	}

	@PatchMapping("/replies/{id}")
	ReplyView editReply(@PathVariable UUID id, @Valid @RequestBody BodyRequest req) {
		return discussions.editReply(CurrentUser.get(), id, req.body());
	}

	@DeleteMapping("/replies/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void deleteReply(@PathVariable UUID id) {
		discussions.deleteReply(CurrentUser.get(), id);
	}

	@PutMapping("/replies/{id}/answer")
	ReplyView markAnswer(@PathVariable UUID id) {
		return discussions.markAnswer(CurrentUser.get(), id, true);
	}

	@DeleteMapping("/replies/{id}/answer")
	ReplyView unmarkAnswer(@PathVariable UUID id) {
		return discussions.markAnswer(CurrentUser.get(), id, false);
	}
}
