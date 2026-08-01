"use server";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { userCreateSchema, subjectSchema } from "@/lib/validations";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function createUserAction(formData: FormData): Promise<void> {
  const admin = await requireRole(["ADMIN"]);

  const rawData = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    role: formData.get("role") as "ADMIN" | "TEACHER" | "STUDENT",
    department: formData.get("department") as string || undefined,
    year: formData.get("year") as string || undefined,
  };

  const validated = userCreateSchema.parse(rawData);
  const passwordHash = await bcrypt.hash(validated.password, 10);

  const newUser = await prisma.user.create({
    data: {
      name: validated.name,
      email: validated.email,
      passwordHash,
      role: validated.role,
      department: validated.department,
      year: validated.year,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: "CREATE_USER",
      details: `Created ${validated.role} user ${validated.name} (${validated.email})`,
    },
  });

  revalidatePath("/admin/users");
}

export async function deleteUserAction(userId: string): Promise<void> {
  const admin = await requireRole(["ADMIN"]);

  const deleted = await prisma.user.delete({
    where: { id: userId },
  });

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: "DELETE_USER",
      details: `Deleted user ${deleted.name} (${deleted.email})`,
    },
  });

  revalidatePath("/admin/users");
}

export async function createSubjectAction(formData: FormData): Promise<void> {
  const admin = await requireRole(["ADMIN"]);

  const rawData = {
    name: formData.get("name") as string,
    code: formData.get("code") as string,
    description: formData.get("description") as string || undefined,
  };

  const validated = subjectSchema.parse(rawData);

  await prisma.subject.create({
    data: {
      name: validated.name,
      code: validated.code,
      description: validated.description,
      createdById: admin.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: "CREATE_SUBJECT",
      details: `Created subject ${validated.name} (${validated.code})`,
    },
  });

  revalidatePath("/admin/subjects");
}
