"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { resetPasswordAction } from "../forgot-password/actions";
import { GraduationCap, Lock, AlertCircle, CheckCircle } from "lucide-react";
import Link from "next/link";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!token) {
      setError("Reset token is missing in the URL.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await resetPasswordAction(token, password);
      if (res.success) {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || "Invalid or expired reset token.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col items-center mb-8 relative">
        <div className="p-3 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-2xl mb-4">
          <GraduationCap className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Reset Password</h1>
        <p className="text-slate-400 text-xs text-center mt-1">
          Set your new account password. This will log out all other active sessions.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-950/40 border border-rose-800/50 rounded-2xl flex items-start space-x-3 text-rose-300 text-xs">
          <AlertCircle className="w-4.5 h-4.5 shrink-0 text-rose-400 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success ? (
        <div className="text-center py-6 relative">
          <div className="inline-flex p-3 bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 rounded-full mb-4">
            <CheckCircle className="w-8 h-8 animate-bounce" />
          </div>
          <h3 className="text-lg font-bold text-slate-100">Password Changed</h3>
          <p className="text-slate-400 text-xs mt-2 leading-relaxed">
            Your password was updated successfully. You can now log back in with your new credentials.
          </p>
          <div className="mt-8 pt-4 border-t border-slate-800">
            <Link
              href="/login"
              className="inline-flex w-full justify-center py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-xl shadow-indigo-600/20 transition-all text-sm"
            >
              Sign In Now
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5 relative">
          <div>
            <label htmlFor="pass" className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              New Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                id="pass"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-slate-100 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder-slate-600 disabled:opacity-50 transition-all"
              />
            </div>
          </div>

          <div>
            <label htmlFor="confirm" className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Confirm Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                id="confirm"
                type="password"
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-slate-100 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder-slate-600 disabled:opacity-50 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center space-x-2 text-sm disabled:opacity-50"
          >
            <span>{loading ? "Resetting..." : "Reset Password"}</span>
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-slate-400 text-sm">Loading validation parameters...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
