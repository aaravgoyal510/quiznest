import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const teacher = await requireRole(["TEACHER", "ADMIN"]);
  const { searchParams } = new URL(req.url);
  const quizId = searchParams.get("quizId");

  if (!quizId) {
    return NextResponse.json({ error: "Missing quizId parameter" }, { status: 400 });
  }

  // Strict Ownership Check: Admin can access all, Teacher can ONLY access quizzes they created
  const quiz = await prisma.quiz.findFirst({
    where: {
      id: quizId,
      ...(teacher.role === "TEACHER" ? { teacherId: teacher.id } : {}),
    },
  });

  if (!quiz) {
    return NextResponse.json({ error: "Forbidden: You do not own this quiz or quiz does not exist." }, { status: 403 });
  }

  const attempts = await prisma.quizAttempt.findMany({
    where: { quizId },
    include: {
      student: true,
      quiz: true,
    },
  });

  let csvContent = "Student Name,Email,Department,Year,Started At,Submitted At,Score\n";

  attempts.forEach((att) => {
    const name = `"${att.student.name}"`;
    const email = att.student.email;
    const dept = att.student.department || "";
    const year = att.student.year || "";
    const started = att.startedAt.toISOString();
    const submitted = att.submittedAt ? att.submittedAt.toISOString() : "In Progress";
    const score = att.score !== null ? att.score : "Ungraded";

    csvContent += `${name},${email},${dept},${year},${started},${submitted},${score}\n`;
  });

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="quiz-results-${quizId}.csv"`,
    },
  });
}
