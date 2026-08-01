import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Sidebar } from "@/components/layout/Sidebar";
import { BookOpen, PlusCircle, Clock, FileText, Trash2 } from "lucide-react";
import Link from "next/link";
import { deleteQuizAction } from "../actions";

export default async function TeacherQuizzesPage() {
  const teacher = await requireRole(["TEACHER", "ADMIN"]);

  const quizzes = await prisma.quiz.findMany({
    where: { teacherId: teacher.id },
    include: {
      subject: true,
      _count: { select: { attempts: true, questions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar role={teacher.role as any} user={teacher} />

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Quizzes</h1>
            <p className="text-slate-400 text-sm mt-1">Manage scheduled assessments and review student performance reports</p>
          </div>
          <Link
            href="/teacher/quizzes/new"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center space-x-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Quiz</span>
          </Link>
        </div>

        {/* Quizzes Grid */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <span>My Quizzes ({quizzes.length})</span>
          </h2>
          {quizzes.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
              <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No quizzes created yet.</p>
              <Link
                href="/teacher/quizzes/new"
                className="text-xs text-indigo-400 hover:underline mt-2 inline-block font-semibold"
              >
                Create your first quiz now →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quizzes.map((quiz) => (
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
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{quiz._count.questions} Qs | {quiz.durationMinutes} mins</span>
                    </span>
                    <div className="flex items-center space-x-3.5">
                      <Link
                        href={`/teacher/quizzes/${quiz.id}/results`}
                        className="text-indigo-400 hover:underline font-semibold flex items-center space-x-1"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Results ({quiz._count.attempts})</span>
                      </Link>
                      <form
                        action={async () => {
                          "use server";
                          await deleteQuizAction(quiz.id);
                        }}
                        className="inline"
                      >
                        <button
                          type="submit"
                          className="text-rose-500 hover:text-rose-400 font-semibold flex items-center space-x-0.5 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
