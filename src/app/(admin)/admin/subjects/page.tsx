import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Sidebar } from "@/components/layout/Sidebar";
import { createSubjectAction } from "../actions";
import { BookOpen, PlusCircle } from "lucide-react";

export default async function AdminSubjectsPage() {
  const admin = await requireRole(["ADMIN"]);
  const subjects = await prisma.subject.findMany({
    include: {
      createdBy: true,
      _count: { select: { questions: true, quizzes: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar role="ADMIN" user={admin} />

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Subject Management</h1>
            <p className="text-slate-400 text-sm mt-1">Institutional courses and subject definitions</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add Subject Form */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl h-fit">
            <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center space-x-2">
              <PlusCircle className="w-5 h-5 text-indigo-400" />
              <span>Add New Subject</span>
            </h2>

            <form action={createSubjectAction} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Subject Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Data Structures & Algorithms"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Subject Code</label>
                <input
                  type="text"
                  name="code"
                  required
                  placeholder="e.g. CS301"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Description</label>
                <textarea
                  name="description"
                  rows={3}
                  placeholder="Subject syllabus summary..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-sm transition-all"
              >
                Create Subject
              </button>
            </form>
          </div>

          {/* Subjects Grid */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {subjects.map((sub) => (
              <div key={sub.id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs px-2.5 py-1 rounded-md font-mono font-bold bg-indigo-950 text-indigo-400 border border-indigo-800">
                      {sub.code}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      By {sub.createdBy.name}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-100">{sub.name}</h3>
                  <p className="text-xs text-slate-400 mt-2 line-clamp-2">{sub.description || "No description provided."}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between text-xs text-slate-400 font-medium">
                  <span>{sub._count.questions} Questions</span>
                  <span>{sub._count.quizzes} Quizzes</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
