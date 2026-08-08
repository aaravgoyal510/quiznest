import { Router, Request, Response } from "express";
import crypto from "crypto";
import { prisma } from "../db";
import { verifyToken, requireRole } from "../middleware/auth";
import { checkRateLimit } from "../lib/rate-limit";

export const studentRouter = Router();

// Apply auth protection to all routes in this router
studentRouter.use(verifyToken, requireRole(["STUDENT"]));

/**
 * GET /api/student/quizzes
 * Retrieve all published active quizzes and the student's completed/active attempts.
 */
studentRouter.get("/quizzes", async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const now = new Date();
    const quizzes = await prisma.quiz.findMany({
      where: {
        isPublished: true,
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
      include: {
        subject: true,
        _count: { select: { questions: true } },
        attempts: {
          where: { studentId: req.user.id },
          include: {
            answers: {
              where: { confirmed: false },
              select: { id: true },
            },
          },
        },
      },
    });

    return res.json({ quizzes });
  } catch (err: any) {
    console.error("Fetch quizzes error:", err);
    return res.status(500).json({ error: "Failed to load quizzes." });
  }
});

/**
 * POST /api/student/quizzes/:quizId/attempt
 * Start a new attempt or resume an active one.
 * Returns questions WITHOUT isCorrect answers to prevent cheating.
 */
studentRouter.post("/quizzes/:quizId/attempt", async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { quizId } = req.params;
    const now = new Date();

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        subject: true,
        questions: {
          include: {
            options: {
              select: {
                id: true,
                questionId: true,
                text: true,
                // EXCLUDE: isCorrect (Critical anti-cheat protection!)
              },
            },
          },
        },
      },
    });

    if (!quiz || !quiz.isPublished) {
      return res.status(404).json({ error: "Quiz not found or not published." });
    }

    if (now < quiz.startsAt || now > quiz.endsAt) {
      return res.status(403).json({ error: "Quiz availability window has expired or not started." });
    }

    // Check if a finished attempt exists
    const finishedAttempt = await prisma.quizAttempt.findFirst({
      where: { quizId, studentId: req.user.id, submittedAt: { not: null } },
    });
    if (finishedAttempt) {
      return res.status(400).json({ error: "Quiz has already been submitted." });
    }

    // Retrieve or create active attempt
    let attempt = await prisma.quizAttempt.findFirst({
      where: { quizId, studentId: req.user.id, submittedAt: null },
      include: {
        answers: true,
      },
    });

    const activeSessionToken = crypto.randomUUID();

    if (!attempt) {
      attempt = await prisma.quizAttempt.create({
        data: {
          quizId,
          studentId: req.user.id,
          startedAt: now,
          activeSessionToken,
        },
        include: {
          answers: true,
        },
      });
    } else {
      // Regenerate token to invalidate other tabs
      attempt = await prisma.quizAttempt.update({
        where: { id: attempt.id },
        data: { activeSessionToken },
        include: {
          answers: true,
        },
      });
    }

    return res.json({
      attempt,
      quiz,
      activeSessionToken,
    });
  } catch (err: any) {
    console.error("Start attempt error:", err);
    return res.status(500).json({ error: "Failed to initialize quiz attempt." });
  }
});

/**
 * GET /api/student/attempts/:attemptId
 * Resumes an active attempt from a saved token (handles page refresh).
 */
studentRouter.get("/attempts/:attemptId", async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { attemptId } = req.params;
    const token = req.query.token as string;

    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          include: {
            subject: true,
            questions: {
              include: {
                options: {
                  select: { id: true, questionId: true, text: true },
                },
              },
            },
          },
        },
        answers: true,
      },
    });

    if (!attempt || attempt.studentId !== req.user.id) {
      return res.status(404).json({ error: "Attempt not found." });
    }

    if (attempt.activeSessionToken !== token) {
      return res.status(403).json({ error: "Session conflict. Quiz is active in another tab." });
    }

    return res.json({ attempt, quiz: attempt.quiz });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to resume attempt." });
  }
});

/**
 * POST /api/student/attempts/:attemptId/answers
 * Saves an answer (MCQ option selection or typed short answer).
 * Enforces rate limits (max 60 saves per minute) and session tokens.
 */
studentRouter.post("/attempts/:attemptId/answers", async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { attemptId } = req.params;
    const { questionId, selectedOptionId, textAnswer, activeSessionToken } = req.body;
    const now = new Date();

    // 1. Rate limiting guard
    const rateLimitKey = `save-answer:${req.user.id}:${attemptId}`;
    const saveLimit = await checkRateLimit(rateLimitKey, 60, 60 * 1000);
    if (!saveLimit.allowed) {
      return res.status(429).json({ error: "Saving too fast. Throttled to 60 saves per minute." });
    }

    // 2. Fetch attempt
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: { quiz: true },
    });

    if (!attempt || attempt.studentId !== req.user.id) {
      return res.status(404).json({ error: "Attempt not found." });
    }

    if (attempt.submittedAt) {
      return res.status(400).json({ error: "Quiz has already been submitted." });
    }

    // 3. Session Hijacking Prevention (same token verification as original Server Action)
    if (attempt.activeSessionToken !== activeSessionToken) {
      return res.status(403).json({ error: "Session conflict: Quiz is active in another tab." });
    }

    // 4. Server-Side Timeout Enforcement
    const maxAllowedTime = new Date(attempt.startedAt.getTime() + attempt.quiz.durationMinutes * 60 * 1000 + 15000);
    if (now > maxAllowedTime) {
      await finalizeAttempt(attemptId);
      return res.status(400).json({ error: "Quiz time limit has expired. Attempt was automatically submitted." });
    }

    // 5. Upsert Answer
    const existingAnswer = await prisma.answer.findFirst({
      where: { attemptId, questionId },
    });

    if (existingAnswer) {
      await prisma.answer.update({
        where: { id: existingAnswer.id },
        data: {
          selectedOptionId: selectedOptionId || null,
          textAnswer: textAnswer || null,
        },
      });
    } else {
      await prisma.answer.create({
        data: {
          attemptId,
          questionId,
          selectedOptionId: selectedOptionId || null,
          textAnswer: textAnswer || null,
        },
      });

      // Increment denormalized answer counter
      await prisma.quizAttempt.update({
        where: { id: attemptId },
        data: { answersCount: { increment: 1 } },
      });
    }

    return res.json({ success: true });
  } catch (err: any) {
    console.error("Save answer error:", err);
    return res.status(500).json({ error: "Failed to save answer." });
  }
});

/**
 * POST /api/student/attempts/:attemptId/telemetry
 * Updates defocus tab-switching parameters.
 */
studentRouter.post("/attempts/:attemptId/telemetry", async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { attemptId } = req.params;
    const { defocusCount, defocusDurationSeconds, activeSessionToken } = req.body;

    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt || attempt.studentId !== req.user.id) {
      return res.status(404).json({ error: "Attempt not found." });
    }

    if (attempt.activeSessionToken !== activeSessionToken) {
      return res.status(403).json({ error: "Session conflict." });
    }

    await prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        defocusCount: Number(defocusCount),
        defocusDurationSeconds: Number(defocusDurationSeconds),
      },
    });

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to log telemetry." });
  }
});

/**
 * POST /api/student/attempts/:attemptId/finalize
 * Grades and submits the quiz attempt.
 */
studentRouter.post("/attempts/:attemptId/finalize", async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { attemptId } = req.params;
    const { telemetry, activeSessionToken } = req.body;

    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt || attempt.studentId !== req.user.id) {
      return res.status(404).json({ error: "Attempt not found." });
    }

    if (activeSessionToken && attempt.activeSessionToken !== activeSessionToken) {
      return res.status(403).json({ error: "Session conflict." });
    }

    if (attempt.submittedAt) {
      return res.json({ success: true, score: attempt.score });
    }

    const result = await finalizeAttempt(attemptId, telemetry);
    return res.json(result);
  } catch (err: any) {
    console.error("Finalize error:", err);
    return res.status(500).json({ error: "Failed to finalize quiz attempt." });
  }
});

/**
 * Helper function to run database calculations for scoring, update attempt tables,
 * and create audit trails.
 */
async function finalizeAttempt(attemptId: string, telemetry?: { defocusCount: number; defocusDurationSeconds: number }) {
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      quiz: {
        include: { questions: { select: { type: true } } },
      },
      answers: {
        include: { question: { include: { options: true } } },
      },
    },
  });

  if (!attempt) throw new Error("Attempt not found");

  let totalScore = 0;
  const answerUpdates: Promise<any>[] = [];

  // Check if this quiz has any SHORT_ANSWER questions (even unanswered ones)
  const hasShortAnswerQuestions = attempt.quiz.questions.some(
    (q: any) => q.type === "SHORT_ANSWER"
  );

  // Also check needsReview flag (set when teacher edits grading-relevant fields post-submission)
  const needsManualReview = hasShortAnswerQuestions || attempt.needsReview;

  for (const ans of attempt.answers) {
    if (ans.question.type === "MCQ" || ans.question.type === "TRUE_FALSE") {
      const selectedOpt = ans.question.options.find((o) => o.id === ans.selectedOptionId);
      const isCorrect = selectedOpt ? selectedOpt.isCorrect : false;
      const points = isCorrect ? ans.question.points : 0;

      answerUpdates.push(
        prisma.answer.update({
          where: { id: ans.id },
          data: { isCorrect, pointsAwarded: points, confirmed: true },
        })
      );

      totalScore += points;
    } else if (ans.question.type === "SHORT_ANSWER") {
      // Mark short answer as unconfirmed — teacher must manually review
      answerUpdates.push(
        prisma.answer.update({
          where: { id: ans.id },
          data: { isCorrect: null, pointsAwarded: 0, confirmed: false },
        })
      );
    }
  }

  await Promise.all(answerUpdates);

  const now = new Date();
  const timeSpentSeconds = Math.floor((now.getTime() - attempt.startedAt.getTime()) / 1000);

  // gradingStatus: PENDING_REVIEW if manual review required, else FINALIZED
  const gradingStatus = needsManualReview ? "PENDING_REVIEW" : "FINALIZED";

  const updatedAttempt = await prisma.quizAttempt.update({
    where: { id: attemptId },
    data: {
      submittedAt: now,
      // Provisional score = sum of auto-graded parts only; null when no auto-graded questions
      score: totalScore,
      gradingStatus,
      timeSpentSeconds,
      activeSessionToken: null,
      ...(telemetry ? {
        defocusCount: Number(telemetry.defocusCount),
        defocusDurationSeconds: Number(telemetry.defocusDurationSeconds),
      } : {}),
    },
  });

  // Log completion event in AuditLog
  await prisma.auditLog.create({
    data: {
      userId: attempt.studentId,
      action: "SUBMIT_QUIZ",
      entityType: "QUIZ_ATTEMPT",
      entityId: attemptId,
      details: `Student submitted quiz. GradingStatus: ${gradingStatus}. Provisional score: ${totalScore}.`,
    },
  });

  // Count unconfirmed answers (pending manual review)
  const pendingCount = attempt.quiz.questions.filter(
    (q: any) => q.type === "SHORT_ANSWER"
  ).length;

  return {
    success: true,
    score: updatedAttempt.score,
    gradingStatus,
    pendingReviewCount: needsManualReview ? pendingCount : 0,
  };
}
