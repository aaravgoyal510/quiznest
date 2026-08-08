import { useState } from "react";
import { apiFetch } from "../../lib/api";
import { AlertCircle, CheckCircle2, Unlock, XCircle } from "lucide-react";

interface UnlockRequestModalProps {
  quizId: string;
  quizTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function UnlockRequestModal({
  quizId,
  quizTitle,
  onClose,
  onSuccess,
}: UnlockRequestModalProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) { setError("Please provide a reason for the unlock request."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch(`/api/teacher/quizzes/${quizId}/unlock-request`, {
        method: "POST",
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setDone(true);
        onSuccess();
      } else {
        setError(data.error || "Failed to submit unlock request.");
      }
    } catch {
      setError("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
              <Unlock className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Request Quiz Unlock</h2>
              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[240px]">{quizTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          {done ? (
            <div className="flex flex-col items-center py-6 gap-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-400" />
              <p className="text-slate-200 font-semibold text-center">Request submitted!</p>
              <p className="text-slate-400 text-sm text-center">
                The admin will review your request and unlock the quiz if approved.
              </p>
              <button
                onClick={onClose}
                className="mt-2 px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm rounded-xl border border-slate-700 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-3 bg-amber-950/30 border border-amber-700/30 rounded-lg">
                <p className="text-xs text-amber-300">
                  This quiz has submitted attempts and is currently locked. The admin must approve
                  this request before you can make edits.
                </p>
              </div>

              {error && (
                <div className="p-3 bg-rose-950/40 border border-rose-800/40 rounded-lg text-rose-300 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Reason for unlock <span className="text-rose-400">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  placeholder="Describe what needs to be corrected and why (e.g. typo in correct answer for Q3)…"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 resize-none"
                />
                <p className="text-xs text-slate-500 mt-1">{reason.length}/500 characters</p>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl border border-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || reason.trim().length === 0}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors cursor-pointer"
                >
                  {loading ? "Submitting…" : "Submit Request"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
