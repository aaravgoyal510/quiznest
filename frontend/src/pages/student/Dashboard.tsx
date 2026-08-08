import { useState, useEffect } from "react";
import { Sidebar } from "../../components/layout/Sidebar";
import { BookOpen, Clock, Award, AlertCircle, Hourglass, CheckCircle2, Eye } from "lucide-react";
import { apiFetch } from "../../lib/api";

interface DashboardProps {
  navigate: (to: string) => void;
}

interface Attempt {
  id: string;
  submittedAt: string | null;
  score: number | null;
  gradingStatus: "AUTO_GRADED" | "PENDING_REVIEW" | "FINALIZED" | null;
  answers?: Array<{ confirmed: boolean }>;
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  startsAt: string;
  endsAt: string;
  subject: { code: string; name: string };
  _count: { questions: number };
  attempts: Attempt[];
}

interface CompletedAttempt {
  id: string;
  submittedAt: string | null;
  score: number | null;
  gradingStatus: Attempt["gradingStatus"];
  pendingCount: number;
  quiz: { title: string; subject: { code: string } };
}

export default function StudentDashboard({ navigate }: DashboardProps) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState<{ name: string; email: string; role: "STUDENT" } | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("quiz_auth_user");
    if (savedUser) setUser(JSON.parse(savedUser));

    async function loadDashboardData() {
      try {
        const res = await apiFetch("/api/student/quizzes");
        const data = await res.json();
        if (res.ok) {
          setQuizzes(data.quizzes || []);
        } else {
          setError(data.error || "Failed to load dashboard data.");
        }
      } catch {
        setError("Error connecting to server. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <p className="animate-pulse">Loading dashboard assessment data...</p>
      </div>
    );
  }

  const completedAttempts: CompletedAttempt[] = quizzes
    .filter((q) => q.attempts.some((att) => att.submittedAt !== null))
    .map((q) => {
      const att = q.attempts.find((a) => a.submittedAt !== null)!;
      const pendingCount = att.answers?.filter((a) => !a.confirmed).length ?? 0;
      return {
        id: att.id,
        submittedAt: att.submittedAt,
        score: att.score,
        gradingStatus: att.gradingStatus,
        pendingCount,
        quiz: { title: q.title, subject: { code: q.subject.code } },
      };
    });

  const availableQuizzes = quizzes.filter(
    (q) => !q.attempts.some((att) => att.submittedAt !== null)
  );

  function GradingBadge({ attempt }: { attempt: CompletedAttempt }) {
    if (attempt.gradingStatus === "FINALIZED") {
      return (
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-2xl font-extrabold text-emerald-400">{attempt.score} Pts</span>
          <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-500 uppercase tracking-wide">
            <CheckCircle2 className="w-3 h-3" /> Finalized
          </span>
        </div>
      );
    }
    if (attempt.gradingStatus === "PENDING_REVIEW") {
      return (
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-2xl font-extrabold text-amber-400">
            {attempt.score !== null ? `${attempt.score} Pts` : "—"}
          </span>
          <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-500 uppercase tracking-wide">
            <Hourglass className="w-3 h-3 animate-pulse" />
            {attempt.pendingCount > 0 ? `${attempt.pendingCount} Pending Review` : "Pending Review"}
          </span>
          {attempt.score !== null && (
            <span className="text-[9px] text-slate-500 italic">provisional score</span>
          )}
        </div>
      );
    }
    return (
      <div className="flex flex-col items-end gap-0.5">
        <span className="text-2xl font-extrabold text-indigo-400">
          {attempt.score !== null ? `${attempt.score} Pts` : "—"}
        </span>
        <span className="text-[10px] text-slate-500 uppercase tracking-wide">Auto Graded</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-950 text-slate-100 font-sans">
      {user && <Sidebar role="STUDENT" user={user} navigate={navigate} />}

      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Student Dashboard</h1>
            <p className="text-slate-400 text-sm mt-1">Available assessments and your score reports</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-950/40 border border-rose-800/50 rounded-xl text-rose-300 text-sm flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {completedAttempts.some((a) => a.gradingStatus === "PENDING_REVIEW") && (
          <div className="mb-6 p-4 bg-amber-950/30 border border-amber-700/40 rounded-xl flex items-start gap-3">
            <Hourglass className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0 animate-pulse" />
            <div>
              <p className="text-sm font-semibold text-amber-300">Some results pending teacher review</p>
              <p className="text-xs text-amber-400/80 mt-0.5">
                Quizzes with short-answer questions are graded manually by your teacher. Scores shown are provisional until finalized.
              </p>
            </div>
          </div>
        )}

        {/* Available Quizzes */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl mb-8">
          <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <span>Active Quizzes Available ({availableQuizzes.length})</span>
          </h2>

          {availableQuizzes.length === 0 ? (
            <p className="text-slate-500 text-sm py-4">No active quizzes scheduled at this time.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableQuizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="bg-slate-950/70 border border-slate-800 p-5 rounded-xl flex flex-col justify-between hover:border-indigo-700/50 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800">
                        {quiz.subject.code}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{quiz.durationMinutes} mins</span>
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-100">{quiz.title}</h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {quiz.description || "No description."}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-500">{quiz._count.questions} Questions</span>
                    <button
                      onClick={() => navigate(`/student/quiz/${quiz.id}/take`)}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                    >
                      Start Quiz →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Past Attempts / Grades */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center space-x-2">
            <Award className="w-5 h-5 text-amber-400" />
            <span>My Past Scores ({completedAttempts.length})</span>
          </h2>

          {completedAttempts.length === 0 ? (
            <p className="text-slate-500 text-sm py-4">No completed quizzes to display yet.</p>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {completedAttempts.map((att) => (
                <div key={att.id} className="py-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-indigo-300">
                      {att.quiz.subject.code}
                    </span>
                    <h3 className="text-sm font-bold text-slate-100 mt-1 truncate">{att.quiz.title}</h3>
                    <p className="text-xs text-slate-400 font-mono">
                      Submitted: {att.submittedAt ? new Date(att.submittedAt).toLocaleString() : ""}
                    </p>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-3">
                    {att.gradingStatus === "PENDING_REVIEW" && (
                      <div title="Pending teacher review" className="p-1.5 rounded-lg bg-amber-950/40 border border-amber-800/40 text-amber-400">
                        <Eye className="w-4 h-4" />
                      </div>
                    )}
                    <GradingBadge attempt={att} />
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
