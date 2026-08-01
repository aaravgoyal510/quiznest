"use server";

import { prisma } from "@/lib/db";
import crypto from "crypto";
import bcrypt from "bcryptjs";

/**
 * Handles generating a secure reset token and saving it to the database.
 * SIMULATES sending an email by printing the link directly in the server console.
 */
export async function requestPasswordResetAction(email: string) {
  if (!email || typeof email !== "string") {
    throw new Error("Invalid email address.");
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  // Security Hardening: Silent success on non-existent email to prevent user enumeration
  if (!user) {
    return { success: true };
  }

  // Delete previous reset tokens for this email to prevent spam/abuse
  await prisma.passwordResetToken.deleteMany({
    where: { email },
  });

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour token expiration

  await prisma.passwordResetToken.create({
    data: {
      email,
      token,
      expiresAt,
    },
  });

  // Log link to terminal console for local verification and test copies
  console.log("\n==================================================");
  console.log("PASSWORD RESET REQUESTED FOR:", email);
  console.log("RESET LINK:", `http://localhost:3000/reset-password?token=${token}`);
  console.log("==================================================\n");

  return { success: true };
}

/**
 * Validates the reset token and updates the user's password.
 * Deletes the used token inside a Prisma transaction block.
 */
export async function resetPasswordAction(token: string, newPassword: string) {
  if (!token || typeof token !== "string" || !newPassword || typeof newPassword !== "string") {
    throw new Error("Invalid parameters.");
  }

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  if (!resetToken || resetToken.expiresAt < new Date()) {
    throw new Error("Invalid or expired password reset token.");
  }

  const user = await prisma.user.findUnique({
    where: { email: resetToken.email },
  });

  if (!user) {
    throw new Error("User associated with this token not found.");
  }

  // Enforce password strength minimum bounds
  if (newPassword.length < 8) {
    throw new Error("Password must be at least 8 characters long.");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  // Run user update and token cleanup in a database transaction block
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        tokenVersion: { increment: 1 }, // Invalidate all other active sessions immediately
      },
    }),
    prisma.passwordResetToken.delete({
      where: { id: resetToken.id },
    }),
  ]);

  return { success: true };
}
