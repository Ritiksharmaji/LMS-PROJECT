package com.orbitly.assessment;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.orbitly.assessment.AssessmentDtos.AssignmentEditorView;
import com.orbitly.assessment.AssessmentDtos.AssignmentView;
import com.orbitly.assessment.AssessmentDtos.AttemptResult;
import com.orbitly.assessment.AssessmentDtos.Deadline;
import com.orbitly.assessment.AssessmentDtos.GradeRequest;
import com.orbitly.assessment.AssessmentDtos.Gradebook;
import com.orbitly.assessment.AssessmentDtos.MyGrade;
import com.orbitly.assessment.AssessmentDtos.QuizEditorView;
import com.orbitly.assessment.AssessmentDtos.QuizView;
import com.orbitly.assessment.AssessmentDtos.ReturnRequest;
import com.orbitly.assessment.AssessmentDtos.SaveAssignmentRequest;
import com.orbitly.assessment.AssessmentDtos.SaveQuizRequest;
import com.orbitly.assessment.AssessmentDtos.SubmissionView;
import com.orbitly.assessment.AssessmentDtos.SubmitAssignmentRequest;
import com.orbitly.assessment.AssessmentDtos.SubmitQuizRequest;
import com.orbitly.common.security.CurrentUser;

import jakarta.validation.Valid;

final class AssessmentControllers {

	private AssessmentControllers() {
	}

	@RestController
	@RequestMapping("/api/me")
	static class LearnerAssessmentController {

		private final QuizService quizzes;

		private final AssignmentService assignments;

		private final GradebookService grades;

		LearnerAssessmentController(QuizService quizzes, AssignmentService assignments, GradebookService grades) {
			this.quizzes = quizzes;
			this.assignments = assignments;
			this.grades = grades;
		}

		@GetMapping("/lessons/{lessonId}/quiz")
		QuizView quiz(@PathVariable UUID lessonId) {
			return quizzes.learnerView(CurrentUser.get(), lessonId);
		}

		@PostMapping("/lessons/{lessonId}/quiz/attempts")
		@ResponseStatus(HttpStatus.CREATED)
		AttemptResult attempt(@PathVariable UUID lessonId, @Valid @RequestBody SubmitQuizRequest req) {
			return quizzes.submit(CurrentUser.get(), lessonId, req.answers());
		}

		@GetMapping("/lessons/{lessonId}/assignment")
		AssignmentView assignment(@PathVariable UUID lessonId) {
			return assignments.learnerView(CurrentUser.get(), lessonId);
		}

		@PostMapping("/lessons/{lessonId}/assignment/submission")
		@ResponseStatus(HttpStatus.CREATED)
		SubmissionView submit(@PathVariable UUID lessonId, @Valid @RequestBody SubmitAssignmentRequest req) {
			return assignments.submit(CurrentUser.get(), lessonId, req);
		}

		@GetMapping("/deadlines")
		List<Deadline> deadlines() {
			return grades.deadlines(CurrentUser.get());
		}

		@GetMapping("/grades")
		List<MyGrade> grades() {
			return grades.myGrades(CurrentUser.get());
		}
	}

	@RestController
	@RequestMapping("/api/instructor")
	static class InstructorAssessmentController {

		private final QuizService quizzes;

		private final AssignmentService assignments;

		private final GradebookService grades;

		InstructorAssessmentController(QuizService quizzes, AssignmentService assignments, GradebookService grades) {
			this.quizzes = quizzes;
			this.assignments = assignments;
			this.grades = grades;
		}

		@GetMapping("/lessons/{lessonId}/quiz")
		QuizEditorView quiz(@PathVariable UUID lessonId) {
			return quizzes.editorView(CurrentUser.get(), lessonId);
		}

		@PutMapping("/lessons/{lessonId}/quiz")
		QuizEditorView saveQuiz(@PathVariable UUID lessonId, @Valid @RequestBody SaveQuizRequest req) {
			return quizzes.save(CurrentUser.get(), lessonId, req);
		}

		@GetMapping("/lessons/{lessonId}/assignment")
		AssignmentEditorView assignment(@PathVariable UUID lessonId) {
			return assignments.editorView(CurrentUser.get(), lessonId);
		}

		@PutMapping("/lessons/{lessonId}/assignment")
		AssignmentEditorView saveAssignment(@PathVariable UUID lessonId, @Valid @RequestBody SaveAssignmentRequest req) {
			return assignments.save(CurrentUser.get(), lessonId, req);
		}

		@GetMapping("/grading-queue")
		List<SubmissionView> queue(@RequestParam(required = false) UUID courseId) {
			return assignments.queue(CurrentUser.get(), courseId);
		}

		@GetMapping("/submissions/{id}")
		SubmissionView submission(@PathVariable UUID id) {
			return assignments.get(CurrentUser.get(), id);
		}

		@PutMapping("/submissions/{id}/grade")
		SubmissionView grade(@PathVariable UUID id, @Valid @RequestBody GradeRequest req) {
			return assignments.grade(CurrentUser.get(), id, req);
		}

		@PostMapping("/submissions/{id}/return")
		SubmissionView returnForRevision(@PathVariable UUID id, @Valid @RequestBody ReturnRequest req) {
			return assignments.returnForRevision(CurrentUser.get(), id, req.feedback());
		}

		@GetMapping("/courses/{courseId}/gradebook")
		Gradebook gradebook(@PathVariable UUID courseId) {
			return grades.gradebook(CurrentUser.get(), courseId);
		}
	}
}
