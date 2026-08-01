import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const teacher = await requireRole(["TEACHER", "ADMIN"]);
    const { id } = await props.params;

    // Validate quiz existence and ownership
    const quiz = await prisma.quiz.findUnique({
      where: { id },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    if (teacher.role === "TEACHER" && quiz.teacherId !== teacher.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch active student attempts with cached answersCount (avoiding heavy join operations)
    const activeAttempts = await prisma.quizAttempt.findMany({
      where: {
        quizId: id,
        submittedAt: null,
        studentId: { not: "load-test-student-id" },
      },
      select: {
        id: true,
        startedAt: true,
        answersCount: true,
        student: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { startedAt: "desc" },
    });

    return NextResponse.json({ activeAttempts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
