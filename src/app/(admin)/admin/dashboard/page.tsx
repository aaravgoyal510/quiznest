import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Sidebar } from "@/components/layout/Sidebar";
import { Users, BookOpen, HelpCircle, Award, ShieldAlert, PlusCircle } from "lucide-react";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const user = await requireRole(["ADMIN"]);

  // Parallel database queries with field selection to reduce latency
  const [usersCount, subjectsCount, questionsCount, quizzesCount, recentAuditLogs] = await Promise.all([
    prisma.user.count(),
    prisma.subject.count(),
    prisma.question.count(),
    prisma.quiz.count(),
    prisma.auditLog.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        action: true,
        details: true,
        createdAt: true,
        user: { select: { name: true } },
      },
    }),
  ]);

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar role="ADMIN" user={user} />

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Admin Overview</h1>
            <p className="text-slate-400 text-sm mt-1">Institutional system status & management controls</p>
          </div>
          <div className="flex space-x-3">
            <Link
              href="/admin/users"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center space-x-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add User</span>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Users</span>
              <Users className="w-5 h-5 text-indigo-400" />
            </div>
            <p className="text-3xl font-extrabold text-slate-100 mt-2">{usersCount}</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Subjects</span>
              <BookOpen className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-3xl font-extrabold text-slate-100 mt-2">{subjectsCount}</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Question Bank</span>
              <HelpCircle className="w-5 h-5 text-amber-400" />
            </div>
            <p className="text-3xl font-extrabold text-slate-100 mt-2">{questionsCount}</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Quizzes</span>
              <Award className="w-5 h-5 text-purple-400" />
            </div>
            <p className="text-3xl font-extrabold text-slate-100 mt-2">{quizzesCount}</p>
          </div>
        </div>

        {/* Audit Log Preview */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-indigo-400" />
              <span>Recent System Activity</span>
            </h2>
            <Link href="/admin/audit-log" className="text-xs text-indigo-400 hover:underline">
              View all audit logs →
            </Link>
          </div>

          <div className="space-y-3">
            {recentAuditLogs.map((log) => (
              <div key={log.id} className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-200">{log.action}</p>
                  <p className="text-xs text-slate-400">{log.details}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 font-mono">{log.user.name}</span>
                  <p className="text-[10px] text-slate-500">{new Date(log.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
