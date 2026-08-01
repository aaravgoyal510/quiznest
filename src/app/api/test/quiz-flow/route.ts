import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  // CRITICAL HARD-GATE: Block execution in production environments immediately unless stress testing is explicitly enabled
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_STRESS_TEST !== "true") {
    return new Response("Not Found", { status: 404 });
  }

  try {
    const body = await req.json();
    const { action, quizId, attemptId, questionId, textAnswer, activeSessionToken } = body;

    // Ensure the load test dummy student exists in the database
    const studentId = "load-test-student-id";
    await prisma.user.upsert({
      where: { id: studentId },
      update: {},
      create: {
        id: studentId,
        name: "Load Test Student",
        email: "load-test-student@test.edu",
        passwordHash: "dummy-hash",
        role: "STUDENT",
      },
    });

    // ACTION 1: Start Quiz Attempt (corresponds to startQuizAttemptAction)
    if (action === "start") {
      if (!quizId) {
        return NextResponse.json({ error: "Missing quizId parameter" }, { status: 400 });
      }
      const token = crypto.randomUUID();
      const attempt = await prisma.quizAttempt.create({
        data: {
          quizId,
          studentId,
          activeSessionToken: token,
          startedAt: new Date(),
        },
      });
      return NextResponse.json({ attemptId: attempt.id, activeSessionToken: token });
    }

    // ACTION 2: Save Quiz Answer (corresponds to debounced submitQuizAnswerAction)
    if (action === "save") {
      if (!attemptId || !questionId || !activeSessionToken) {
        return NextResponse.json({ error: "Missing parameters for save action" }, { status: 400 });
      }

      const attempt = await prisma.quizAttempt.findUnique({
        where: { id: attemptId },
        select: { activeSessionToken: true },
      });

      if (!attempt || attempt.activeSessionToken !== activeSessionToken) {
        return NextResponse.json({ error: "Session invalidated: token mismatch" }, { status: 403 });
      }

      // Create new answer record
      await prisma.answer.create({
        data: {
          attemptId,
          questionId,
          textAnswer: textAnswer || "Simulated student answer text content.",
        },
      });

      // Update cached count
      await prisma.quizAttempt.update({
        where: { id: attemptId },
        data: {
          answersCount: { increment: 1 },
        },
      });

      return NextResponse.json({ success: true });
    }

    // ACTION 3: Finalize Quiz Attempt (corresponds to finalizeQuizAttemptAction)
    if (action === "finalize") {
      if (!attemptId || !activeSessionToken) {
        return NextResponse.json({ error: "Missing parameters for finalize action" }, { status: 400 });
      }

      const attempt = await prisma.quizAttempt.findUnique({
        where: { id: attemptId },
        select: { startedAt: true, activeSessionToken: true },
      });

      if (!attempt || attempt.activeSessionToken !== activeSessionToken) {
        return NextResponse.json({ error: "Session invalidated: token mismatch" }, { status: 403 });
      }

      const now = new Date();
      const timeSpentSeconds = Math.max(1, Math.floor((now.getTime() - attempt.startedAt.getTime()) / 1000));

      await prisma.quizAttempt.update({
        where: { id: attemptId },
        data: {
          submittedAt: now,
          score: 8.5,
          timeSpentSeconds,
        },
      });

      // Simply update state as finalized; cleanup will be handled globally at the end of the load test
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error("Quiz flow stress route error:", err);
    return NextResponse.json({ error: err.message || "Execution error" }, { status: 500 });
  }
}
