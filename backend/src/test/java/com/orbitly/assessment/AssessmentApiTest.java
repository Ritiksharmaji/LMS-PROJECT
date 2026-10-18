package com.orbitly.assessment;

import static com.orbitly.support.Api.read;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.orbitly.support.Api;
import com.orbitly.support.Api.CourseFixture;
import com.orbitly.support.Api.Session;
import com.orbitly.support.IntegrationTest;

@IntegrationTest
class AssessmentApiTest {

	@Autowired
	Api api;

	private static final List<Map<String, Object>> QUESTIONS = List.of(
			Map.of("prompt", "What is the main goal of this module?", "kind", "SINGLE", "options",
					List.of("Memorise definitions", "Build intuition you can apply", "Skip ahead"), "correct", List.of(1),
					"explanation", "Intuition transfers."),
			Map.of("prompt", "Which are supervised tasks?", "kind", "MULTIPLE", "options",
					List.of("Classification", "Clustering", "Regression"), "correct", List.of(0, 2)));

	private String quizLesson(CourseFixture c) {
		return c.lessonIds().get(2).toString();
	}

	private String assignmentLesson(CourseFixture c) {
		return c.lessonIds().get(3).toString();
	}

	private Map<String, Object> answers(String quizJson, List<Integer> first, List<Integer> second) throws Exception {
		Map<String, Object> a = new HashMap<>();
		a.put(com.jayway.jsonpath.JsonPath.read(quizJson, "$.questions[0].id"), first);
		a.put(com.jayway.jsonpath.JsonPath.read(quizJson, "$.questions[1].id"), second);
		return Map.of("answers", a);
	}

	private Session enrolledStudent(Session admin, CourseFixture c) throws Exception {
		var student = api.member(admin, "STUDENT");
		api.post("/api/me/enrollments", Map.of("courseId", c.id().toString()), student);
		return student;
	}

	@Test
	void instructorsBuildQuizzesThatLearnersCantPeekInto() throws Exception {
		var admin = api.newOrg();
		var course = api.publishedCourse(admin, "Quiz course", 0);
		api.put("/api/instructor/lessons/" + quizLesson(course) + "/quiz",
				Map.of("passPercent", 100, "questions", QUESTIONS), admin)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.questions.length()").value(2))
			.andExpect(jsonPath("$.questions[1].correct[1]").value(2));

		var student = enrolledStudent(admin, course);
		api.get("/api/me/lessons/" + quizLesson(course) + "/quiz", student)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.questions[0].options.length()").value(3))
			.andExpect(jsonPath("$.questions[0].correct").doesNotExist());
		api.put("/api/instructor/lessons/" + quizLesson(course) + "/quiz", Map.of("questions", QUESTIONS), student)
			.andExpect(status().isForbidden());
	}

	@Test
	void quizValidationCatchesBadAnswerKeys() throws Exception {
		var admin = api.newOrg();
		var course = api.publishedCourse(admin, "Bad quiz", 0);
		api.put("/api/instructor/lessons/" + quizLesson(course) + "/quiz", Map.of("questions", List.of(Map.of("prompt",
				"Pick one", "kind", "SINGLE", "options", List.of("a", "b"), "correct", List.of(0, 1)))), admin)
			.andExpect(status().isBadRequest());
		api.put("/api/instructor/lessons/" + quizLesson(course) + "/quiz", Map.of("questions", List.of(
				Map.of("prompt", "Out of range", "kind", "SINGLE", "options", List.of("a", "b"), "correct", List.of(5)))),
				admin)
			.andExpect(status().isBadRequest());
		// A video lesson can't hold a quiz.
		api.put("/api/instructor/lessons/" + course.lessonIds().get(0) + "/quiz", Map.of("questions", QUESTIONS), admin)
			.andExpect(status().isBadRequest());
	}

	@Test
	void failingThenPassingAQuizCompletesTheLesson() throws Exception {
		var admin = api.newOrg();
		var course = api.publishedCourse(admin, "Pass it", 0);
		api.put("/api/instructor/lessons/" + quizLesson(course) + "/quiz",
				Map.of("passPercent", 100, "maxAttempts", 2, "questions", QUESTIONS), admin);
		var student = enrolledStudent(admin, course);
		String quiz = Api.body(api.get("/api/me/lessons/" + quizLesson(course) + "/quiz", student));

		api.post("/api/me/lessons/" + quizLesson(course) + "/quiz/attempts", answers(quiz, List.of(1), List.of(0)),
				student)
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.attempt.percent").value(50))
			.andExpect(jsonPath("$.attempt.passed").value(false))
			.andExpect(jsonPath("$.questions[1].correct").value(false))
			.andExpect(jsonPath("$.questions[1].correctOptions[1]").value(2))
			.andExpect(jsonPath("$.attemptsLeft").value(1))
			.andExpect(jsonPath("$.lessonCompleted").value(false));

		api.post("/api/me/lessons/" + quizLesson(course) + "/quiz/attempts", answers(quiz, List.of(1), List.of(2, 0)),
				student)
			.andExpect(jsonPath("$.attempt.percent").value(100))
			.andExpect(jsonPath("$.attempt.passed").value(true))
			.andExpect(jsonPath("$.lessonCompleted").value(true));

		api.post("/api/me/lessons/" + quizLesson(course) + "/quiz/attempts", answers(quiz, List.of(1), List.of(0, 2)),
				student)
			.andExpect(status().isConflict());
		api.get("/api/me/courses/" + course.id() + "/player", student)
			.andExpect(jsonPath("$.sections[0].lessons[2].completed").value(true));
		api.get("/api/me/lessons/" + quizLesson(course) + "/quiz", student)
			.andExpect(jsonPath("$.passed").value(true))
			.andExpect(jsonPath("$.attempts.length()").value(2));
	}

	@Test
	void assignmentsAreSubmittedOnceGradedAndShowInTheQueue() throws Exception {
		var admin = api.newOrg();
		var instructor = api.member(admin, "INSTRUCTOR");
		var course = api.publishedCourse(instructor, "Graded work", 0);
		api.put("/api/instructor/lessons/" + assignmentLesson(course) + "/assignment",
				Map.of("instructions", "Analyse a dataset", "maxPoints", 20), instructor)
			.andExpect(jsonPath("$.maxPoints").value(20));
		var student = enrolledStudent(admin, course);

		api.post("/api/me/lessons/" + assignmentLesson(course) + "/assignment/submission", Map.of(), student)
			.andExpect(status().isBadRequest());
		api.post("/api/me/lessons/" + assignmentLesson(course) + "/assignment/submission",
				Map.of("linkUrl", "https://colab.example.com/notebook", "body", "My approach"), student)
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.status").value("SUBMITTED"))
			.andExpect(jsonPath("$.late").value(false));
		api.post("/api/me/lessons/" + assignmentLesson(course) + "/assignment/submission", Map.of("body", "again"),
				student)
			.andExpect(status().isConflict());

		var queue = api.get("/api/instructor/grading-queue", instructor)
			.andExpect(jsonPath("$.length()").value(1))
			.andExpect(jsonPath("$[0].learnerName").value("STUDENT Person"))
			.andExpect(jsonPath("$[0].courseTitle").value("Graded work"))
			.andExpect(jsonPath("$[0].lessonTitle").value("Problem set"));
		String submissionId = read(queue, "$[0].id");

		api.put("/api/instructor/submissions/" + submissionId + "/grade", Map.of("points", 25), instructor)
			.andExpect(status().isBadRequest());
		api.put("/api/instructor/submissions/" + submissionId + "/grade",
				Map.of("points", 18, "feedback", "Clear and well argued"), instructor)
			.andExpect(jsonPath("$.status").value("GRADED"))
			.andExpect(jsonPath("$.points").value(18));
		api.get("/api/instructor/grading-queue", instructor).andExpect(jsonPath("$.length()").value(0));

		api.get("/api/me/lessons/" + assignmentLesson(course) + "/assignment", student)
			.andExpect(jsonPath("$.submission.points").value(18))
			.andExpect(jsonPath("$.submission.feedback").value("Clear and well argued"));
		api.get("/api/me/grades", student)
			.andExpect(jsonPath("$[0].kind").value("ASSIGNMENT"))
			.andExpect(jsonPath("$[0].percent").value(90));
	}

	@Test
	void returnedWorkCanBeResubmitted() throws Exception {
		var admin = api.newOrg();
		var course = api.publishedCourse(admin, "Revise", 0);
		api.put("/api/instructor/lessons/" + assignmentLesson(course) + "/assignment", Map.of("maxPoints", 10), admin);
		var student = enrolledStudent(admin, course);
		String id = read(api.post("/api/me/lessons/" + assignmentLesson(course) + "/assignment/submission",
				Map.of("body", "Draft"), student), "$.id");

		api.post("/api/instructor/submissions/" + id + "/return", Map.of("feedback", "Add your sources"), admin)
			.andExpect(jsonPath("$.status").value("RETURNED"));
		api.post("/api/me/lessons/" + assignmentLesson(course) + "/assignment/submission", Map.of("body", "Final"),
				student)
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.status").value("SUBMITTED"))
			.andExpect(jsonPath("$.body").value("Final"));
	}

	@Test
	void lateWorkIsFlaggedOrRejected() throws Exception {
		var admin = api.newOrg();
		var course = api.publishedCourse(admin, "Deadlines", 0);
		String past = Instant.now().minus(1, ChronoUnit.DAYS).toString();
		api.put("/api/instructor/lessons/" + assignmentLesson(course) + "/assignment",
				Map.of("dueAt", past, "allowLate", false), admin);
		var student = enrolledStudent(admin, course);
		api.post("/api/me/lessons/" + assignmentLesson(course) + "/assignment/submission", Map.of("body", "Too late"),
				student)
			.andExpect(status().isConflict());

		api.put("/api/instructor/lessons/" + assignmentLesson(course) + "/assignment",
				Map.of("dueAt", past, "allowLate", true), admin);
		api.post("/api/me/lessons/" + assignmentLesson(course) + "/assignment/submission", Map.of("body", "Late but ok"),
				student)
			.andExpect(jsonPath("$.late").value(true));
	}

	@Test
	void deadlinesListOpenWorkSoonestFirst() throws Exception {
		var admin = api.newOrg();
		var course = api.publishedCourse(admin, "Due soon", 0);
		String tomorrow = Instant.now().plus(1, ChronoUnit.DAYS).toString();
		String nextWeek = Instant.now().plus(7, ChronoUnit.DAYS).toString();
		api.put("/api/instructor/lessons/" + quizLesson(course) + "/quiz",
				Map.of("dueAt", nextWeek, "questions", QUESTIONS), admin);
		api.put("/api/instructor/lessons/" + assignmentLesson(course) + "/assignment", Map.of("dueAt", tomorrow), admin);
		var student = enrolledStudent(admin, course);

		api.get("/api/me/deadlines", student)
			.andExpect(jsonPath("$.length()").value(2))
			.andExpect(jsonPath("$[0].kind").value("ASSIGNMENT"))
			.andExpect(jsonPath("$[0].courseTitle").value("Due soon"))
			.andExpect(jsonPath("$[1].kind").value("QUIZ"))
			.andExpect(jsonPath("$[0].overdue").value(false));

		api.post("/api/me/lessons/" + assignmentLesson(course) + "/assignment/submission", Map.of("body", "Done"),
				student);
		api.get("/api/me/deadlines", student).andExpect(jsonPath("$.length()").value(1));
	}

	@Test
	void gradebookShowsEveryLearnerAndColumn() throws Exception {
		var admin = api.newOrg();
		var course = api.publishedCourse(admin, "Gradebook", 0);
		api.put("/api/instructor/lessons/" + quizLesson(course) + "/quiz", Map.of("questions", QUESTIONS), admin);
		api.put("/api/instructor/lessons/" + assignmentLesson(course) + "/assignment", Map.of("maxPoints", 10), admin);
		var s1 = enrolledStudent(admin, course);
		enrolledStudent(admin, course);

		String quiz = Api.body(api.get("/api/me/lessons/" + quizLesson(course) + "/quiz", s1));
		api.post("/api/me/lessons/" + quizLesson(course) + "/quiz/attempts", answers(quiz, List.of(1), List.of(0)), s1);
		String sub = read(api.post("/api/me/lessons/" + assignmentLesson(course) + "/assignment/submission",
				Map.of("body", "Work"), s1), "$.id");
		api.put("/api/instructor/submissions/" + sub + "/grade", Map.of("points", 8), admin);

		api.get("/api/instructor/courses/" + course.id() + "/gradebook", admin)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.columns.length()").value(2))
			.andExpect(jsonPath("$.columns[0].kind").value("QUIZ"))
			.andExpect(jsonPath("$.rows.length()").value(2))
			.andExpect(jsonPath("$.classAveragePercent").value(65));
	}

	@Test
	void finishingQuizAndAssignmentCompletesTheWholeCourse() throws Exception {
		var admin = api.newOrg();
		var course = api.publishedCourse(admin, "End to end", 0);
		api.put("/api/instructor/lessons/" + quizLesson(course) + "/quiz", Map.of("questions", QUESTIONS), admin);
		api.put("/api/instructor/lessons/" + assignmentLesson(course) + "/assignment", Map.of(), admin);
		var student = enrolledStudent(admin, course);

		api.post("/api/me/lessons/" + course.lessonIds().get(0) + "/complete", null, student);
		api.post("/api/me/lessons/" + course.lessonIds().get(1) + "/complete", null, student);
		String quiz = Api.body(api.get("/api/me/lessons/" + quizLesson(course) + "/quiz", student));
		api.post("/api/me/lessons/" + quizLesson(course) + "/quiz/attempts", answers(quiz, List.of(1), List.of(0, 2)),
				student);
		api.post("/api/me/lessons/" + assignmentLesson(course) + "/assignment/submission", Map.of("body", "Final"),
				student);

		api.get("/api/me/enrollments?status=COMPLETED", student)
			.andExpect(jsonPath("$.length()").value(1))
			.andExpect(jsonPath("$[0].progress.percent").value(100))
			.andExpect(jsonPath("$[0].certificateCode").isNotEmpty());
	}

	@Test
	void otherInstructorsCantGradeYourCourse() throws Exception {
		var admin = api.newOrg();
		var owner = api.member(admin, "INSTRUCTOR");
		var other = api.member(admin, "INSTRUCTOR");
		var course = api.publishedCourse(owner, "Mine", 0);
		api.put("/api/instructor/lessons/" + assignmentLesson(course) + "/assignment", Map.of(), owner);
		var student = enrolledStudent(admin, course);
		String id = read(api.post("/api/me/lessons/" + assignmentLesson(course) + "/assignment/submission",
				Map.of("body", "Work"), student), "$.id");

		api.get("/api/instructor/grading-queue", other).andExpect(jsonPath("$.length()").value(0));
		api.put("/api/instructor/submissions/" + id + "/grade", Map.of("points", 1), other)
			.andExpect(status().isForbidden());
		api.get("/api/instructor/courses/" + course.id() + "/gradebook", other).andExpect(status().isForbidden());
	}
}
