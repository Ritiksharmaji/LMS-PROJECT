package com.orbitly.assessment;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.orbitly.assessment.AssessmentEntities.Assignment;
import com.orbitly.assessment.AssessmentEntities.Quiz;
import com.orbitly.assessment.AssessmentEntities.QuizAnswer;
import com.orbitly.assessment.AssessmentEntities.QuizAttempt;
import com.orbitly.assessment.AssessmentEntities.QuizQuestion;
import com.orbitly.assessment.AssessmentEntities.Submission;
import com.orbitly.assessment.AssessmentEntities.SubmissionStatus;

interface QuizRepository extends JpaRepository<Quiz, UUID> {

	Optional<Quiz> findByLessonIdAndOrgId(UUID lessonId, UUID orgId);

	List<Quiz> findByCourseIdIn(Collection<UUID> courseIds);

	List<Quiz> findByCourseId(UUID courseId);

	List<Quiz> findByDueAtBetween(java.time.Instant from, java.time.Instant to);
}

interface QuizQuestionRepository extends JpaRepository<QuizQuestion, UUID> {

	List<QuizQuestion> findByQuizIdOrderByPositionAsc(UUID quizId);

	void deleteByQuizId(UUID quizId);
}

interface QuizAttemptRepository extends JpaRepository<QuizAttempt, UUID> {

	List<QuizAttempt> findByQuizIdAndUserIdOrderByCreatedAtDesc(UUID quizId, UUID userId);

	long countByQuizIdAndUserId(UUID quizId, UUID userId);

	@Query("select a.quizId, a.userId, max(a.percent), max(case when a.passed then 1 else 0 end) from QuizAttempt a "
			+ "where a.quizId in :quizIds group by a.quizId, a.userId")
	List<Object[]> bestByQuizAndUser(@Param("quizIds") Collection<UUID> quizIds);

	@Query("select distinct a.userId from QuizAttempt a where a.quizId = :quizId and a.passed = true")
	List<UUID> passedUserIds(@Param("quizId") UUID quizId);

	@Query("select a.quizId from QuizAttempt a where a.userId = :userId and a.quizId in :quizIds and a.passed = true")
	List<UUID> passedQuizIds(@Param("userId") UUID userId, @Param("quizIds") Collection<UUID> quizIds);
}

interface QuizAnswerRepository extends JpaRepository<QuizAnswer, UUID> {

	List<QuizAnswer> findByAttemptId(UUID attemptId);
}

interface AssignmentRepository extends JpaRepository<Assignment, UUID> {

	Optional<Assignment> findByLessonIdAndOrgId(UUID lessonId, UUID orgId);

	List<Assignment> findByCourseIdIn(Collection<UUID> courseIds);

	List<Assignment> findByCourseId(UUID courseId);

	List<Assignment> findByDueAtBetween(java.time.Instant from, java.time.Instant to);
}

interface SubmissionRepository extends JpaRepository<Submission, UUID> {

	Optional<Submission> findByAssignmentIdAndUserId(UUID assignmentId, UUID userId);

	Optional<Submission> findByIdAndOrgId(UUID id, UUID orgId);

	List<Submission> findByAssignmentIdIn(Collection<UUID> assignmentIds);

	@Query("select s.userId from Submission s where s.assignmentId = :assignmentId and s.status <> 'RETURNED'")
	List<UUID> submittedUserIds(@Param("assignmentId") UUID assignmentId);

	List<Submission> findByUserIdAndAssignmentIdIn(UUID userId, Collection<UUID> assignmentIds);

	@Query("select s from Submission s where s.orgId = :orgId and s.status = :status and s.courseId in :courseIds "
			+ "order by s.submittedAt asc")
	List<Submission> queue(@Param("orgId") UUID orgId, @Param("status") SubmissionStatus status,
			@Param("courseIds") Collection<UUID> courseIds);
}
