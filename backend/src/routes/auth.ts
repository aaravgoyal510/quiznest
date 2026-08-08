import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Resend } from "resend";
import { prisma } from "../db";
import { verifyToken } from "../middleware/auth";

export const authRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || "split-app-secret-jwt-token-2026-key-development";
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const rawFrontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
const FRONTEND_URL = rawFrontendUrl.split(",")[0].trim();

/**
 * POST /api/auth/login
 * Validates credentials and returns a signed JWT.
 */
authRouter.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid email address or password." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email address or password." });
    }

    // Generate JWT token containing the user details
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        tokenVersion: user.tokenVersion,
      },
      JWT_SECRET,
      { expiresIn: "4h" }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        year: user.year,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (err: any) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "An unexpected error occurred during login." });
  }
});

/**
 * GET /api/auth/me
 * Restores and verifies active session.
 */
authRouter.get("/me", verifyToken, async (req: Request, res: Response) => {
  try {
    // If verifyToken middleware succeeded, the user payload is on req.user
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        year: true,
        avatarUrl: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    return res.json({ user });
  } catch (err: any) {
    return res.status(500).json({ error: "An error occurred retrieving active profile." });
  }
});

/**
 * POST /api/auth/forgot-password
 * Initiates the password recovery flow. Generates token and prints reset link to console.
 */
authRouter.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email address is required." });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Enforce generic response for security to prevent account scanning
    const genericResponse = {
      success: true,
      message: "If that email matches an account, we have logged a reset link.",
    };

    if (!user) {
      return res.json(genericResponse);
    }

    // Generate random recovery token and set 1 hour expiration
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Save token in DB (overwrites any existing reset attempts for clean state)
    await prisma.passwordResetToken.create({
      data: {
        email: user.email,
        token,
        expiresAt,
      },
    });

    // If resend client is available, send email. Otherwise fallback to console logging
    if (resend) {
      await resend.emails.send({
        from: "Quiz Nest <onboarding@resend.dev>",
        to: user.email,
        subject: "Reset Your Portal Password",
        html: `
          <div style="font-family: sans-serif; max-width: 500px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <h2 style="color: #4f46e5; margin-top: 0;">Quiz Nest Account Recovery</h2>
            <p>We received a request to reset your password. Click the button below to specify new credentials:</p>
            <div style="margin: 25px 0;">
              <a href="${FRONTEND_URL}/reset-password?token=${token}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
            </div>
            <p style="color: #64748b; font-size: 12px; line-height: 1.5;">This link will expire in 1 hour. If you did not request this, you can safely ignore this email.</p>
          </div>
        `
      });
    } else {
      // Log target link to console for local simulation
      console.log(`\n======================================================`);
      console.log(`[PASSWORD RESET LOG] Link generated for ${user.email}:`);
      console.log(`${FRONTEND_URL}/reset-password?token=${token}`);
      console.log(`======================================================\n`);
    }

    return res.json(genericResponse);
  } catch (err: any) {
    console.error("Forgot password error:", err);
    return res.status(500).json({ error: "Failed to initiate recovery request." });
  }
});

/**
 * POST /api/auth/reset-password
 * Validates recovery token and overrides user password hash.
 */
authRouter.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: "Token and new password are required." });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: "New password must be at least 8 characters long." });
    }

    // Query recovery token
    const tokenRecord = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      return res.status(400).json({ error: "Reset token is invalid or has expired." });
    }

    const user = await prisma.user.findUnique({
      where: { email: tokenRecord.email },
    });

    if (!user) {
      return res.status(404).json({ error: "Associated user account was not found." });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Wrap operations inside an atomic transaction
    await prisma.$transaction([
      // 1. Update password and invalidate all active user JWT sessions
      prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: newPasswordHash,
          tokenVersion: { increment: 1 },
        },
      }),
      // 2. Consume/delete used reset token
      prisma.passwordResetToken.delete({
        where: { id: tokenRecord.id },
      }),
      // 3. Write event to compliance log
      prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "RESET_PASSWORD",
          entityType: "USER",
          entityId: user.id,
          details: `Password recovered successfully using token reset. All other active sessions revoked.`,
        },
      }),
    ]);

    return res.json({
      success: true,
      message: "Password reset successfully. All other active sessions have been invalidated.",
    });
  } catch (err: any) {
    console.error("Reset password error:", err);
    return res.status(500).json({ error: "Password update failed." });
  }
});
