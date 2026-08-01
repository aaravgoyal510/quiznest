import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Sidebar } from "@/components/layout/Sidebar";
import { HelpCircle, BookOpen, FileCheck, PlusCircle } from "lucide-react";
import Link from "next/link";

export default async function TeacherDashboardPage() {
  const teacher = await requireRole(["TEACHER", "ADMIN"]);

  const [questionsCount, quizzesCount, pendingGradingCount, myQuizzes] = await Promise.all([
    prisma.question.count({ where: { createdById: teacher.id } }),
    prisma.quiz.count({ where: { teacherId: teacher.id } }),
    prisma.answer.count({
      where: {
        question: { type: "SHORT_ANSWER" },
        isCorrect: null,
        attempt: { quiz: { teacherId: teacher.id } },
      },
    }),
    prisma.quiz.findMany({
      where: { teacherId: teacher.id },
      include: {
        subject: true,
        _count: { select: { attempts: true, questions: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar role={teacher.role as any} user={teacher} />

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Teacher Dashboard</h1>
            <p className="text-slate-400 text-sm mt-1">Manage question bank, author quizzes, and grade student submissions</p>
          </div>
          <div className="flex space-x-3">
            <Link
              href="/teacher/quizzes/new"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center space-x-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Quiz</span>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">My Questions</span>
              <HelpCircle className="w-5 h-5 text-indigo-400" />
            </div>
            <p className="text-3xl font-extrabold text-slate-100 mt-2">{questionsCount}</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">My Quizzes</span>
              <BookOpen className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-3xl font-extrabold text-slate-100 mt-2">{quizzesCount}</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Pending Short Answer Grading</span>
              <FileCheck className="w-5 h-5 text-amber-400" />
            </div>
            <p className="text-3xl font-extrabold text-slate-100 mt-2">{pendingGradingCount}</p>
          </div>
        </div>

        {/* Quizzes List */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <h2 className="text-lg font-bold text-slate-100 mb-4">My Quizzes ({myQuizzes.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myQuizzes.map((quiz) => (
              <div key={quiz.id} className="bg-slate-950/70 border border-slate-800 p-5 rounded-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800">
                      {quiz.subject.code}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      quiz.isPublished ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : "bg-slate-800 text-slate-400"
                    }`}>
                      {quiz.isPublished ? "Published" : "Draft"}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-100">{quiz.title}</h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{quiz.description || "No description."}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span>{quiz._count.questions} Qs | {quiz.durationMinutes} mins</span>
                  <Link
                    href={`/teacher/quizzes/${quiz.id}/results`}
                    className="text-indigo-400 hover:underline font-semibold"
                  >
                    View Results ({quiz._count.attempts}) →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
