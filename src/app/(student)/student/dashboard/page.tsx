import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Sidebar } from "@/components/layout/Sidebar";
import { BookOpen, Clock, Award, CheckCircle } from "lucide-react";
import Link from "next/link";

export default async function StudentDashboardPage() {
  const student = await requireRole(["STUDENT"]);
  const now = new Date();

  // Quizzes available for student
  const availableQuizzes = await prisma.quiz.findMany({
    where: {
      isPublished: true,
      startsAt: { lte: now },
      endsAt: { gte: now },
    },
    include: {
      subject: true,
      _count: { select: { questions: true } },
      attempts: { where: { studentId: student.id } },
    },
  });

  // Past Attempts
  const myAttempts = await prisma.quizAttempt.findMany({
    where: { studentId: student.id, submittedAt: { not: null } },
    include: { quiz: { include: { subject: true } } },
    orderBy: { submittedAt: "desc" },
  });

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar role="STUDENT" user={student} />

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Student Dashboard</h1>
            <p className="text-slate-400 text-sm mt-1">Available active assessments and score reports</p>
          </div>
        </div>

        {/* Available Quizzes */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl mb-8">
          <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <span>Active Quizzes Available ({availableQuizzes.length})</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableQuizzes.map((quiz) => {
              const attempt = quiz.attempts[0];
              const isCompleted = attempt && attempt.submittedAt !== null;

              return (
                <div key={quiz.id} className="bg-slate-950/70 border border-slate-800 p-5 rounded-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800">
                        {quiz.subject.code}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{quiz.durationMinutes} Mins</span>
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-100">{quiz.title}</h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{quiz.description || "No description."}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-500">{quiz._count.questions} Questions</span>
                    {isCompleted ? (
                      <span className="px-3 py-1 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-lg font-semibold flex items-center space-x-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Completed</span>
                      </span>
                    ) : (
                      <Link
                        href={`/student/quiz/${quiz.id}/take`}
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg shadow-md shadow-indigo-600/20 transition-all"
                      >
                        Start Quiz →
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Past Attempts / Grades */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center space-x-2">
            <Award className="w-5 h-5 text-amber-400" />
            <span>My Past Scores ({myAttempts.length})</span>
          </h2>

          <div className="divide-y divide-slate-800/80">
            {myAttempts.map((att) => (
              <div key={att.id} className="py-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-indigo-300">
                    {att.quiz.subject.code}
                  </span>
                  <h3 className="text-sm font-bold text-slate-100 mt-1">{att.quiz.title}</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Submitted: {att.submittedAt ? new Date(att.submittedAt).toLocaleString() : ""}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-extrabold text-indigo-400">
                    {att.score !== null ? `${att.score} Pts` : "Pending Grade"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
