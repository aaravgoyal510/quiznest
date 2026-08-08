import { useState, useEffect } from "react";
import { apiFetch } from "../../lib/api";
import {
  CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp,
  Hourglass, Send, MessageSquare, Lock
} from "lucide-react";

interface GradingPanelProps {
  quizId: string;
  onClose: () => void;
  onAllFinalized: () => void;
}

interface Answer {
  id: string;
  questionId: string;
  textAnswer: string | null;
  selectedOptionId: string | null;
  isCorrect: boolean | null;
  pointsAwarded: number | null;
  confirmed: boolean;
  question: {
    id: string;
    text: string;
    type: "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER";
    points: number;
    options: Array<{ id: string; text: string; isCorrect: boolean }>;
  };
  selectedOption: { id: string; text: string; isCorrect: boolean } | null;
}

interface PendingAttempt {
  id: string;
  submittedAt: string;
  score: number | null;
  needsReview: boolean;
  student: { id: string; name: string; email: string };
  answers: Answer[];
}

export function TeacherGradingPanel({ quizId, onClose, onAllFinalized }: GradingPanelProps) {
  const [attempts, setAttempts] = useState<PendingAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedAttempt, setExpandedAttempt] = useState<string | null>(null);
  const [grades, setGrades] = useState<Record<string, string>>({}); // answerId -> points string
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [finalizing, setFinalizing] = useState<Record<string, boolean>>({});
  const [successMsg, setSuccessMsg] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch(`/api/teacher/quizzes/${quizId}/pending-attempts`);
      const data = await res.json();
      if (res.ok) {
        setAttempts(data.attempts || []);
        if (data.attempts?.length > 0) {
          setExpandedAttempt(data.attempts[0].id);
        }
      } else {
        setError(data.error || "Failed to load pending attempts.");
      }
    } catch {
      setError("Server connection error.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [quizId]);

  async function saveGrade(attemptId: string, answerId: string) {
    const pts = parseFloat(grades[answerId] ?? "");
    if (isNaN(pts) || pts < 0) {
      setError("Points must be a non-negative number.");
      return;
    }
    setSaving((s) => ({ ...s, [answerId]: true }));
    setError("");
    try {
      const res = await apiFetch(`/api/teacher/attempts/${attemptId}/grade-question`, {
        method: "POST",
        body: JSON.stringify({ answerId, pointsAwarded: pts }),
      });
      const data = await res.json();
      if (res.ok) {
        setAttempts((prev) =>
          prev.map((a) =>
            a.id !== attemptId
              ? a
              : {
                  ...a,
                  answers: a.answers.map((ans) =>
                    ans.id === answerId
                      ? { ...ans, pointsAwarded: data.answer.pointsAwarded, confirmed: true }
                      : ans
                  ),
                }
          )
        );
        setSuccessMsg("Grade saved.");
        setTimeout(() => setSuccessMsg(""), 2000);
      } else {
        setError(data.error || "Failed to save grade.");
      }
    } catch {
      setError("Server error saving grade.");
    } finally {
      setSaving((s) => ({ ...s, [answerId]: false }));
    }
  }

  async function finalizeAttempt(attemptId: string) {
    setFinalizing((f) => ({ ...f, [attemptId]: true }));
    setError("");
    try {
      const res = await apiFetch(`/api/teacher/attempts/${attemptId}/finalize-grading`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setAttempts((prev) => prev.filter((a) => a.id !== attemptId));
        setSuccessMsg(`Attempt finalized! Final score: ${data.finalScore}`);
        setTimeout(() => setSuccessMsg(""), 4000);
        if (attempts.length === 1) onAllFinalized();
      } else {
        setError(data.error || "Could not finalize attempt.");
      }
    } catch {
      setError("Server error finalizing.");
    } finally {
      setFinalizing((f) => ({ ...f, [attemptId]: false }));
    }
  }

  const unconfirmedCount = (attempt: PendingAttempt) =>
    attempt.answers.filter((a) => !a.confirmed).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-8 px-4">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <Hourglass className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Manual Grading Panel</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {attempts.length} attempt{attempts.length !== 1 ? "s" : ""} pending review
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts */}
        <div className="px-6 pt-4 space-y-2">
          {error && (
            <div className="p-3 bg-rose-950/50 border border-rose-800/50 rounded-lg text-rose-300 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-emerald-950/50 border border-emerald-800/50 rounded-lg text-emerald-300 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              {successMsg}
            </div>
          )}
        </div>

        <div className="p-6 space-y-4">
          {loading ? (
            <p className="text-slate-400 text-sm animate-pulse py-8 text-center">Loading pending attempts…</p>
          ) : attempts.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <p className="text-slate-300 font-semibold">All attempts have been graded!</p>
              <p className="text-slate-500 text-sm mt-1">No more pending reviews for this quiz.</p>
              <button
                onClick={onClose}
                className="mt-4 px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm rounded-xl border border-slate-700 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          ) : (
            attempts.map((attempt) => {
              const isExpanded = expandedAttempt === attempt.id;
              const remaining = unconfirmedCount(attempt);
              const canFinalize = remaining === 0;

              return (
                <div
                  key={attempt.id}
                  className="border border-slate-800 rounded-xl overflow-hidden"
                >
                  {/* Attempt header */}
                  <button
                    onClick={() => setExpandedAttempt(isExpanded ? null : attempt.id)}
                    className="w-full flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-400">
                        {attempt.student.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-100">{attempt.student.name}</p>
                        <p className="text-xs text-slate-400">{attempt.student.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {remaining > 0 ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-950/50 text-amber-400 border border-amber-700/40">
                          {remaining} unreviewed
                        </span>
                      ) : (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-950/50 text-emerald-400 border border-emerald-700/40">
                          Ready to finalize
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {/* Expanded answer list */}
                  {isExpanded && (
                    <div className="p-4 space-y-4 bg-slate-950/40">
                      {attempt.answers.map((ans) => {
                        const isShort = ans.question.type === "SHORT_ANSWER";
                        const correctOption = ans.question.options.find((o) => o.isCorrect);

                        return (
                          <div
                            key={ans.id}
                            className={`p-4 rounded-xl border ${
                              ans.confirmed
                                ? "border-emerald-800/40 bg-emerald-950/10"
                                : "border-amber-700/40 bg-amber-950/10"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <p className="text-sm font-medium text-slate-200 flex-1">
                                {ans.question.text}
                              </p>
                              <span className="flex-shrink-0 text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                {ans.question.type}
                              </span>
                            </div>

                            {/* Student Answer */}
                            <div className="mb-3 p-3 rounded-lg bg-slate-800/60 border border-slate-700/50">
                              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                                Student's Answer
                              </p>
                              {isShort ? (
                                <p className="text-sm text-slate-200 flex items-start gap-2">
                                  <MessageSquare className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                                  {ans.textAnswer || (
                                    <em className="text-slate-500">No answer provided</em>
                                  )}
                                </p>
                              ) : (
                                <div className="flex items-center gap-2 text-sm">
                                  {ans.selectedOption ? (
                                    <>
                                      {ans.isCorrect ? (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                      ) : (
                                        <XCircle className="w-4 h-4 text-rose-400" />
                                      )}
                                      <span className={ans.isCorrect ? "text-emerald-300" : "text-rose-300"}>
                                        {ans.selectedOption.text}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-slate-500 italic">No answer selected</span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Current correct answer (shown for needsReview awareness) */}
                            {attempt.needsReview && isShort && correctOption && (
                              <div className="mb-3 p-3 rounded-lg bg-indigo-950/30 border border-indigo-700/30">
                                <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wide mb-1">
                                  Current Expected Answer (may have changed)
                                </p>
                                <p className="text-sm text-indigo-300">{correctOption.text}</p>
                              </div>
                            )}

                            {/* Grading area */}
                            <div className="flex items-center gap-3 mt-2">
                              {isShort ? (
                                <>
                                  <div className="flex items-center gap-2">
                                    <label className="text-xs text-slate-400">Points:</label>
                                    <input
                                      type="number"
                                      min={0}
                                      max={ans.question.points}
                                      step={0.5}
                                      value={grades[ans.id] ?? (ans.pointsAwarded?.toString() || "")}
                                      onChange={(e) =>
                                        setGrades((g) => ({ ...g, [ans.id]: e.target.value }))
                                      }
                                      placeholder={`0–${ans.question.points}`}
                                      className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40"
                                    />
                                    <span className="text-xs text-slate-500">/ {ans.question.points}</span>
                                  </div>
                                  <button
                                    onClick={() => saveGrade(attempt.id, ans.id)}
                                    disabled={saving[ans.id]}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
                                  >
                                    <Send className="w-3 h-3" />
                                    {saving[ans.id] ? "Saving…" : ans.confirmed ? "Update" : "Confirm"}
                                  </button>
                                </>
                              ) : (
                                <span className="text-xs text-slate-500 italic">
                                  Auto-graded · {ans.pointsAwarded ?? 0} / {ans.question.points} pts
                                </span>
                              )}

                              {ans.confirmed && (
                                <span className="ml-auto flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Finalize button */}
                      <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                        <p className="text-xs text-slate-500">
                          {canFinalize
                            ? "All answers confirmed — ready to publish final score."
                            : `${remaining} answer(s) still need review before finalizing.`}
                        </p>
                        <button
                          onClick={() => finalizeAttempt(attempt.id)}
                          disabled={!canFinalize || finalizing[attempt.id]}
                          title={!canFinalize ? `${remaining} unconfirmed answers remaining` : "Publish final score"}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
                        >
                          <Lock className="w-4 h-4" />
                          {finalizing[attempt.id] ? "Finalizing…" : "Finalize Score"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
