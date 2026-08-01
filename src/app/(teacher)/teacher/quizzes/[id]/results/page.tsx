import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Sidebar } from "@/components/layout/Sidebar";
import { gradeShortAnswerAction } from "@/app/(teacher)/teacher/actions";
import { Download, Award, Clock, FileCheck } from "lucide-react";
import Link from "next/link";
import { getQuizStats } from "@/lib/analytics";
import LiveProgress from "./LiveProgress";

interface QuizResultsPageProps {
  params: Promise<{ id: string }>;
}

export default async function QuizResultsPage({ params }: QuizResultsPageProps) {
  const { id } = await params;
  const teacher = await requireRole(["TEACHER", "ADMIN"]);
  const quizId = id;

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      subject: true,
      _count: { select: { questions: true } },
      attempts: {
        where: {
          studentId: { not: "load-test-student-id" },
        },
        include: {
          student: true,
          answers: {
            include: { question: true, selectedOption: true },
          },
        },
      },
    },
  });

  if (!quiz) return <div>Quiz not found</div>;

  // Retrieve statistics for the quiz attempts
  const stats = await getQuizStats(quizId);

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar role={teacher.role as any} user={teacher} />

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800">
              {quiz.subject.code}
            </span>
            <h1 className="text-3xl font-bold text-slate-100 tracking-tight mt-1">{quiz.title} - Results</h1>
            <p className="text-slate-400 text-sm">Student attempts & short answer evaluation queue</p>
          </div>

          <a
            href={`/api/teacher/results/export?quizId=${quiz.id}`}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </a>
        </div>

        {/* Statistics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center space-x-4">
            <div className="p-3 bg-indigo-950/60 text-indigo-400 rounded-xl border border-indigo-800/50">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Average Score</p>
              <h3 className="text-xl font-extrabold text-slate-100 mt-0.5">
                {stats._avg.score !== null ? `${stats._avg.score.toFixed(1)} Pts` : "N/A"}
              </h3>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center space-x-4">
            <div className="p-3 bg-emerald-950/60 text-emerald-400 rounded-xl border border-emerald-800/50">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400">High Score</p>
              <h3 className="text-xl font-extrabold text-slate-100 mt-0.5">
                {stats._max.score !== null ? `${stats._max.score} Pts` : "N/A"}
              </h3>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center space-x-4">
            <div className="p-3 bg-rose-950/60 text-rose-400 rounded-xl border border-rose-800/50">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Low Score</p>
              <h3 className="text-xl font-extrabold text-slate-100 mt-0.5">
                {stats._min.score !== null ? `${stats._min.score} Pts` : "N/A"}
              </h3>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center space-x-4">
            <div className="p-3 bg-amber-950/60 text-amber-400 rounded-xl border border-amber-800/50">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Average Duration</p>
              <h3 className="text-xl font-extrabold text-slate-100 mt-0.5">
                {stats._avg.timeSpentSeconds !== null ? `${Math.floor(stats._avg.timeSpentSeconds / 60)}m ${Math.floor(stats._avg.timeSpentSeconds % 60)}s` : "N/A"}
              </h3>
            </div>
          </div>
        </div>

        {/* Live Active Monitoring Panel */}
        <LiveProgress quizId={quiz.id} totalQuestions={quiz._count.questions} />

        {/* Student Attempts */}
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-slate-100 mb-4">Submitted Attempts ({quiz.attempts.length})</h2>
          {quiz.attempts.map((att) => (
            <div key={att.id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-100">{att.student.name}</h3>
                  <p className="text-xs text-slate-400">{att.student.email} • {att.student.department} ({att.student.year})</p>
                  
                  {/* Telemetry Display */}
                  {att.submittedAt && (
                    <div className="flex items-center space-x-3 mt-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        att.defocusCount > 3 ? "bg-rose-950/60 text-rose-400 border border-rose-800/60" : "bg-slate-850 text-slate-400"
                      }`}>
                        Tab Switches: {att.defocusCount}
                      </span>
                      <span className="text-[10px] font-bold bg-slate-850 text-slate-400 px-2 py-0.5 rounded">
                        Time Defocused: {att.defocusDurationSeconds}s
                      </span>
                      {att.timeSpentSeconds !== null && (
                        <span className="text-[10px] font-bold bg-slate-850 text-slate-400 px-2 py-0.5 rounded">
                          Time Spent: {Math.floor(att.timeSpentSeconds / 60)}m {att.timeSpentSeconds % 60}s
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-extrabold text-indigo-400">
                    {att.score !== null ? `${att.score} Pts` : "Pending Grading"}
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Submitted: {att.submittedAt ? new Date(att.submittedAt).toLocaleString() : "In Progress"}
                  </p>
                </div>
              </div>

              {/* Answers Breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Answer Breakdown</h4>
                {att.answers.map((ans) => (
                  <div key={ans.id} className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-slate-200">{ans.question.text}</p>
                      <p className="text-slate-400 mt-1">
                        Student Answer:{" "}
                        <span className="text-slate-200 font-medium">
                          {ans.selectedOption ? ans.selectedOption.text : ans.textAnswer || "No answer"}
                        </span>
                      </p>
                    </div>

                    <div className="text-right">
                      {ans.question.type === "SHORT_ANSWER" && ans.isCorrect === null ? (
                        <form
                          action={async (formData: FormData) => {
                            "use server";
                            const pts = parseFloat(formData.get("points") as string || "0");
                            const isCorr = pts > 0;
                            await gradeShortAnswerAction(ans.id, pts, isCorr);
                          }}
                          className="flex items-center space-x-2"
                        >
                          <input
                            type="number"
                            name="points"
                            placeholder="Pts"
                            max={ans.question.points}
                            min={0}
                            required
                            className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-100 text-xs"
                          />
                          <button
                            type="submit"
                            className="px-2 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-500"
                          >
                            Grade
                          </button>
                        </form>
                      ) : (
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded ${
                            ans.isCorrect ? "bg-emerald-950 text-emerald-400" : "bg-rose-950 text-rose-400"
                          }`}
                        >
                          {ans.pointsAwarded} / {ans.question.points} Pts
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
