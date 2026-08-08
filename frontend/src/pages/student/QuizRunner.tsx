import { useState, useRef, useEffect } from "react";
import { QuizTimer } from "../../components/student/QuizTimer";
import { CheckCircle, AlertTriangle, ShieldAlert, AlertCircle } from "lucide-react";
import { apiFetch } from "../../lib/api";

interface QuizRunnerProps {
  quizId: string;
  navigate: (to: string) => void;
}

interface Question {
  id: string;
  text: string;
  type: string;
  points: number;
  options: { id: string; text: string }[];
}

export default function QuizRunner({ quizId, navigate }: QuizRunnerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [attemptId, setAttemptId] = useState("");
  const [activeSessionToken, setActiveSessionToken] = useState("");
  const [quizTitle, setQuizTitle] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(0);

  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});
  const [saveStatuses, setSaveStatuses] = useState<Record<string, "idle" | "saving" | "saved" | "error">>({});
  
  const [submitting, setSubmitting] = useState(false);
  const [expired, setExpired] = useState(false);
  const [sessionLocked, setSessionLocked] = useState(false);

  const pendingTimeouts = useRef<Record<string, NodeJS.Timeout>>({});
  const telemetryRef = useRef({ count: 0, duration: 0 });
  const pendingTextValues = useRef<Record<string, string>>({});

  useEffect(() => {
    async function startOrResumeAttempt() {
      try {
        const res = await apiFetch(`/api/student/quizzes/${quizId}/attempt`, {
          method: "POST",
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to start quiz attempt.");
          setLoading(false);
          return;
        }

        const { attempt, quiz, activeSessionToken: token } = data;

        setAttemptId(attempt.id);
        setActiveSessionToken(token);
        setQuizTitle(quiz.title);
        setSubjectCode(quiz.subject.code);

        // Map questions layout
        const quizQuestions = quiz.questions.map((q: any) => ({
          id: q.id,
          text: q.text,
          type: q.type,
          points: q.points,
          options: q.options || [],
        }));
        setQuestions(quizQuestions);

        // Calculate time remaining based on startsAt/duration vs now
        const startTime = new Date(attempt.startedAt).getTime();
        const durationMs = quiz.durationMinutes * 60 * 1000;
        const nowTime = Date.now();
        const elapsedSeconds = Math.floor((nowTime - startTime) / 1000);
        const remainingSeconds = Math.max(0, Math.floor(durationMs / 1000) - elapsedSeconds);
        setTimeLeftSeconds(remainingSeconds);

        // Initialize answer maps from DB attempt history (resilience against tab refreshes)
        const selected: Record<string, string> = {};
        const text: Record<string, string> = {};
        attempt.answers.forEach((ans: any) => {
          if (ans.selectedOptionId) {
            selected[ans.questionId] = ans.selectedOptionId;
          }
          if (ans.textAnswer) {
            text[ans.questionId] = ans.textAnswer;
          }
        });
        setSelectedAnswers(selected);
        setTextAnswers(text);

        // Load telemetry totals from DB
        telemetryRef.current = {
          count: attempt.defocusCount || 0,
          duration: attempt.defocusDurationSeconds || 0,
        };
      } catch (err) {
        setError("Error connecting to server. Cannot initialize test runner.");
      } finally {
        setLoading(false);
      }
    }

    startOrResumeAttempt();
  }, [quizId]);

  // Tab switch listener hooks (anti-cheat telemetry)
  useEffect(() => {
    if (loading || error || sessionLocked) return;

    let blurTime: number | null = null;

    const handleBlur = () => {
      blurTime = Date.now();
    };

    const handleFocus = async () => {
      if (blurTime !== null) {
        const diffMs = Date.now() - blurTime;
        // Logs swaps lasting >= 2.0s to filter out system overlays
        if (diffMs >= 2000) {
          telemetryRef.current.count += 1;
          telemetryRef.current.duration += Math.floor(diffMs / 1000);

          // Sync telemetry stats directly to Express DB
          try {
            await apiFetch(`/api/student/attempts/${attemptId}/telemetry`, {
              method: "POST",
              body: JSON.stringify({
                defocusCount: telemetryRef.current.count,
                defocusDurationSeconds: telemetryRef.current.duration,
                activeSessionToken,
              }),
            });
          } catch (err) {
            console.error("Telemetry sync error:", err);
          }
        }
        blurTime = null;
      }
    };

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      Object.values(pendingTimeouts.current).forEach(clearTimeout);
    };
  }, [loading, error, attemptId, activeSessionToken, sessionLocked]);

  const handleOptionChange = async (questionId: string, optionId: string) => {
    if (sessionLocked || expired || submitting) return;

    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionId }));
    setSaveStatuses((prev) => ({ ...prev, [questionId]: "saving" }));

    try {
      const res = await apiFetch(`/api/student/attempts/${attemptId}/answers`, {
        method: "POST",
        body: JSON.stringify({
          questionId,
          selectedOptionId: optionId,
          activeSessionToken,
        }),
      });

      if (res.status === 429) {
        setSaveStatuses((prev) => ({ ...prev, [questionId]: "error" }));
      } else if (!res.ok) {
        const data = await res.json();
        if (data.error && data.error.includes("Session conflict")) {
          setSessionLocked(true);
        } else {
          setSaveStatuses((prev) => ({ ...prev, [questionId]: "error" }));
        }
      } else {
        setSaveStatuses((prev) => ({ ...prev, [questionId]: "saved" }));
      }
    } catch (err) {
      setSaveStatuses((prev) => ({ ...prev, [questionId]: "error" }));
    }
  };

  const handleTextChange = (questionId: string, text: string) => {
    if (sessionLocked || expired || submitting) return;

    setTextAnswers((prev) => ({ ...prev, [questionId]: text }));
    setSaveStatuses((prev) => ({ ...prev, [questionId]: "saving" }));
    pendingTextValues.current[questionId] = text;

    if (pendingTimeouts.current[questionId]) {
      clearTimeout(pendingTimeouts.current[questionId]);
    }

    pendingTimeouts.current[questionId] = setTimeout(async () => {
      delete pendingTextValues.current[questionId];
      try {
        const res = await apiFetch(`/api/student/attempts/${attemptId}/answers`, {
          method: "POST",
          body: JSON.stringify({
            questionId,
            textAnswer: text,
            activeSessionToken,
          }),
        });

        if (res.status === 429) {
          setSaveStatuses((prev) => ({ ...prev, [questionId]: "error" }));
        } else if (!res.ok) {
          const data = await res.json();
          if (data.error && data.error.includes("Session conflict")) {
            setSessionLocked(true);
          } else {
            setSaveStatuses((prev) => ({ ...prev, [questionId]: "error" }));
          }
        } else {
          setSaveStatuses((prev) => ({ ...prev, [questionId]: "saved" }));
        }
      } catch (err) {
        setSaveStatuses((prev) => ({ ...prev, [questionId]: "error" }));
      }
    }, 1000);
  };

  const handleTextBlur = async (questionId: string) => {
    if (sessionLocked || expired || submitting) return;

    if (pendingTimeouts.current[questionId]) {
      clearTimeout(pendingTimeouts.current[questionId]);
      delete pendingTimeouts.current[questionId];
    }

    const text = textAnswers[questionId] || "";
    delete pendingTextValues.current[questionId];

    try {
      const res = await apiFetch(`/api/student/attempts/${attemptId}/answers`, {
        method: "POST",
        body: JSON.stringify({
          questionId,
          textAnswer: text,
          activeSessionToken,
        }),
      });

      if (res.status === 429) {
        setSaveStatuses((prev) => ({ ...prev, [questionId]: "error" }));
      } else if (!res.ok) {
        const data = await res.json();
        if (data.error && data.error.includes("Session conflict")) {
          setSessionLocked(true);
        } else {
          setSaveStatuses((prev) => ({ ...prev, [questionId]: "error" }));
        }
      } else {
        setSaveStatuses((prev) => ({ ...prev, [questionId]: "saved" }));
      }
    } catch (err) {
      setSaveStatuses((prev) => ({ ...prev, [questionId]: "error" }));
    }
  };

  const handleFinalSubmit = async () => {
    if (sessionLocked || submitting) return;
    setSubmitting(true);

    // Save any pending text inputs in the queue before submitting
    const pendingQuestionIds = Object.keys(pendingTimeouts.current);
    for (const qId of pendingQuestionIds) {
      clearTimeout(pendingTimeouts.current[qId]);
      delete pendingTimeouts.current[qId];

      const text = pendingTextValues.current[qId] ?? textAnswers[qId] ?? "";
      delete pendingTextValues.current[qId];

      try {
        await apiFetch(`/api/student/attempts/${attemptId}/answers`, {
          method: "POST",
          body: JSON.stringify({
            questionId: qId,
            textAnswer: text,
            activeSessionToken,
          }),
        });
      } catch (err) {
        console.error("Autosave sweep error:", err);
      }
    }

    try {
      const res = await apiFetch(`/api/student/attempts/${attemptId}/finalize`, {
        method: "POST",
        body: JSON.stringify({
          telemetry: {
            defocusCount: telemetryRef.current.count,
            defocusDurationSeconds: telemetryRef.current.duration,
          },
          activeSessionToken,
        }),
      });

      if (res.ok) {
        navigate("/student/dashboard");
      } else {
        const data = await res.json();
        alert(data.error || "Submission grading error.");
        if (data.error && data.error.includes("Session conflict")) {
          setSessionLocked(true);
        }
      }
    } catch (err) {
      alert("Error submitting exam. Please check connection.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <p className="animate-pulse">Loading active exam session workspace...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-6 rounded-2xl text-center">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-100">Quiz Entry Blocked</h2>
          <p className="text-slate-400 text-sm mt-2 leading-relaxed">{error}</p>
          <button
            onClick={() => navigate("/student/dashboard")}
            className="mt-5 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-all cursor-pointer"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 font-sans text-slate-100">
      {/* Session Hijacking Lock Overlay */}
      {sessionLocked && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center shadow-2xl">
            <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4 animate-bounce" />
            <h2 className="text-xl font-bold tracking-tight text-rose-400">Quiz Attempt Invalidated</h2>
            <p className="text-sm text-slate-400 mt-3 leading-relaxed">
              This quiz attempt has been active in another browser tab, device, or duplicate window. 
              Further saves are blocked in this window to preserve score audit consistency.
            </p>
            <button
              onClick={() => navigate("/student/dashboard")}
              className="mt-6 w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all cursor-pointer"
            >
              Back to Assessment Hub
            </button>
          </div>
        </div>
      )}

      {expired && (
        <div className="mb-6 p-4 bg-rose-950/40 border border-rose-800/50 rounded-xl text-rose-300 text-sm flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <span>Time limit expired! final responses are being graded...</span>
        </div>
      )}

      {/* Runner Bar */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-4 z-10 backdrop-blur-md">
        <div>
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-indigo-950 text-indigo-400 border border-indigo-800">
            {subjectCode}
          </span>
          <h1 className="text-xl font-bold text-slate-100 mt-1">{quizTitle}</h1>
        </div>

        <QuizTimer
          initialTimeLeftSeconds={timeLeftSeconds}
          onTimeExpired={() => {
            setExpired(true);
            handleFinalSubmit();
          }}
        />
      </div>

      {/* Questions Stack */}
      <div className="space-y-6">
        {questions.map((q, idx) => {
          const status = saveStatuses[q.id] || "idle";

          return (
            <div key={q.id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                    Question {idx + 1} of {questions.length} ({q.type})
                  </span>
                  
                  {status === "saving" && (
                    <span className="text-[10px] text-indigo-400 animate-pulse font-medium">• Saving...</span>
                  )}
                  {status === "saved" && (
                    <span className="text-[10px] text-emerald-400 font-semibold">✓ Saved</span>
                  )}
                  {status === "error" && (
                    <span className="text-[10px] text-rose-400 font-semibold">⚠ Save failed</span>
                  )}
                </div>
                <span className="text-xs font-mono text-amber-400 font-bold">{q.points} Pts</span>
              </div>

              <p className="text-base font-semibold text-slate-100 mb-4">{q.text}</p>

              {q.options.length > 0 ? (
                <div className="space-y-2">
                  {q.options.map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex items-center space-x-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                        selectedAnswers[q.id] === opt.id
                          ? "bg-indigo-950/60 border-indigo-500/80 text-indigo-200 font-medium"
                          : "bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        value={opt.id}
                        disabled={expired || submitting}
                        checked={selectedAnswers[q.id] === opt.id}
                        onChange={() => handleOptionChange(q.id, opt.id)}
                        className="accent-indigo-500"
                      />
                      <span className="text-sm">{opt.text}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div>
                  <textarea
                    rows={4}
                    value={textAnswers[q.id] || ""}
                    disabled={expired || submitting}
                    onChange={(e) => handleTextChange(q.id, e.target.value)}
                    onBlur={() => handleTextBlur(q.id)}
                    placeholder="Type your answer here..."
                    className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm disabled:opacity-60 disabled:pointer-events-none transition-all resize-none"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8">
        <button
          onClick={handleFinalSubmit}
          disabled={submitting}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center space-x-2 text-base disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <CheckCircle className="w-5 h-5" />
          <span>{submitting ? "Submitting Quiz..." : "Finish & Submit Quiz"}</span>
        </button>
      </div>
    </div>
  );
}
