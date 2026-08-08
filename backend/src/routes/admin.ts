import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../db";
import { verifyToken, requireRole } from "../middleware/auth";

export const adminRouter = Router();

// Apply auth protection to all routes in this router
adminRouter.use(verifyToken, requireRole(["ADMIN"]));

/**
 * GET /api/admin/users
 * Fetches all registered users.
 */
adminRouter.get("/users", async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        year: true,
        avatarUrl: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json({ users });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to load users." });
  }
});

/**
 * POST /api/admin/users
 * Registers a new student or teacher account.
 */
adminRouter.post("/users", async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { name, email, password, role, department, year } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "Missing required profile parameters." });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "Email address is already in use." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        department,
        year,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "CREATE_USER",
        entityType: "USER",
        entityId: newUser.id,
        details: `Created new ${role}: "${name}" (${email})`,
      },
    });

    return res.json({
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (err: any) {
    console.error("Create user error:", err);
    return res.status(500).json({ error: "Failed to register user." });
  }
});

/**
 * PUT /api/admin/users/:id
 * Modifies account profiles.
 */
adminRouter.put("/users/:id", async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { id } = req.params;
    const { name, email, role, department, year } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return res.status(404).json({ error: "User account not found." });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        name,
        email,
        role,
        department,
        year,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "UPDATE_USER",
        entityType: "USER",
        entityId: id,
        details: `Updated profile details for user "${updatedUser.name}"`,
      },
    });

    return res.json({ success: true, user: updatedUser });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to update profile." });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Removes a user account.
 */
adminRouter.delete("/users/:id", async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ error: "Cannot delete your own active admin account." });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    await prisma.user.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "DELETE_USER",
        entityType: "USER",
        entityId: id,
        details: `Deleted user "${user.name}" (${user.email})`,
      },
    });

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to delete user." });
  }
});

/**
 * GET /api/admin/subjects
 * Fetches course subject catalogs.
 */
adminRouter.get("/subjects", async (req: Request, res: Response) => {
  try {
    const subjects = await prisma.subject.findMany({
      include: {
        createdBy: { select: { name: true } },
      },
      orderBy: { code: "asc" },
    });
    return res.json({ subjects });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to load subjects." });
  }
});

/**
 * POST /api/admin/subjects
 * Creates a course subject.
 */
adminRouter.post("/subjects", async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { name, code, description } = req.body;

    if (!name || !code) {
      return res.status(400).json({ error: "Name and Code are required parameters." });
    }

    const existingSubject = await prisma.subject.findUnique({ where: { code } });
    if (existingSubject) {
      return res.status(400).json({ error: "Subject code already exists in catalog." });
    }

    const subject = await prisma.subject.create({
      data: {
        name,
        code,
        description,
        createdById: req.user.id,
      },
    });

    return res.json({ success: true, subject });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to create subject catalog." });
  }
});

/**
 * DELETE /api/admin/subjects/:id
 * Removes a course subject.
 */
adminRouter.delete("/subjects/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.subject.delete({ where: { id } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to delete subject." });
  }
});

/**
 * GET /api/admin/audit-logs
 * Retrieves paginated audit compliance trails.
 */
adminRouter.get("/audit-logs", async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [logs, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        include: { user: { select: { name: true, email: true, role: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.auditLog.count(),
    ]);

    return res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error("Audit log error:", err);
    return res.status(500).json({ error: "Failed to fetch audit trails." });
  }
});

/**
 * GET /api/admin/results
 * Fetches all completed student quiz attempts for administrative overview.
 */
adminRouter.get("/results", async (req: Request, res: Response) => {
  try {
    const attempts = await prisma.quizAttempt.findMany({
      include: {
        student: {
          select: {
            name: true,
            email: true,
            department: true,
            year: true,
          },
        },
        quiz: {
          include: {
            subject: true,
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    });
    return res.json({ attempts });
  } catch (err: any) {
    console.error("Fetch results error:", err);
    return res.status(500).json({ error: "Failed to load system-wide assessment results." });
  }
});

/**
 * POST /api/admin/quizzes/:id/unlock
 * Administrative override to unlock a quiz for teacher editing.
 */
adminRouter.post("/quizzes/:id/unlock", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const quiz = await prisma.quiz.findUnique({ where: { id } });
    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found." });
    }

    const updatedQuiz = await prisma.quiz.update({
      where: { id },
      data: { adminUnlockedForEditing: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: "UNLOCK_QUIZ",
        entityType: "QUIZ",
        entityId: id,
        details: `Admin unlocked quiz "${quiz.title}" (ID: ${id}) for editing.`,
      },
    });

    return res.json({ success: true, quiz: updatedQuiz });
  } catch (err: any) {
    console.error("Unlock quiz error:", err);
    return res.status(500).json({ error: "Failed to unlock quiz." });
  }
});

/**
 * POST /api/admin/quizzes/:id/relock
 * Administrative override to re-lock a quiz to block teacher editing.
 */
adminRouter.post("/quizzes/:id/relock", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const quiz = await prisma.quiz.findUnique({ where: { id } });
    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found." });
    }

    const updatedQuiz = await prisma.quiz.update({
      where: { id },
      data: { adminUnlockedForEditing: false },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: "RELOCK_QUIZ",
        entityType: "QUIZ",
        entityId: id,
        details: `Admin re-locked quiz "${quiz.title}" (ID: ${id}) to block editing.`,
      },
    });

    return res.json({ success: true, quiz: updatedQuiz });
  } catch (err: any) {
    console.error("Relock quiz error:", err);
    return res.status(500).json({ error: "Failed to re-lock quiz." });
  }
});

/**
 * GET /api/admin/quizzes
 * Returns all quizzes system-wide with teacher, subject, attempt count, and lock status.
 */
adminRouter.get("/quizzes", async (req: Request, res: Response) => {
  try {
    const quizzes = await prisma.quiz.findMany({
      include: {
        subject: { select: { name: true, code: true } },
        teacher: { select: { id: true, name: true, email: true } },
        _count: { select: { attempts: true, questions: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json({ quizzes });
  } catch (err: any) {
    console.error("Admin quizzes error:", err);
    return res.status(500).json({ error: "Failed to load quizzes." });
  }
});

/**
 * GET /api/admin/unlock-requests
 * Returns all unlock requests, optionally filtered by status.
 */
adminRouter.get("/unlock-requests", async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const requests = await prisma.quizUnlockRequest.findMany({
      where: status ? { status: status as any } : undefined,
      include: {
        quiz: { select: { id: true, title: true, adminUnlockedForEditing: true } },
        teacher: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json({ requests });
  } catch (err: any) {
    console.error("Unlock requests error:", err);
    return res.status(500).json({ error: "Failed to load unlock requests." });
  }
});

/**
 * POST /api/admin/unlock-requests/:id/approve
 * Approves a pending unlock request and auto-unlocks the quiz.
 */
adminRouter.post("/unlock-requests/:id/approve", async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { id } = req.params;

    const unlockRequest = await prisma.quizUnlockRequest.findUnique({
      where: { id },
      include: { quiz: true },
    });
    if (!unlockRequest) return res.status(404).json({ error: "Unlock request not found." });
    if (unlockRequest.status !== "PENDING") {
      return res.status(400).json({ error: `Request is already ${unlockRequest.status.toLowerCase()}.` });
    }

    // Approve request and unlock quiz in one transaction
    await prisma.$transaction([
      prisma.quizUnlockRequest.update({
        where: { id },
        data: { status: "APPROVED" },
      }),
      prisma.quiz.update({
        where: { id: unlockRequest.quizId },
        data: { adminUnlockedForEditing: true },
      }),
    ]);

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "APPROVE_UNLOCK_REQUEST",
        entityType: "QUIZ",
        entityId: unlockRequest.quizId,
        details: `Admin approved unlock request for quiz "${unlockRequest.quiz.title}". Request ID: ${id}.`,
      },
    });

    return res.json({ success: true });
  } catch (err: any) {
    console.error("Approve unlock request error:", err);
    return res.status(500).json({ error: "Failed to approve unlock request." });
  }
});

/**
 * POST /api/admin/unlock-requests/:id/reject
 * Rejects a pending unlock request.
 */
adminRouter.post("/unlock-requests/:id/reject", async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { id } = req.params;

    const unlockRequest = await prisma.quizUnlockRequest.findUnique({ where: { id } });
    if (!unlockRequest) return res.status(404).json({ error: "Unlock request not found." });
    if (unlockRequest.status !== "PENDING") {
      return res.status(400).json({ error: `Request is already ${unlockRequest.status.toLowerCase()}.` });
    }

    await prisma.quizUnlockRequest.update({
      where: { id },
      data: { status: "REJECTED" },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "REJECT_UNLOCK_REQUEST",
        entityType: "QUIZ",
        entityId: unlockRequest.quizId,
        details: `Admin rejected unlock request ID ${id} for quiz ${unlockRequest.quizId}.`,
      },
    });

    return res.json({ success: true });
  } catch (err: any) {
    console.error("Reject unlock request error:", err);
    return res.status(500).json({ error: "Failed to reject unlock request." });
  }
});
