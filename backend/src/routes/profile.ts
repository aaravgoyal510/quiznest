import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../db";
import { verifyToken } from "../middleware/auth";

export const profileRouter = Router();

// Apply token validation to all profile routes
profileRouter.use(verifyToken);

/**
 * POST /api/profile/password
 * Changes user password and invalidates all session tokens via tokenVersion increment.
 */
profileRouter.post("/password", async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current and new passwords are required." });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: "New password must be at least 8 characters long." });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({ error: "User profile not found." });
    }

    const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      return res.status(400).json({ error: "Incorrect current password." });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Run password update and token version increment in transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: newPasswordHash,
          tokenVersion: { increment: 1 }, // Invalidate sessions
        },
      }),
      prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "CHANGE_PASSWORD",
          entityType: "USER",
          entityId: user.id,
          details: `Password changed for user ${user.email}. Session tokens revoked.`,
        },
      }),
    ]);

    return res.json({ success: true, message: "Password updated successfully. All other devices logged out." });
  } catch (err: any) {
    console.error("Password update error:", err);
    return res.status(500).json({ error: "Failed to update password." });
  }
});
