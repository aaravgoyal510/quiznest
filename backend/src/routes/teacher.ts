import { Router, Request, Response } from "express";
import { prisma } from "../db";
import { verifyToken, requireRole } from "../middleware/auth";

export const teacherRouter = Router();

// Apply auth protection to all routes in this router
teacherRouter.use(verifyToken, requireRole(["TEACHER"]));

/**
 * GET /api/teacher/subjects
 * Retrieve all subjects.
 */
teacherRouter.get("/subjects", async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const subjects = await prisma.subject.findMany({
      orderBy: { code: "asc" },
    });
    return res.json({ subjects });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to load subjects." });
  }
});

/**
 * GET /api/teacher/quizzes
 * Retrieve all quizzes created by the logged-in teacher.
 */
teacherRouter.get("/quizzes", async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const quizzes = await prisma.quiz.findMany({
      where: { teacherId: req.user.id },
      include: {
        subject: true,
        _count: { select: { attempts: true, questions: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ quizzes });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to load quizzes." });
  }
});

/**
 * GET /api/teacher/quizzes/:id/preview
 * Fetches quiz and question choices for teacher preview mode. Read-only, no attempt created.
 */
teacherRouter.get("/quizzes/:id/preview", async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { id } = req.params;

    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        subject: true,
        questions: {
          include: {
            options: true,
          },
        },
      },
    });

    if (!quiz || quiz.teacherId !== req.user.id) {
      return res.status(404).json({ error: "Quiz not found." });
    }

    return res.json({ quiz });
  } catch (err: any) {
    console.error("Preview fetch error:", err);
    return res.status(500).json({ error: "Failed to load quiz details for preview." });
  }
});

/**
 * POST /api/teacher/quizzes
 * Creates a new scheduled assessment.
 */
teacherRouter.post("/quizzes", async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { title, description, durationMinutes, startsAt, endsAt, subjectId, questions } = req.body;

    if (!title || !durationMinutes || !startsAt || !endsAt || !subjectId) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const quiz = await prisma.quiz.create({
      data: {
        title,
        description,
        durationMinutes: Number(durationMinutes),
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
        subjectId,
        teacherId: req.user.id,
        isPublished: false,
        questions: {
          create: (questions || []).map((q: any) => ({
            text: q.text,
            type: q.type,
            points: Number(q.points),
            options: {
              create: (q.options || []).map((o: any) => ({
                text: o.text,
                isCorrect: Boolean(o.isCorrect),
              })),
            },
          })),
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "CREATE_QUIZ",
        entityType: "QUIZ",
        entityId: quiz.id,
        details: `Teacher created quiz "${title}" with ${questions?.length || 0} questions`,
      },
    });

    return res.json({ success: true, quiz });
  } catch (err: any) {
    console.error("Create quiz error:", err);
    return res.status(500).json({ error: "Failed to create quiz." });
  }
});

/**
 * PUT /api/teacher/quizzes/:id
 * Updates quiz properties and publish toggles.
 */
teacherRouter.put("/quizzes/:id", async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { id } = req.params;
    const { title, description, durationMinutes, startsAt, endsAt, isPublished } = req.body;

    const existingQuiz = await prisma.quiz.findUnique({
      where: { id },
    });

    if (!existingQuiz || existingQuiz.teacherId !== req.user.id) {
      return res.status(404).json({ error: "Quiz not found." });
    }

    // Check if the assessment has submitted attempts and is locked by admin
    const submittedAttemptsCount = await prisma.quizAttempt.count({
      where: { quizId: id, submittedAt: { not: null } },
    });

    if (submittedAttemptsCount > 0 && !existingQuiz.adminUnlockedForEditing) {
      return res.status(400).json({
        error: "Editing is blocked because this assessment has submitted student attempts.",
      });
    }

    const quiz = await prisma.quiz.update({
      where: { id },
      data: {
        title,
        description,
        durationMinutes: durationMinutes !== undefined ? Number(durationMinutes) : undefined,
        startsAt: startsAt ? new Date(startsAt) : undefined,
        endsAt: endsAt ? new Date(endsAt) : undefined,
        isPublished,
      },
    });

    return res.json({ success: true, quiz });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to update quiz." });
  }
});

/**
 * DELETE /api/teacher/quizzes/:id
 * Removes a quiz.
 */
teacherRouter.delete("/quizzes/:id", async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { id } = req.params;

    const quiz = await prisma.quiz.findUnique({ where: { id } });
    if (!quiz || quiz.teacherId !== req.user.id) {
      return res.status(404).json({ error: "Quiz not found." });
    }

    // Check if the assessment has submitted attempts and is locked by admin
    const submittedAttemptsCount = await prisma.quizAttempt.count({
      where: { quizId: id, submittedAt: { not: null } },
    });

    if (submittedAttemptsCount > 0 && !quiz.adminUnlockedForEditing) {
      return res.status(400).json({
        error: "Deleting this quiz is blocked because it has submitted student attempts.",
      });
    }

    await prisma.quiz.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "DELETE_QUIZ",
        entityType: "QUIZ",
        entityId: id,
        details: `Teacher deleted quiz "${quiz.title}"`,
      },
    });

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to delete quiz." });
  }
});

/**
 * GET /api/teacher/quizzes/:id/results
 * Fetches score report cards for all student attempts.
 */
teacherRouter.get("/quizzes/:id/results", async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { id } = req.params;

    const quiz = await prisma.quiz.findUnique({ where: { id } });
    if (!quiz || quiz.teacherId !== req.user.id) {
      return res.status(404).json({ error: "Quiz not found." });
    }

    const attempts = await prisma.quizAttempt.findMany({
      where: { quizId: id },
      include: {
        student: { select: { id: true, name: true, email: true, department: true } },
      },
      orderBy: { submittedAt: "desc" },
    });

    return res.json({ quiz, attempts });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to load attempt results." });
  }
});

/**
 * GET /api/teacher/quizzes/:id/progress
 * Real-time monitoring endpoints. Returns take pacing.
 */
teacherRouter.get("/quizzes/:id/progress", async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { id } = req.params;

    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: { _count: { select: { questions: true } } },
    });

    if (!quiz || quiz.teacherId !== req.user.id) {
      return res.status(404).json({ error: "Quiz not found." });
    }

    const attempts = await prisma.quizAttempt.findMany({
      where: { quizId: id },
      include: {
        student: { select: { name: true, email: true } },
      },
    });

    const activeAttempts = attempts.map((att) => {
      const now = new Date();
      const startTime = new Date(att.startedAt).getTime();
      const durationMs = quiz.durationMinutes * 60 * 1000;
      const elapsed = Math.floor((now.getTime() - startTime) / 1000);
      const timeLeft = att.submittedAt ? 0 : Math.max(0, Math.floor(durationMs / 1000) - elapsed);

      return {
        id: att.id,
        studentName: att.student.name,
        studentEmail: att.student.email,
        startedAt: att.startedAt,
        submittedAt: att.submittedAt,
        answersCount: att.answersCount,
        totalQuestions: quiz._count.questions,
        timeLeftSeconds: timeLeft,
        defocusCount: att.defocusCount,
        defocusDurationSeconds: att.defocusDurationSeconds,
      };
    });

    return res.json({ activeAttempts });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to load live monitor list." });
  }
});

/**
 * GET /api/teacher/questions
 * Fetches all questions created by the teacher.
 */
/**
 * Robust RFC 4180 compliant CSV parser.
 * Correctly handles newlines and commas nested within double-quotes.
 */
function parseCSV(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        cell += '"';
        i++; // Skip next escaped quote
      } else {
        insideQuotes = !insideQuotes; // Toggle quote state
      }
    } else if (char === "," && !insideQuotes) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\r" || char === "\n") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++; // Skip windows newline LF character
      }
      row.push(cell.trim());
      if (row.some((c) => c !== "")) {
        result.push(row);
      }
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell !== "" || row.length > 0) {
    row.push(cell.trim());
    if (row.some((c) => c !== "")) {
      result.push(row);
    }
  }

  return result;
}

/**
 * POST /api/teacher/quizzes/:quizId/questions
 * Creates a question directly inside the quiz.
 */
teacherRouter.post("/quizzes/:quizId/questions", async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { quizId } = req.params;
    const { text, type, points, options } = req.body;

    if (!text || !type || !points) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz || quiz.teacherId !== req.user.id) {
      return res.status(404).json({ error: "Quiz not found." });
    }

    // Check locks
    const submittedAttemptsCount = await prisma.quizAttempt.count({
      where: { quizId, submittedAt: { not: null } },
    });
    if (submittedAttemptsCount > 0 && !quiz.adminUnlockedForEditing) {
      return res.status(400).json({ error: "Editing is blocked because this assessment has submitted student attempts." });
    }

    const question = await prisma.question.create({
      data: {
        text,
        type,
        points: Number(points),
        quizId,
        options: {
          create: (options || []).map((o: any) => ({
            text: o.text,
            isCorrect: Boolean(o.isCorrect),
          })),
        },
      },
      include: { options: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "CREATE_QUESTION",
        entityType: "QUESTION",
        entityId: question.id,
        details: `Teacher created question "${text.substring(0, 50)}" inside quiz "${quiz.title}"`,
      },
    });

    return res.json({ success: true, question });
  } catch (err: any) {
    console.error("Create question error:", err);
    return res.status(500).json({ error: "Failed to create question." });
  }
});

/**
 * PUT /api/teacher/quizzes/:quizId/questions/:id
 * Updates a question text, type, points, and option choices in the quiz.
 */
teacherRouter.put("/quizzes/:quizId/questions/:id", async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { quizId, id } = req.params;
    const { text, type, points, options } = req.body;

    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz || quiz.teacherId !== req.user.id) {
      return res.status(404).json({ error: "Quiz not found." });
    }

    const question = await prisma.question.findUnique({
      where: { id },
      include: { options: true },
    });
    if (!question || question.quizId !== quizId) {
      return res.status(404).json({ error: "Question not found." });
    }

    // Check locks
    const submittedAttemptsCount = await prisma.quizAttempt.count({
      where: { quizId, submittedAt: { not: null } },
    });
    if (submittedAttemptsCount > 0 && !quiz.adminUnlockedForEditing) {
      return res.status(400).json({ error: "Editing is blocked because this assessment has submitted student attempts." });
    }

    // Determine if the update has grading-relevant changes
    let gradingRelevant = false;
    if (type !== undefined && question.type !== type) gradingRelevant = true;
    if (points !== undefined && question.points !== Number(points)) gradingRelevant = true;
    if (options) {
      if (options.length !== question.options.length) {
        gradingRelevant = true;
      } else {
        for (let i = 0; i < options.length; i++) {
          const incoming = options[i];
          const existing = question.options.find(
            (o) => o.text.trim().toLowerCase() === incoming.text.trim().toLowerCase()
          );
          if (!existing) {
            gradingRelevant = true;
            break;
          }
          if (Boolean(existing.isCorrect) !== Boolean(incoming.isCorrect)) {
            gradingRelevant = true;
            break;
          }
        }
      }
    }

    const updatedQuestion = await prisma.$transaction(async (tx) => {
      // Delete old options
      await tx.questionOption.deleteMany({ where: { questionId: id } });

      // Update question and options
      return await tx.question.update({
        where: { id },
        data: {
          text,
          type,
          points: points !== undefined ? Number(points) : undefined,
          options: {
            create: (options || []).map((o: any) => ({
              text: o.text,
              isCorrect: Boolean(o.isCorrect),
            })),
          },
        },
        include: { options: true },
      });
    });

    // If grading-relevant modifications are made, flag linked quiz attempts
    if (gradingRelevant && submittedAttemptsCount > 0) {
      // Find all affected submitted attempts
      const affectedAttempts = await prisma.quizAttempt.findMany({
        where: { quizId, submittedAt: { not: null } },
        select: { id: true },
      });

      const affectedAttemptIds = affectedAttempts.map((a) => a.id);

      // Mark all answers for this specific edited question as unconfirmed
      // so the teacher must explicitly review them before finalizing
      await prisma.answer.updateMany({
        where: {
          questionId: id,
          attemptId: { in: affectedAttemptIds },
        },
        data: { confirmed: false },
      });

      // Flag the attempts themselves as needing review + set PENDING_REVIEW status
      await prisma.quizAttempt.updateMany({
        where: { id: { in: affectedAttemptIds } },
        data: { needsReview: true, gradingStatus: "PENDING_REVIEW" },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "UPDATE_QUESTION",
        entityType: "QUESTION",
        entityId: id,
        details: `Teacher updated question "${text?.substring(0, 50) || question.text.substring(0, 50)}". Grading relevant: ${gradingRelevant}`,
      },
    });

    return res.json({ success: true, question: updatedQuestion });
  } catch (err: any) {
    console.error("Update question error:", err);
    return res.status(500).json({ error: "Failed to update question." });
  }
});

/**
 * DELETE /api/teacher/quizzes/:quizId/questions/:id
 * Deletes a question from the quiz.
 */
teacherRouter.delete("/quizzes/:quizId/questions/:id", async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { quizId, id } = req.params;

    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz || quiz.teacherId !== req.user.id) {
      return res.status(404).json({ error: "Quiz not found." });
    }

    const question = await prisma.question.findUnique({ where: { id } });
    if (!question || question.quizId !== quizId) {
      return res.status(404).json({ error: "Question not found." });
    }

    // Check locks
    const submittedAttemptsCount = await prisma.quizAttempt.count({
      where: { quizId, submittedAt: { not: null } },
    });
    if (submittedAttemptsCount > 0 && !quiz.adminUnlockedForEditing) {
      return res.status(400).json({ error: "Deleting this question is blocked because it is part of a quiz with submitted attempts." });
    }

    await prisma.question.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "DELETE_QUESTION",
        entityType: "QUESTION",
        entityId: id,
        details: `Teacher deleted question "${question.text.substring(0, 50)}" from quiz "${quiz.title}"`,
      },
    });

    return res.json({ success: true });
  } catch (err: any) {
    console.error("Delete question error:", err);
    return res.status(500).json({ error: "Failed to delete question." });
  }
});

/**
 * POST /api/teacher/quizzes/:quizId/questions/import
 * Bulk imports questions from a parsed CSV text payload into a specific quiz.
 */
teacherRouter.post("/quizzes/:quizId/questions/import", async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { quizId } = req.params;
    const { csvText } = req.body;

    if (!csvText) {
      return res.status(400).json({ error: "Missing required parameter: csvText." });
    }

    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz || quiz.teacherId !== req.user.id) {
      return res.status(404).json({ error: "Quiz not found." });
    }

    // Check locks
    const submittedAttemptsCount = await prisma.quizAttempt.count({
      where: { quizId, submittedAt: { not: null } },
    });
    if (submittedAttemptsCount > 0 && !quiz.adminUnlockedForEditing) {
      return res.status(400).json({ error: "Importing questions is blocked because this assessment has submitted student attempts." });
    }

    const rows = parseCSV(csvText);
    if (rows.length < 2) {
      return res.status(400).json({ error: "CSV file is empty or missing data rows." });
    }

    const headers = rows[0].map((h) => h.toLowerCase());
    const textIdx = headers.indexOf("text");
    const typeIdx = headers.indexOf("type");
    const pointsIdx = headers.indexOf("points");
    const optionsIdx = headers.indexOf("options");
    const correctOptionsIdx = headers.indexOf("correctoptions");

    if (textIdx === -1 || typeIdx === -1 || pointsIdx === -1 || correctOptionsIdx === -1) {
      return res.status(400).json({
        error: "Missing required CSV headers. File must contain columns: Text, Type, Points, CorrectOptions (Options is also required for MCQ).",
      });
    }

    const errors: string[] = [];
    const validatedQuestions: any[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length === 0 || row.every((c) => c === "")) continue;

      const qText = row[textIdx];
      const qType = row[typeIdx]?.toUpperCase();
      const qPointsStr = row[pointsIdx];
      const qOptionsStr = row[optionsIdx] || "";
      const qCorrectStr = row[correctOptionsIdx] || "";

      const rowNum = i + 1;

      if (!qText) {
        errors.push(`Row ${rowNum}: Question text is required.`);
        continue;
      }

      if (!qType || !["MCQ", "TRUE_FALSE", "SHORT_ANSWER"].includes(qType)) {
        errors.push(`Row ${rowNum}: Type must be either MCQ, TRUE_FALSE, or SHORT_ANSWER (received "${qType || ""}").`);
        continue;
      }

      const points = Number(qPointsStr);
      if (isNaN(points) || points <= 0 || !Number.isInteger(points)) {
        errors.push(`Row ${rowNum}: Points must be a positive integer.`);
        continue;
      }

      if (qType === "MCQ") {
        const optsList = qOptionsStr.split(";;").map((o) => o.trim()).filter((o) => o !== "");
        const correctList = qCorrectStr.split(";;").map((c) => c.trim()).filter((c) => c !== "");

        if (optsList.length < 2) {
          errors.push(`Row ${rowNum}: MCQ must have at least 2 options (separated by ';;').`);
          continue;
        }
        if (correctList.length === 0) {
          errors.push(`Row ${rowNum}: MCQ must specify at least one correct option.`);
          continue;
        }

        const invalidCorrectOpts = correctList.filter((correctOpt) => !optsList.includes(correctOpt));
        if (invalidCorrectOpts.length > 0) {
          errors.push(`Row ${rowNum}: Correct option(s) "${invalidCorrectOpts.join(";;")}" not found in Options list.`);
          continue;
        }

        validatedQuestions.push({
          text: qText,
          type: qType,
          points,
          options: optsList.map((opt) => ({ text: opt, isCorrect: correctList.includes(opt) })),
        });
      } else if (qType === "TRUE_FALSE") {
        const correctVal = qCorrectStr.trim().toLowerCase();
        if (correctVal !== "true" && correctVal !== "false") {
          errors.push(`Row ${rowNum}: TRUE_FALSE correct option must be either "True" or "False" (received "${qCorrectStr}").`);
          continue;
        }
        const finalCorrect = correctVal === "true" ? "True" : "False";

        validatedQuestions.push({
          text: qText,
          type: qType,
          points,
          options: [
            { text: "True", isCorrect: "True" === finalCorrect },
            { text: "False", isCorrect: "False" === finalCorrect },
          ],
        });
      } else if (qType === "SHORT_ANSWER") {
        const correctList = qCorrectStr.split(";;").map((c) => c.trim()).filter((c) => c !== "");
        if (correctList.length === 0) {
          errors.push(`Row ${rowNum}: SHORT_ANSWER must specify at least one correct answer text value.`);
          continue;
        }

        validatedQuestions.push({
          text: qText,
          type: qType,
          points,
          options: correctList.map((c) => ({ text: c, isCorrect: true })),
        });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    if (validatedQuestions.length === 0) {
      return res.status(400).json({ error: "No valid rows found to import." });
    }

    await prisma.$transaction(async (tx) => {
      for (const q of validatedQuestions) {
        await tx.question.create({
          data: {
            text: q.text,
            type: q.type,
            points: q.points,
            quizId,
            options: {
              create: q.options,
            },
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: req.user!.id,
          action: "IMPORT_QUESTIONS",
          entityType: "QUIZ",
          entityId: quizId,
          details: `Imported ${validatedQuestions.length} questions directly into quiz "${quiz.title}"`,
        },
      });
    });

    return res.json({ success: true, count: validatedQuestions.length });
  } catch (err: any) {
    console.error("Bulk import error:", err);
    return res.status(500).json({ error: "Failed to perform bulk question import." });
  }
});

/**
 * POST /api/teacher/quizzes/:id/unlock-request
 * Files a request to the admin for unlocking a quiz for editing.
 * Application-level duplicate guard: blocks if a PENDING request already exists.
 */
teacherRouter.post("/quizzes/:id/unlock-request", async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { id: quizId } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ error: "A reason is required for the unlock request." });
    }

    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz || quiz.teacherId !== req.user.id) {
      return res.status(404).json({ error: "Quiz not found." });
    }

    // Application-level duplicate PENDING request guard
    const existingPending = await prisma.quizUnlockRequest.findFirst({
      where: { quizId, status: "PENDING" },
    });
    if (existingPending) {
      return res.status(409).json({
        error: "An unlock request is already pending for this quiz. Wait for admin to review it.",
      });
    }

    const request = await prisma.quizUnlockRequest.create({
      data: { quizId, teacherId: req.user.id, reason: reason.trim() },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "REQUEST_UNLOCK",
        entityType: "QUIZ",
        entityId: quizId,
        details: `Teacher requested unlock for quiz "${quiz.title}". Reason: ${reason.trim()}`,
      },
    });

    return res.json({ success: true, request });
  } catch (err: any) {
    console.error("Unlock request error:", err);
    return res.status(500).json({ error: "Failed to file unlock request." });
  }
});

/**
 * GET /api/teacher/quizzes/:quizId/pending-attempts
 * Returns all attempts for a quiz that need teacher grading/review.
 */
teacherRouter.get("/quizzes/:quizId/pending-attempts", async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { quizId } = req.params;

    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz || quiz.teacherId !== req.user.id) {
      return res.status(404).json({ error: "Quiz not found." });
    }

    const attempts = await prisma.quizAttempt.findMany({
      where: {
        quizId,
        submittedAt: { not: null },
        gradingStatus: "PENDING_REVIEW",
      },
      include: {
        student: { select: { id: true, name: true, email: true } },
        answers: {
          include: {
            question: { include: { options: true } },
            selectedOption: true,
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    return res.json({ attempts });
  } catch (err: any) {
    console.error("Pending attempts error:", err);
    return res.status(500).json({ error: "Failed to load pending attempts." });
  }
});

/**
 * POST /api/teacher/attempts/:attemptId/grade-question
 * Saves manual points for a specific answer and marks it as confirmed.
 * Body: { answerId, pointsAwarded }
 */
teacherRouter.post("/attempts/:attemptId/grade-question", async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { attemptId } = req.params;
    const { answerId, pointsAwarded } = req.body;

    if (pointsAwarded === undefined || pointsAwarded === null) {
      return res.status(400).json({ error: "pointsAwarded is required." });
    }

    const pts = Number(pointsAwarded);
    if (isNaN(pts) || pts < 0) {
      return res.status(400).json({ error: "pointsAwarded must be a non-negative number." });
    }

    // Verify the teacher owns the quiz for this attempt
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: { quiz: true },
    });
    if (!attempt || attempt.quiz.teacherId !== req.user.id) {
      return res.status(404).json({ error: "Attempt not found." });
    }
    if (!attempt.submittedAt) {
      return res.status(400).json({ error: "Attempt has not been submitted yet." });
    }

    const answer = await prisma.answer.findUnique({ where: { id: answerId } });
    if (!answer || answer.attemptId !== attemptId) {
      return res.status(404).json({ error: "Answer not found." });
    }

    const maxPoints = (await prisma.question.findUnique({
      where: { id: answer.questionId },
      select: { points: true },
    }))?.points ?? 0;

    if (pts > maxPoints) {
      return res.status(400).json({ error: `Points awarded cannot exceed question max (${maxPoints}).` });
    }

    const updatedAnswer = await prisma.answer.update({
      where: { id: answerId },
      data: {
        pointsAwarded: pts,
        isCorrect: pts > 0,
        confirmed: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "GRADE_QUESTION",
        entityType: "QUIZ_ATTEMPT",
        entityId: attemptId,
        details: `Teacher awarded ${pts} points to answer ${answerId}.`,
      },
    });

    return res.json({ success: true, answer: updatedAnswer });
  } catch (err: any) {
    console.error("Grade question error:", err);
    return res.status(500).json({ error: "Failed to save grade." });
  }
});

/**
 * POST /api/teacher/attempts/:attemptId/finalize-grading
 * Finalizes an attempt after manual review.
 * Hard-blocks if any answer is still unconfirmed (confirmed === false).
 */
teacherRouter.post("/attempts/:attemptId/finalize-grading", async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { attemptId } = req.params;

    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          include: { questions: { select: { id: true, type: true, text: true } } },
        },
        answers: { include: { question: { select: { type: true, text: true } } } },
      },
    });

    if (!attempt || attempt.quiz.teacherId !== req.user.id) {
      return res.status(404).json({ error: "Attempt not found." });
    }
    if (!attempt.submittedAt) {
      return res.status(400).json({ error: "Attempt has not been submitted yet." });
    }
    if (attempt.gradingStatus === "FINALIZED") {
      return res.status(400).json({ error: "Attempt has already been finalized." });
    }

    // Hard-block gate 1: any answered question still marked unconfirmed
    const unconfirmedAnswers = attempt.answers.filter((a) => !a.confirmed);

    // Hard-block gate 2: any SHORT_ANSWER quiz question with NO answer record at all
    const answeredQuestionIds = new Set(attempt.answers.map((a) => a.questionId));
    const unansweredShortAnswers = attempt.quiz.questions.filter(
      (q) => q.type === "SHORT_ANSWER" && !answeredQuestionIds.has(q.id)
    );

    const totalPending = unconfirmedAnswers.length + unansweredShortAnswers.length;
    if (totalPending > 0) {
      return res.status(400).json({
        error: `${totalPending} answer(s) still require manual review/confirmation before this attempt can be finalized.`,
        unconfirmedCount: unconfirmedAnswers.length,
        unansweredCount: unansweredShortAnswers.length,
      });
    }

    // Sum all confirmed points
    const finalScore = attempt.answers.reduce((sum, a) => sum + (a.pointsAwarded || 0), 0);

    await prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        score: finalScore,
        gradingStatus: "FINALIZED",
        needsReview: false,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "FINALIZE_GRADING",
        entityType: "QUIZ_ATTEMPT",
        entityId: attemptId,
        details: `Teacher finalized grading for attempt ${attemptId}. Final score: ${finalScore}.`,
      },
    });

    return res.json({ success: true, finalScore, gradingStatus: "FINALIZED" });
  } catch (err: any) {
    console.error("Finalize grading error:", err);
    return res.status(500).json({ error: "Failed to finalize grading." });
  }
});
