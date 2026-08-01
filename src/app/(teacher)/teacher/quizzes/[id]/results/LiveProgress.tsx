"use client";

import { useEffect, useState } from "react";
import { Users, RefreshCw, Activity } from "lucide-react";

interface ActiveAttempt {
  id: string;
  startedAt: string;
  answersCount: number;
  student: {
    name: string;
    email: string;
  };
}

interface LiveProgressProps {
  quizId: string;
  totalQuestions: number;
}

export default function LiveProgress({ quizId, totalQuestions }: LiveProgressProps) {
  const [activeAttempts, setActiveAttempts] = useState<ActiveAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);

  const fetchProgress = async () => {
    setPolling(true);
    try {
      const res = await fetch(`/api/teacher/quizzes/${quizId}/progress`);
      const data = await res.json();
      if (data.activeAttempts) {
        setActiveAttempts(data.activeAttempts);
      }
    } catch (err) {
      console.error("Failed to fetch live progress:", err);
    } finally {
      setLoading(false);
      setPolling(false);
    }
  };

  useEffect(() => {
    fetchProgress();
    const interval = setInterval(fetchProgress, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, [quizId]);

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl mb-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Activity className="w-5 h-5 text-indigo-400 animate-pulse" />
          <h2 className="text-lg font-bold text-slate-100">Live Active Monitoring</h2>
          <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-indigo-950 text-indigo-400 border border-indigo-800">
            {activeAttempts.length} Active
          </span>
        </div>
        <button
          onClick={fetchProgress}
          disabled={polling}
          className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 rounded-xl transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${polling ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Loading real-time status...</p>
      ) : activeAttempts.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-slate-800 rounded-xl">
          <Users className="w-10 h-10 text-slate-700 mx-auto mb-2" />
          <p className="text-slate-400 text-xs font-medium">No students are currently taking this quiz.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeAttempts.map((attempt) => {
            const percent = Math.min(100, Math.round((attempt.answersCount / totalQuestions) * 100));

            return (
              <div key={attempt.id} className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-200">{attempt.student.name}</h4>
                    <p className="text-xs text-slate-500">{attempt.student.email}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950/50 border border-indigo-900/60 px-2.5 py-1 rounded">
                      {attempt.answersCount} / {totalQuestions} Qs
                    </span>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Started: {new Date(attempt.startedAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-850">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
