import { prisma } from "@/lib/db";

/**
 * Retrieves aggregate score and duration statistics for a specific quiz.
 * Calculates average, minimum, and maximum scores and duration.
 * Excludes load test dummy accounts to prevent data pollution.
 */
export async function getQuizStats(quizId: string) {
  const stats = await prisma.quizAttempt.aggregate({
    _avg: {
      score: true,
      timeSpentSeconds: true,
    },
    _min: {
      score: true,
      timeSpentSeconds: true,
    },
    _max: {
      score: true,
      timeSpentSeconds: true,
    },
    where: {
      quizId,
      submittedAt: { not: null },
      studentId: { not: "load-test-student-id" },
    },
  });

  return stats;
}

/**
 * Retrieves a breakdown of correct/incorrect answers grouped by question.
 * Useful for determining individual question difficulty index.
 * Excludes load test dummy accounts to prevent data pollution.
 */
export async function getQuestionDifficulty(quizId: string) {
  const difficulty = await prisma.answer.groupBy({
    by: ["questionId", "isCorrect"],
    _count: {
      _all: true,
    },
    where: {
      attempt: {
        quizId,
        submittedAt: { not: null },
        studentId: { not: "load-test-student-id" },
      },
    },
  });

  return difficulty;
}

/**
 * Retrieves system-wide database counts and grade statistics for administrators.
 * Gathers user totals by role, total quizzes, total subjects, aggregate score, and average subject scores.
 * Excludes load test dummy accounts to prevent data pollution.
 */
export async function getSystemWideAnalytics() {
  const [userCounts, quizCounts, subjectCounts, attemptStats] = await Promise.all([
    // Load test account is not counted towards normal users list
    prisma.user.groupBy({
      by: ["role"],
      _count: { _all: true },
      where: {
        id: { not: "load-test-student-id" },
      },
    }),
    prisma.quiz.count(),
    prisma.subject.count(),
    prisma.quizAttempt.aggregate({
      _count: { _all: true },
      _avg: { score: true, timeSpentSeconds: true },
      where: {
        submittedAt: { not: null },
        studentId: { not: "load-test-student-id" },
      },
    }),
  ]);

  // Aggregate subject stats along with attempts count and score averages (excluding test run accounts)
  const subjectStats = await prisma.subject.findMany({
    include: {
      quizzes: {
        include: {
          attempts: {
            where: {
              submittedAt: { not: null },
              studentId: { not: "load-test-student-id" },
            },
          },
        },
      },
    },
  });

  const subjectsAnalysis = subjectStats.map((subj) => {
    let scoresSum = 0;
    let attemptsCount = 0;

    subj.quizzes.forEach((q) => {
      q.attempts.forEach((att) => {
        if (att.score !== null) {
          scoresSum += att.score;
          attemptsCount++;
        }
      });
    });

    return {
      id: subj.id,
      code: subj.code,
      name: subj.name,
      attemptsCount,
      averageScore: attemptsCount > 0 ? parseFloat((scoresSum / attemptsCount).toFixed(2)) : null,
    };
  });

  return {
    userCounts,
    quizCounts,
    subjectCounts,
    attemptStats,
    subjectsAnalysis,
  };
}
