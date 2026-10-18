package com.orbitly.assessment;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.orbitly.assessment.AssessmentDtos.AttemptResult;
import com.orbitly.assessment.AssessmentDtos.AttemptSummary;
import com.orbitly.assessment.AssessmentDtos.QuestionEditorView;
import com.orbitly.assessment.AssessmentDtos.QuestionInput;
import com.orbitly.assessment.AssessmentDtos.QuestionResult;
import com.orbitly.assessment.AssessmentDtos.QuestionView;
import com.orbitly.assessment.AssessmentDtos.QuizEditorView;
import com.orbitly.assessment.AssessmentDtos.QuizView;
import com.orbitly.assessment.AssessmentDtos.SaveQuizRequest;
import com.orbitly.assessment.AssessmentEntities.QuestionKind;
import com.orbitly.assessment.AssessmentEntities.Quiz;
import com.orbitly.assessment.AssessmentEntities.QuizAnswer;
import com.orbitly.assessment.AssessmentEntities.QuizAttempt;
import com.orbitly.assessment.AssessmentEntities.QuizQuestion;
import com.orbitly.catalog.LessonKind;
import com.orbitly.common.security.CurrentUser;
import com.orbitly.common.web.ApiException;
import com.orbitly.learning.Enrollments;

@Service
class QuizService {

	private final QuizRepository quizzes;

	private final QuizQuestionRepository questions;

	private final QuizAttemptRepository attempts;

	private final QuizAnswerRepository answers;

	private final AssessmentAccess access;

	private final Enrollments enrollments;

	private final ApplicationEventPublisher events;

	QuizService(QuizRepository quizzes, QuizQuestionRepository questions, QuizAttemptRepository attempts,
			QuizAnswerRepository answers, AssessmentAccess access, Enrollments enrollments,
			ApplicationEventPublisher events) {
		this.quizzes = quizzes;
		this.questions = questions;
		this.attempts = attempts;
		this.answers = answers;
		this.access = access;
		this.enrollments = enrollments;
		this.events = events;
	}

	// ---- Authoring ------------------------------------------------------------------------------------------

	@Transactional
	QuizEditorView save(CurrentUser me, UUID lessonId, SaveQuizRequest req) {
		var lesson = access.staffLesson(me, lessonId, LessonKind.QUIZ);
		for (int i = 0; i < req.questions().size(); i++) {
			validate(i + 1, req.questions().get(i));
		}
		Quiz quiz = quizzes.findByLessonIdAndOrgId(lessonId, me.orgId())
			.orElseGet(() -> quizzes.save(new Quiz(me.orgId(), lesson.courseId(), lessonId)));
		if (req.passPercent() != null) {
			quiz.setPassPercent(req.passPercent());
		}
		quiz.setMaxAttempts(req.maxAttempts());
		quiz.setDueAt(req.dueAt());
		questions.deleteByQuizId(quiz.getId());
		questions.flush();
		for (int i = 0; i < req.questions().size(); i++) {
			QuestionInput in = req.questions().get(i);
			QuizQuestion q = new QuizQuestion(me.orgId(), quiz.getId(), i);
			q.setPrompt(in.prompt().trim());
			q.setKind(in.kind());
			q.setOptions(new ArrayList<>(in.options()));
			q.setCorrect(in.correct().stream().distinct().sorted().toList());
			q.setExplanation(in.explanation());
			q.setPoints(in.points() == null ? 1 : in.points());
			questions.save(q);
		}
		return editor(quiz);
	}

	@Transactional(readOnly = true)
	QuizEditorView editorView(CurrentUser me, UUID lessonId) {
		access.staffLesson(me, lessonId, LessonKind.QUIZ);
		return editor(quizzes.findByLessonIdAndOrgId(lessonId, me.orgId())
			.orElseThrow(() -> ApiException.notFound("Quiz")));
	}

	private static void validate(int n, QuestionInput q) {
		for (int c : q.correct()) {
			if (c >= q.options().size()) {
				throw ApiException.badRequest("Question " + n + ": correct answer " + c + " is not an option");
			}
		}
		if (q.kind() == QuestionKind.SINGLE && q.correct().stream().distinct().count() != 1) {
			throw ApiException.badRequest("Question " + n + ": single-choice questions need exactly one correct answer");
		}
	}

	private QuizEditorView editor(Quiz quiz) {
		var qs = questions.findByQuizIdOrderByPositionAsc(quiz.getId())
			.stream()
			.map(q -> new QuestionEditorView(q.getId(), q.getPosition(), q.getPrompt(), q.getKind(),
					List.copyOf(q.getOptions()), List.copyOf(q.getCorrect()), q.getExplanation(), q.getPoints()))
			.toList();
		return new QuizEditorView(quiz.getId(), quiz.getLessonId(), quiz.getCourseId(), quiz.getPassPercent(),
				quiz.getMaxAttempts(), quiz.getDueAt(), qs);
	}

	// ---- Taking a quiz --------------------------------------------------------------------------------------

	@Transactional(readOnly = true)
	QuizView learnerView(CurrentUser me, UUID lessonId) {
		access.accessibleLesson(me, lessonId, LessonKind.QUIZ);
		Quiz quiz = quizzes.findByLessonIdAndOrgId(lessonId, me.orgId())
			.orElseThrow(() -> ApiException.notFound("Quiz"));
		var mine = attempts.findByQuizIdAndUserIdOrderByCreatedAtDesc(quiz.getId(), me.userId());
		var qs = questions.findByQuizIdOrderByPositionAsc(quiz.getId())
			.stream()
			.map(q -> new QuestionView(q.getId(), q.getPosition(), q.getPrompt(), q.getKind(), List.copyOf(q.getOptions()),
					q.getPoints()))
			.toList();
		return new QuizView(quiz.getId(), lessonId, quiz.getPassPercent(), quiz.getMaxAttempts(),
				attemptsLeft(quiz, mine.size()), quiz.getDueAt(), qs, mine.stream().map(QuizService::summary).toList(),
				mine.stream().anyMatch(QuizAttempt::isPassed));
	}

	/** Grades an attempt. All-or-nothing per question; passing marks the lesson complete for enrolled learners. */
	@Transactional
	AttemptResult submit(CurrentUser me, UUID lessonId, Map<UUID, List<Integer>> submitted) {
		var lesson = access.accessibleLesson(me, lessonId, LessonKind.QUIZ);
		Quiz quiz = quizzes.findByLessonIdAndOrgId(lessonId, me.orgId())
			.orElseThrow(() -> ApiException.notFound("Quiz"));
		long used = attempts.countByQuizIdAndUserId(quiz.getId(), me.userId());
		if (quiz.getMaxAttempts() != null && used >= quiz.getMaxAttempts()) {
			throw ApiException.conflict("No attempts left for this quiz");
		}
		var qs = questions.findByQuizIdOrderByPositionAsc(quiz.getId());
		if (qs.isEmpty()) {
			throw ApiException.badRequest("This quiz has no questions yet");
		}
		var known = new HashSet<UUID>();
		qs.forEach(q -> known.add(q.getId()));
		for (UUID id : submitted.keySet()) {
			if (!known.contains(id)) {
				throw ApiException.badRequest("Unknown question " + id);
			}
		}

		int score = 0;
		int max = 0;
		Map<UUID, List<Integer>> selectedById = new HashMap<>();
		Map<UUID, Boolean> correctById = new HashMap<>();
		for (QuizQuestion q : qs) {
			List<Integer> selected = submitted.getOrDefault(q.getId(), List.of())
				.stream()
				.filter(i -> i != null && i >= 0 && i < q.getOptions().size())
				.distinct()
				.sorted()
				.toList();
			boolean correct = selected.equals(q.getCorrect());
			max += q.getPoints();
			if (correct) {
				score += q.getPoints();
			}
			selectedById.put(q.getId(), selected);
			correctById.put(q.getId(), correct);
		}
		int percent = Math.round(score * 100f / max);
		boolean passed = percent >= quiz.getPassPercent();
		QuizAttempt attempt = attempts
			.save(new QuizAttempt(me.orgId(), quiz.getId(), me.userId(), score, max, percent, passed));
		for (QuizQuestion q : qs) {
			answers.save(new QuizAnswer(me.orgId(), attempt.getId(), q.getId(), selectedById.get(q.getId()),
					correctById.get(q.getId())));
		}

		boolean completed = passed && enrollments.completeLesson(me.orgId(), me.userId(), lessonId).isPresent();
		events.publishEvent(
				new AssessmentEvents.QuizSubmitted(me.orgId(), me.userId(), lesson.courseId(), lessonId, percent, passed));

		List<QuestionResult> results = qs.stream()
			.map(q -> new QuestionResult(q.getId(), selectedById.get(q.getId()), List.copyOf(q.getCorrect()),
					correctById.get(q.getId()), q.getExplanation()))
			.toList();
		return new AttemptResult(summary(attempt), results, attemptsLeft(quiz, (int) used + 1), completed);
	}

	private static Integer attemptsLeft(Quiz quiz, int used) {
		return quiz.getMaxAttempts() == null ? null : Math.max(0, quiz.getMaxAttempts() - used);
	}

	private static AttemptSummary summary(QuizAttempt a) {
		return new AttemptSummary(a.getId(), a.getScore(), a.getMaxScore(), a.getPercent(), a.isPassed(),
				a.getCreatedAt());
	}
}
