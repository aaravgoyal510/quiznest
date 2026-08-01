"use server";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadAvatar, deleteAvatar } from "@/lib/storage";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

/**
 * Validates the user's current password and sets a new password.
 * Increments tokenVersion in the database to invalidate other active sessions.
 * Security Hardening: Never processes any other fields (name, email, role, etc.).
 */
export async function changePasswordAction(formData: FormData) {
  const user = await requireRole(["STUDENT", "TEACHER", "ADMIN"]);

  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;

  if (!currentPassword || !newPassword) {
    throw new Error("Missing password parameters.");
  }

  if (newPassword.length < 8) {
    throw new Error("New password must be at least 8 characters long.");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!dbUser) {
    throw new Error("User session invalid.");
  }

  // Verify currently saved password
  const isValid = await bcrypt.compare(currentPassword, dbUser.passwordHash);
  if (!isValid) {
    throw new Error("Incorrect current password.");
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 10);
  const updatedVersion = dbUser.tokenVersion + 1;

  // Perform database updates inside a transactional update
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        tokenVersion: updatedVersion,
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CHANGE_PASSWORD",
        entityType: "USER",
        entityId: user.id,
        details: `User password reset. Stale session tokens revoked.`,
      },
    }),
  ]);

  return { success: true, tokenVersion: updatedVersion };
}

/**
 * Handles profile picture uploads using Supabase Storage.
 * Restricts sizes to 2MB and types to JPG, PNG, and WEBP.
 * Enforces: Upload New -> Update DB -> Delete Old file.
 */
export async function updateAvatarAction(formData: FormData) {
  const user = await requireRole(["STUDENT", "TEACHER", "ADMIN"]);
  const file = formData.get("avatar") as File;

  if (!file || !(file instanceof File)) {
    throw new Error("No file uploaded.");
  }

  // 1. Server-side validations
  if (file.size > 2 * 1024 * 1024) {
    throw new Error("File size limit exceeded. Maximum file size is 2MB.");
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Invalid file type. Allowed formats are JPG, PNG, and WEBP.");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, avatarUrl: true },
  });

  if (!dbUser) {
    throw new Error("User record not found.");
  }

  // Resolve file extension
  const extension = file.type.split("/")[1] || "jpg";
  // Generate secure filename using user ID and current timestamp (never trust client inputs)
  const secureFileName = `${user.id}-${Date.now()}.${extension}`;
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  // ENFORCING UPLOAD SEQUENCE:
  // Step 1: Upload new file to Supabase Storage
  const newAvatarUrl = await uploadAvatar(fileBuffer, secureFileName, file.type);

  // Step 2: Update the User.avatarUrl in the database
  await prisma.user.update({
    where: { id: user.id },
    data: { avatarUrl: newAvatarUrl },
  });

  // Step 3: Delete the old file from Supabase Storage if it existed
  if (dbUser.avatarUrl) {
    try {
      await deleteAvatar(dbUser.avatarUrl);
    } catch (err) {
      console.error("Failed to delete orphaned avatar file:", err);
    }
  }

  revalidatePath("/profile");
  return { success: true, avatarUrl: newAvatarUrl };
}
