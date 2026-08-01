"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { submitQuizAnswerAction, finalizeQuizAttemptAction } from "@/app/(student)/student/actions";
import { QuizTimer } from "@/components/student/QuizTimer";
import { CheckCircle, AlertTriangle, CloudRain, ShieldAlert, Cloud } from "lucide-react";

interface QuizRunnerProps {
  attemptId: string;
  startedAt: string;
  initialTimeLeftSeconds: number;
  activeSessionToken: string;
  quizTitle: string;
  subjectCode: string;
  questions: {
    id: string;
    text: string;
    type: string;
    points: number;
    options: { id: string; text: string }[];
  }[];
  initialSelectedAnswers: Record<string, string>;
  initialTextAnswers: Record<string, string>;
}

export default function QuizRunner({
  attemptId,
  startedAt,
  initialTimeLeftSeconds,
  activeSessionToken,
  quizTitle,
  subjectCode,
  questions,
  initialSelectedAnswers,
  initialTextAnswers,
}: QuizRunnerProps) {
  const router = useRouter();
  
  // State maps initialized with prior attempts to handle crashes/re-opens cleanly
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>(initialSelectedAnswers);
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>(initialTextAnswers);
  const [saveStatuses, setSaveStatuses] = useState<Record<string, "idle" | "saving" | "saved" | "error">>({});
  
  const [submitting, setSubmitting] = useState(false);
  const [expired, setExpired] = useState(false);
  const [sessionLocked, setSessionLocked] = useState(false);

  const pendingTimeouts = useRef<Record<string, NodeJS.Timeout>>({});
  const telemetryRef = useRef({ count: 0, duration: 0 });

  // In-memory cache of text values currently pending a debounced save
  const pendingTextValues = useRef<Record<string, string>>({});

  useEffect(() => {
    let blurTime: number | null = null;

    const handleBlur = () => {
      blurTime = Date.now();
    };

    const handleFocus = () => {
      if (blurTime !== null) {
        const diffMs = Date.now() - blurTime;
        // Only log tab swaps lasting 2.0s or more to filter out system notifications
        if (diffMs >= 2000) {
          telemetryRef.current.count += 1;
          telemetryRef.current.duration += Math.floor(diffMs / 1000);
        }
        blurTime = null;
      }
    };

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      // Clean up debounced save timers on unmount
      Object.values(pendingTimeouts.current).forEach(clearTimeout);
    };
  }, []);

  const handleOptionChange = async (questionId: string, optionId: string) => {
    if (sessionLocked || expired || submitting) return;

    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionId }));
    setSaveStatuses((prev) => ({ ...prev, [questionId]: "saving" }));

    try {
      const res = await submitQuizAnswerAction({
        attemptId,
        questionId,
        selectedOptionId: optionId,
        activeSessionToken,
        defocusCount: telemetryRef.current.count,
        defocusDurationSeconds: telemetryRef.current.duration,
      });

      if (res && "rateLimited" in res && res.rateLimited) {
        // Soft-fail on save rate-limiting: show error state but do not lock UI
        setSaveStatuses((prev) => ({ ...prev, [questionId]: "error" }));
      } else {
        setSaveStatuses((prev) => ({ ...prev, [questionId]: "saved" }));
      }
    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes("Session invalidated")) {
        setSessionLocked(true);
      } else {
        setSaveStatuses((prev) => ({ ...prev, [questionId]: "error" }));
      }
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
        const res = await submitQuizAnswerAction({
          attemptId,
          questionId,
          textAnswer: text,
          activeSessionToken,
          defocusCount: telemetryRef.current.count,
          defocusDurationSeconds: telemetryRef.current.duration,
        });

        if (res && "rateLimited" in res && res.rateLimited) {
          setSaveStatuses((prev) => ({ ...prev, [questionId]: "error" }));
        } else {
          setSaveStatuses((prev) => ({ ...prev, [questionId]: "saved" }));
        }
      } catch (err: any) {
        console.error("Debounced save error:", err);
        if (err.message && err.message.includes("Session invalidated")) {
          setSessionLocked(true);
        } else {
          setSaveStatuses((prev) => ({ ...prev, [questionId]: "error" }));
        }
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
      const res = await submitQuizAnswerAction({
        attemptId,
        questionId,
        textAnswer: text,
        activeSessionToken,
        defocusCount: telemetryRef.current.count,
        defocusDurationSeconds: telemetryRef.current.duration,
      });

      if (res && "rateLimited" in res && res.rateLimited) {
        setSaveStatuses((prev) => ({ ...prev, [questionId]: "error" }));
      } else {
        setSaveStatuses((prev) => ({ ...prev, [questionId]: "saved" }));
      }
    } catch (err: any) {
      console.error("Blur save error:", err);
      if (err.message && err.message.includes("Session invalidated")) {
        setSessionLocked(true);
      } else {
        setSaveStatuses((prev) => ({ ...prev, [questionId]: "error" }));
      }
    }
  };

  const handleFinalSubmit = async () => {
    if (sessionLocked || submitting) return;
    setSubmitting(true);

    // DEBOUNCE RACE PROTECTION: Check if there are any pending debounced saves
    const pendingQuestionIds = Object.keys(pendingTimeouts.current);
    for (const qId of pendingQuestionIds) {
      clearTimeout(pendingTimeouts.current[qId]);
      delete pendingTimeouts.current[qId];

      const text = pendingTextValues.current[qId] ?? textAnswers[qId] ?? "";
      delete pendingTextValues.current[qId];

      try {
        // Synchronously save the final text entry before final submission completes
        await submitQuizAnswerAction({
          attemptId,
          questionId: qId,
          textAnswer: text,
          activeSessionToken,
          defocusCount: telemetryRef.current.count,
          defocusDurationSeconds: telemetryRef.current.duration,
        });
      } catch (err) {
        console.error("Autosave race correction save error:", err);
      }
    }

    try {
      await finalizeQuizAttemptAction(attemptId, {
        defocusCount: telemetryRef.current.count,
        defocusDurationSeconds: telemetryRef.current.duration,
      }, activeSessionToken);
      
      router.push("/student/dashboard");
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Failed to submit quiz");
      if (err.message && err.message.includes("Session invalidated")) {
        setSessionLocked(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Session Lock Notification Banner */}
      {sessionLocked && (
        <div className="mb-6 p-5 bg-rose-950/80 border border-rose-800 rounded-2xl flex items-start space-x-3.5 text-rose-200">
          <ShieldAlert className="w-6 h-6 shrink-0 text-rose-400" />
          <div>
            <h3 className="font-bold text-sm">Attempt Session Invalidated</h3>
            <p className="text-xs text-rose-300 mt-1 leading-relaxed">
              This quiz attempt was opened in another window or browser tab. Input saving has been disabled for this tab to preserve data consistency. Please reload or continue in the newest window.
            </p>
          </div>
        </div>
      )}

      {/* Timer Expiry Warning */}
      {expired && (
        <div className="mb-6 p-4 bg-rose-950/40 border border-rose-800/50 rounded-xl text-rose-300 text-sm flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5" />
          <span>Time limit expired! Auto-submitting your quiz attempt...</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl mb-6 flex items-center justify-between sticky top-4 z-10 backdrop-blur-md">
        <div>
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-indigo-950 text-indigo-400 border border-indigo-800">
            {subjectCode}
          </span>
          <h1 className="text-xl font-bold text-slate-100 mt-1">{quizTitle}</h1>
        </div>

        <QuizTimer
          initialTimeLeftSeconds={initialTimeLeftSeconds}
          onTimeExpired={() => {
            setExpired(true);
            handleFinalSubmit();
          }}
        />
      </div>

      {/* Questions List */}
      <div className="space-y-6">
        {questions.map((q, idx) => {
          const status = saveStatuses[q.id] || "idle";

          return (
            <div key={q.id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3.5">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                    Question {idx + 1} of {questions.length} ({q.type})
                  </span>
                  
                  {/* Visual Autosave Status Indicators */}
                  {status === "saving" && (
                    <span className="text-[10px] text-indigo-400 animate-pulse flex items-center space-x-1">
                      <span>• Saving...</span>
                    </span>
                  )}
                  {status === "saved" && (
                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center space-x-1">
                      <span>✓ Saved</span>
                    </span>
                  )}
                  {status === "error" && (
                    <span className="text-[10px] text-rose-400 font-semibold flex items-center space-x-1">
                      <span>⚠ Save failed</span>
                    </span>
                  )}
                </div>
                <span className="text-xs font-mono text-amber-400 font-bold">{q.points} Pts</span>
              </div>

              <p className="text-base font-semibold text-slate-100 mb-4">{q.text}</p>

              {/* Options for MCQ / True False */}
              {q.options.length > 0 ? (
                <div className="space-y-2">
                  {q.options.map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex items-center space-x-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                        selectedAnswers[q.id] === opt.id
                          ? "bg-indigo-950/60 border-indigo-500/80 text-indigo-200 font-medium"
                          : "bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700"
                      } ${sessionLocked ? "pointer-events-none opacity-60" : ""}`}
                    >
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        value={opt.id}
                        disabled={sessionLocked || expired || submitting}
                        checked={selectedAnswers[q.id] === opt.id}
                        onChange={() => handleOptionChange(q.id, opt.id)}
                        className="accent-indigo-500"
                      />
                      <span className="text-sm">{opt.text}</span>
                    </label>
                  ))}
                </div>
              ) : (
                /* Short Answer Text Field */
                <div>
                  <textarea
                    rows={4}
                    value={textAnswers[q.id] || ""}
                    disabled={sessionLocked || expired || submitting}
                    onChange={(e) => handleTextChange(q.id, e.target.value)}
                    onBlur={() => handleTextBlur(q.id)}
                    placeholder="Type your answer here..."
                    className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm disabled:opacity-60 disabled:pointer-events-none transition-all"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit Button */}
      <div className="mt-8">
        <button
          onClick={handleFinalSubmit}
          disabled={submitting || sessionLocked}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center space-x-2 text-base disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CheckCircle className="w-5 h-5" />
          <span>{submitting ? "Finalizing Quiz..." : "Finish & Submit Quiz"}</span>
        </button>
      </div>
    </div>
  );
}
