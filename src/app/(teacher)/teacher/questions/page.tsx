import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Sidebar } from "@/components/layout/Sidebar";
import { createQuestionAction } from "../actions";
import { HelpCircle, PlusCircle } from "lucide-react";

export default async function QuestionBankPage() {
  const teacher = await requireRole(["TEACHER", "ADMIN"]);

  const subjects = await prisma.subject.findMany();
  const questions = await prisma.question.findMany({
    include: {
      subject: true,
      options: true,
      createdBy: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar role={teacher.role as any} user={teacher} />

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Question Bank</h1>
            <p className="text-slate-400 text-sm mt-1">Create reusable MCQ, True/False, and Short Answer questions</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create Question Form */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl h-fit">
            <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center space-x-2">
              <PlusCircle className="w-5 h-5 text-indigo-400" />
              <span>Add New Question</span>
            </h2>

            <form action={createQuestionAction} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Subject</label>
                <select
                  name="subjectId"
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500 text-sm"
                >
                  <option value="">Select Subject</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Question Type</label>
                <select
                  name="type"
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500 text-sm"
                >
                  <option value="MCQ">Multiple Choice (MCQ)</option>
                  <option value="TRUE_FALSE">True / False</option>
                  <option value="SHORT_ANSWER">Short Answer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Question Text</label>
                <textarea
                  name="text"
                  required
                  rows={3}
                  placeholder="Enter the question text..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Points</label>
                <input
                  type="number"
                  name="points"
                  defaultValue={1}
                  min={1}
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              {/* MCQ Options */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">MCQ Options (if MCQ selected)</label>
                {[0, 1, 2, 3].map((idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="correctOptionIndex"
                      value={idx}
                      defaultChecked={idx === 0}
                      className="accent-indigo-500"
                    />
                    <input
                      type="text"
                      name="optionText"
                      placeholder={`Option ${idx + 1}`}
                      className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-xs"
                    />
                  </div>
                ))}
              </div>

              {/* True/False Option */}
              <div className="pt-2 border-t border-slate-800">
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Correct T/F Answer</label>
                <select
                  name="tfAnswer"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm"
                >
                  <option value="true">True</option>
                  <option value="false">False</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-sm transition-all"
              >
                Save to Question Bank
              </button>
            </form>
          </div>

          {/* Question List */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-bold text-slate-100">Question Bank ({questions.length})</h2>
            {questions.map((q) => (
              <div key={q.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800">
                      {q.subject.code}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-slate-800 text-slate-300">
                      {q.type}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-amber-400">{q.points} {q.points === 1 ? "Pt" : "Pts"}</span>
                </div>
                <p className="text-sm font-semibold text-slate-100 mt-2">{q.text}</p>

                {q.options.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    {q.options.map((opt) => (
                      <div
                        key={opt.id}
                        className={`p-2 rounded-lg border ${
                          opt.isCorrect
                            ? "bg-emerald-950/40 border-emerald-800/80 text-emerald-300 font-semibold"
                            : "bg-slate-950/40 border-slate-800 text-slate-400"
                        }`}
                      >
                        {opt.text} {opt.isCorrect && "✓"}
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4 pt-2 border-t border-slate-800/60 text-[10px] text-slate-500">
                  Created by {q.createdBy.name} on {new Date(q.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
