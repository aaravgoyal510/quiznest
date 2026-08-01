import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Sidebar } from "@/components/layout/Sidebar";
import { getSystemWideAnalytics } from "@/lib/analytics";
import { Users, BookOpen, Clock, FileText, CheckCircle, BarChart3 } from "lucide-react";

export default async function AdminResultsPage() {
  const admin = await requireRole(["ADMIN"]);

  // Fetch quizzes and system-wide statistics
  const [quizzes, systemStats] = await Promise.all([
    prisma.quiz.findMany({
      include: {
        subject: true,
        teacher: true,
        attempts: {
          where: {
            studentId: { not: "load-test-student-id" },
          },
          include: {
            student: true,
          },
          orderBy: { startedAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    getSystemWideAnalytics(),
  ]);

  // Map user role counts
  const studentCount = systemStats.userCounts.find((u) => u.role === "STUDENT")?._count._all ?? 0;
  const teacherCount = systemStats.userCounts.find((u) => u.role === "TEACHER")?._count._all ?? 0;
  const adminCount = systemStats.userCounts.find((u) => u.role === "ADMIN")?._count._all ?? 0;

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar role="ADMIN" user={admin} />

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-100 tracking-tight">System-Wide Results & Reports</h1>
            <p className="text-slate-400 text-sm mt-1">Overview of all institutional quiz attempts, student scores, and category metrics</p>
          </div>
        </div>

        {/* System-Wide Stats Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center space-x-4">
            <div className="p-3 bg-indigo-950/60 text-indigo-400 rounded-xl border border-indigo-800/50">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Total Users</p>
              <h3 className="text-lg font-extrabold text-slate-100 mt-0.5">
                {studentCount + teacherCount + adminCount} <span className="text-[10px] text-slate-400 font-normal">({studentCount}S / {teacherCount}T)</span>
              </h3>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center space-x-4">
            <div className="p-3 bg-emerald-950/60 text-emerald-400 rounded-xl border border-emerald-800/50">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Completed Attempts</p>
              <h3 className="text-lg font-extrabold text-slate-100 mt-0.5">
                {systemStats.attemptStats._count._all}
              </h3>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center space-x-4">
            <div className="p-3 bg-indigo-950/60 text-indigo-400 rounded-xl border border-indigo-800/50">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Average Grade</p>
              <h3 className="text-lg font-extrabold text-slate-100 mt-0.5">
                {systemStats.attemptStats._avg.score !== null ? `${systemStats.attemptStats._avg.score.toFixed(1)} Pts` : "N/A"}
              </h3>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center space-x-4">
            <div className="p-3 bg-amber-950/60 text-amber-400 rounded-xl border border-amber-800/50">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Avg Time Spent</p>
              <h3 className="text-lg font-extrabold text-slate-100 mt-0.5">
                {systemStats.attemptStats._avg.timeSpentSeconds !== null ? `${Math.floor(systemStats.attemptStats._avg.timeSpentSeconds / 60)}m ${Math.floor(systemStats.attemptStats._avg.timeSpentSeconds % 60)}s` : "N/A"}
              </h3>
            </div>
          </div>
        </div>

        {/* Subject Category Analytics Table */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl mb-8">
          <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <span>Subject Category Performance</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                  <th className="py-2.5">Code</th>
                  <th className="py-2.5">Subject Name</th>
                  <th className="py-2.5 text-center">Attempts</th>
                  <th className="py-2.5 text-right">Avg Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {systemStats.subjectsAnalysis.map((subj) => (
                  <tr key={subj.id} className="text-slate-300">
                    <td className="py-3 font-mono font-bold text-indigo-400">{subj.code}</td>
                    <td className="py-3 font-medium">{subj.name}</td>
                    <td className="py-3 text-center">{subj.attemptsCount}</td>
                    <td className="py-3 text-right font-semibold text-slate-200">
                      {subj.averageScore !== null ? `${subj.averageScore} Pts` : "No attempts"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quizzes List Breakdown */}
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-slate-100">Individual Quiz Breakdown</h2>
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                <div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800">
                    {quiz.subject.code}
                  </span>
                  <h2 className="text-xl font-bold text-slate-100 mt-1">{quiz.title}</h2>
                  <p className="text-xs text-slate-400 font-medium">Created by {quiz.teacher.name} ({quiz.teacher.email})</p>
                </div>
                 <div className="text-right">
                  <span className="text-sm font-semibold text-slate-300">{quiz.attempts.length} Total Attempts</span>
                </div>
              </div>

              <div className="divide-y divide-slate-800/60">
                {quiz.attempts.length === 0 ? (
                  <p className="text-xs text-slate-500 py-2">No student has taken this quiz yet.</p>
                ) : (
                  quiz.attempts.map((att) => (
                    <div key={att.id} className="py-3 flex items-center justify-between text-sm">
                      <div>
                        <span className="font-semibold text-slate-200">{att.student.name}</span>
                        <span className="text-xs text-slate-400 ml-2">({att.student.email})</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-indigo-400">
                          {att.score !== null ? `${att.score} Pts` : "Pending Grading"}
                        </span>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {att.submittedAt ? new Date(att.submittedAt).toLocaleString() : "In Progress"}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
