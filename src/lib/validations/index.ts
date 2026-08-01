import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["ADMIN", "TEACHER", "STUDENT"]).default("STUDENT"),
  department: z.string().optional(),
  year: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const userCreateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["ADMIN", "TEACHER", "STUDENT"]),
  department: z.string().optional(),
  year: z.string().optional(),
});

export const subjectSchema = z.object({
  name: z.string().min(2, "Subject name required"),
  code: z.string().min(2, "Course code required"),
  description: z.string().optional(),
});

export const questionOptionSchema = z.object({
  text: z.string().min(1, "Option text required"),
  isCorrect: z.boolean().default(false),
});

export const questionSchema = z.object({
  subjectId: z.string().min(1, "Subject required"),
  text: z.string().min(3, "Question text required"),
  type: z.enum(["MCQ", "TRUE_FALSE", "SHORT_ANSWER"]),
  points: z.number().min(1).default(1),
  options: z.array(questionOptionSchema).optional(),
});

export const quizSchema = z.object({
  subjectId: z.string().min(1, "Subject required"),
  title: z.string().min(3, "Quiz title required"),
  description: z.string().optional(),
  durationMinutes: z.number().min(1, "Duration must be at least 1 minute"),
  startsAt: z.string().min(1, "Start time required"),
  endsAt: z.string().min(1, "End time required"),
  isPublished: z.boolean().default(false),
  questionIds: z.array(z.string()).min(1, "At least one question must be selected"),
});

export const answerSubmitSchema = z.object({
  attemptId: z.string(),
  questionId: z.string(),
  selectedOptionId: z.string().optional(),
  textAnswer: z.string().optional(),
});

export const gradeShortAnswerSchema = z.object({
  answerId: z.string(),
  pointsAwarded: z.number().min(0),
  isCorrect: z.boolean(),
});
