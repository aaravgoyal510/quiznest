"use server";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { checkRateLimit } from "@/lib/rate-limit";

export async function startQuizAttemptAction(quizId: string) {
  const student = await requireRole(["STUDENT"]);
  const now = new Date();

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
  });

  if (!quiz || !quiz.isPublished) {
    throw new Error("Quiz is not available.");
  }

  if (now < quiz.startsAt || now > quiz.endsAt) {
    throw new Error("Quiz availability timeframe has expired or not started.");
  }

  // Check if attempt already exists
  let attempt = await prisma.quizAttempt.findFirst({
    where: { quizId, studentId: student.id, submittedAt: null },
  });

  const activeSessionToken = crypto.randomUUID();

  if (!attempt) {
    attempt = await prisma.quizAttempt.create({
      data: {
        quizId,
        studentId: student.id,
        startedAt: now,
        activeSessionToken,
      },
    });
  } else {
    // Regenerate activeSessionToken on reconnect or refresh of same tab to invalidate other tabs
    attempt = await prisma.quizAttempt.update({
      where: { id: attempt.id },
      data: { activeSessionToken },
    });
  }

  return { success: true, attemptId: attempt.id, activeSessionToken };
}

export async function submitQuizAnswerAction(data: {
  attemptId: string;
  questionId: string;
  selectedOptionId?: string;
  textAnswer?: string;
  defocusCount?: number;
  defocusDurationSeconds?: number;
  activeSessionToken: string;
}) {
  const student = await requireRole(["STUDENT"]);
  const now = new Date();

  // Enforce Save Rate Limiting (max 60 saves per minute per attempt) to prevent script flood attacks
  const rateLimitKey = `save-answer:${student.id}:${data.attemptId}`;
  const saveLimit = await checkRateLimit(rateLimitKey, 60, 60 * 1000);
  if (!saveLimit.allowed) {
    return { success: false, rateLimited: true };
  }

  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: data.attemptId },
    include: { quiz: true },
  });

  if (!attempt || attempt.studentId !== student.id) {
    throw new Error("Invalid attempt.");
  }

  // Adversarial session hijack guard: ensure only the most recently opened tab can save answers
  if (attempt.activeSessionToken !== data.activeSessionToken) {
    throw new Error("Session invalidated: Quiz attempt opened in another window or device.");
  }

  if (attempt.submittedAt) {
    throw new Error("Quiz has already been submitted.");
  }

  // CRITICAL SERVER TIME ENFORCEMENT
  const maxAllowedTime = new Date(attempt.startedAt.getTime() + attempt.quiz.durationMinutes * 60 * 1000 + 15000); // 15s grace buffer for latency
  if (now > maxAllowedTime) {
    // Auto-finalize late submission
    await finalizeAttempt(attempt.id);
    throw new Error("Quiz time limit has expired. Your attempt was auto-submitted.");
  }

  // Save or update answer
  const existingAnswer = await prisma.answer.findFirst({
    where: { attemptId: data.attemptId, questionId: data.questionId },
  });

  if (existingAnswer) {
    await prisma.answer.update({
      where: { id: existingAnswer.id },
      data: {
        selectedOptionId: data.selectedOptionId || null,
        textAnswer: data.textAnswer || null,
      },
    });
  } else {
    await prisma.answer.create({
      data: {
        attemptId: data.attemptId,
        questionId: data.questionId,
        selectedOptionId: data.selectedOptionId || null,
        textAnswer: data.textAnswer || null,
      },
    });

    // Only increment answersCount when a new answer record is created
    await prisma.quizAttempt.update({
      where: { id: data.attemptId },
      data: {
        answersCount: { increment: 1 },
      },
    });
  }

  // Update telemetry stats if provided using a plain update (overwrite client's running total)
  if (data.defocusCount !== undefined || data.defocusDurationSeconds !== undefined) {
    await prisma.quizAttempt.update({
      where: { id: data.attemptId },
      data: {
        defocusCount: data.defocusCount,
        defocusDurationSeconds: data.defocusDurationSeconds,
      },
    });
  }

  return { success: true };
}

export async function finalizeQuizAttemptAction(
  attemptId: string,
  telemetry?: { defocusCount: number; defocusDurationSeconds: number },
  activeSessionToken?: string
) {
  const student = await requireRole(["STUDENT"]);

  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: { quiz: true },
  });

  if (!attempt || attempt.studentId !== student.id) {
    throw new Error("Invalid attempt.");
  }

  // Token validation if activeSessionToken is passed to prevent multi-tab conflicts
  if (activeSessionToken && attempt.activeSessionToken !== activeSessionToken) {
    throw new Error("Session invalidated: Quiz attempt opened in another window or device.");
  }

  if (attempt.submittedAt) {
    return { success: true, score: attempt.score };
  }

  return await finalizeAttempt(attemptId, telemetry);
}

async function finalizeAttempt(
  attemptId: string,
  telemetry?: { defocusCount: number; defocusDurationSeconds: number }
) {
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      quiz: true,
      answers: {
        include: { question: { include: { options: true } } },
      },
    },
  });

  if (!attempt) throw new Error("Attempt not found");

  let totalScore = 0;
  let hasPendingGrading = false;

  for (const ans of attempt.answers) {
    if (ans.question.type === "MCQ" || ans.question.type === "TRUE_FALSE") {
      const selectedOpt = ans.question.options.find((o) => o.id === ans.selectedOptionId);
      const isCorrect = selectedOpt ? selectedOpt.isCorrect : false;
      const points = isCorrect ? ans.question.points : 0;

      await prisma.answer.update({
        where: { id: ans.id },
        data: { isCorrect, pointsAwarded: points },
      });

      totalScore += points;
    } else if (ans.question.type === "SHORT_ANSWER") {
      hasPendingGrading = true;
    }
  }

  const now = new Date();
  const timeSpentSeconds = Math.floor((now.getTime() - attempt.startedAt.getTime()) / 1000);

  const updatedAttempt = await prisma.quizAttempt.update({
    where: { id: attemptId },
    data: {
      submittedAt: now,
      score: hasPendingGrading ? null : totalScore,
      timeSpentSeconds,
      ...(telemetry ? {
        defocusCount: telemetry.defocusCount,
        defocusDurationSeconds: telemetry.defocusDurationSeconds,
      } : {}),
    },
  });

  revalidatePath("/student/dashboard");
  return { success: true, score: updatedAttempt.score };
}
