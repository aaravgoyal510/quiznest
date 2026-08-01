"use server";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { questionSchema, quizSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";

export async function createQuestionAction(formData: FormData): Promise<void> {
  const teacher = await requireRole(["TEACHER", "ADMIN"]);

  const type = formData.get("type") as "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER";
  const subjectId = formData.get("subjectId") as string;
  const text = formData.get("text") as string;
  const points = parseInt(formData.get("points") as string || "1", 10);

  let optionsData: { text: string; isCorrect: boolean }[] = [];

  if (type === "MCQ") {
    const optionTexts = formData.getAll("optionText") as string[];
    const correctIndex = parseInt(formData.get("correctOptionIndex") as string || "0", 10);
    optionsData = optionTexts.map((optText, index) => ({
      text: optText,
      isCorrect: index === correctIndex,
    }));
  } else if (type === "TRUE_FALSE") {
    const tfAnswer = formData.get("tfAnswer") as string;
    optionsData = [
      { text: "True", isCorrect: tfAnswer === "true" },
      { text: "False", isCorrect: tfAnswer === "false" },
    ];
  }

  const question = await prisma.question.create({
    data: {
      subjectId,
      text,
      type,
      points,
      createdById: teacher.id,
      options: {
        create: optionsData,
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: teacher.id,
      action: "CREATE_QUESTION",
      entityType: "QUESTION",
      entityId: question.id,
      details: `Created ${type} question (${question.id}) in subject ${subjectId}`,
    },
  });

  revalidatePath("/teacher/questions");
}

export async function updateQuestionAction(questionId: string, formData: FormData): Promise<void> {
  const teacher = await requireRole(["TEACHER", "ADMIN"]);

  const text = formData.get("text") as string;
  const points = parseInt(formData.get("points") as string || "1", 10);

  const existingQuestion = await prisma.question.findUnique({
    where: { id: questionId },
  });

  if (!existingQuestion || (teacher.role === "TEACHER" && existingQuestion.createdById !== teacher.id)) {
    throw new Error("Forbidden: You do not own this question.");
  }

  const updatedQuestion = await prisma.question.update({
    where: { id: questionId },
    data: { text, points },
  });

  await prisma.auditLog.create({
    data: {
      userId: teacher.id,
      action: "UPDATE_QUESTION",
      entityType: "QUESTION",
      entityId: updatedQuestion.id,
      details: `Updated question (${updatedQuestion.id}) text and points.`,
    },
  });

  revalidatePath("/teacher/questions");
}

export async function createQuizAction(data: {
  subjectId: string;
  title: string;
  description?: string;
  durationMinutes: number;
  startsAt: string;
  endsAt: string;
  isPublished: boolean;
  questionIds: string[];
}) {
  const teacher = await requireRole(["TEACHER", "ADMIN"]);

  const quiz = await prisma.quiz.create({
    data: {
      subjectId: data.subjectId,
      title: data.title,
      description: data.description,
      durationMinutes: data.durationMinutes,
      teacherId: teacher.id,
      startsAt: new Date(data.startsAt),
      endsAt: new Date(data.endsAt),
      isPublished: data.isPublished,
      questions: {
        create: data.questionIds.map((qId, idx) => ({
          questionId: qId,
          order: idx + 1,
        })),
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: teacher.id,
      action: "CREATE_QUIZ",
      entityType: "QUIZ",
      entityId: quiz.id,
      details: `Created quiz "${quiz.title}" (${quiz.id}) with ${data.questionIds.length} questions.`,
    },
  });

  revalidatePath("/teacher/quizzes");
  return { success: true, quiz };
}

export async function updateQuizAction(quizId: string, data: {
  title?: string;
  description?: string;
  durationMinutes?: number;
  startsAt?: string;
  endsAt?: string;
  isPublished?: boolean;
}): Promise<void> {
  const teacher = await requireRole(["TEACHER", "ADMIN"]);

  const existingQuiz = await prisma.quiz.findUnique({
    where: { id: quizId },
  });

  if (!existingQuiz || (teacher.role === "TEACHER" && existingQuiz.teacherId !== teacher.id)) {
    throw new Error("Forbidden: You do not own this quiz.");
  }

  const updatedQuiz = await prisma.quiz.update({
    where: { id: quizId },
    data: {
      title: data.title,
      description: data.description,
      durationMinutes: data.durationMinutes,
      startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
      endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
      isPublished: data.isPublished,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: teacher.id,
      action: "UPDATE_QUIZ",
      entityType: "QUIZ",
      entityId: updatedQuiz.id,
      details: `Updated quiz "${updatedQuiz.title}" (${updatedQuiz.id}) configuration.`,
    },
  });

  revalidatePath("/teacher/quizzes");
}

export async function gradeShortAnswerAction(answerId: string, pointsAwarded: number, isCorrect: boolean): Promise<void> {
  const teacher = await requireRole(["TEACHER", "ADMIN"]);

  // Fetch target answer and quiz details to enforce quiz ownership
  const targetAnswer = await prisma.answer.findUnique({
    where: { id: answerId },
    include: { attempt: { include: { quiz: true } } },
  });

  if (!targetAnswer) {
    throw new Error("Answer record not found.");
  }

  // Strict Ownership Authorization Guard
  if (teacher.role === "TEACHER" && targetAnswer.attempt.quiz.teacherId !== teacher.id) {
    throw new Error("Forbidden: You do not have permission to grade answers for quizzes you do not own.");
  }

  const updatedAnswer = await prisma.answer.update({
    where: { id: answerId },
    data: {
      pointsAwarded,
      isCorrect,
    },
    include: { attempt: true },
  });

  // Recalculate attempt score
  const allAnswers = await prisma.answer.findMany({
    where: { attemptId: updatedAnswer.attemptId },
  });

  const totalScore = allAnswers.reduce((sum, a) => sum + (a.pointsAwarded || 0), 0);

  await prisma.quizAttempt.update({
    where: { id: updatedAnswer.attemptId },
    data: { score: totalScore },
  });

  await prisma.auditLog.create({
    data: {
      userId: teacher.id,
      action: "GRADE_SHORT_ANSWER",
      entityType: "ANSWER",
      entityId: answerId,
      details: `Graded answer ${answerId} in attempt ${updatedAnswer.attemptId} with ${pointsAwarded} points.`,
    },
  });

  revalidatePath(`/teacher/quizzes/${updatedAnswer.attempt.quizId}/results`);
}

export async function deleteQuizAction(quizId: string): Promise<void> {
  const teacher = await requireRole(["TEACHER", "ADMIN"]);

  const existingQuiz = await prisma.quiz.findUnique({
    where: { id: quizId },
  });

  if (!existingQuiz || (teacher.role === "TEACHER" && existingQuiz.teacherId !== teacher.id)) {
    throw new Error("Forbidden: You do not own this quiz.");
  }

  const deletedQuiz = await prisma.quiz.delete({
    where: { id: quizId },
  });

  await prisma.auditLog.create({
    data: {
      userId: teacher.id,
      action: "DELETE_QUIZ",
      entityType: "QUIZ",
      entityId: quizId,
      details: `Deleted quiz "${deletedQuiz.title}" (${quizId}).`,
    },
  });

  revalidatePath("/teacher/quizzes");
  revalidatePath("/teacher/dashboard");
}
