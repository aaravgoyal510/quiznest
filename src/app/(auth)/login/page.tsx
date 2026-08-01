"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, LogIn, Lock, Mail, AlertCircle } from "lucide-react";
import Link from "next/link";
import { loginAction } from "./actions";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("student@institution.edu");
  const [password, setPassword] = useState("Student123!");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await loginAction(email, password);
      if (res?.error) {
        setError(res.error);
      }
    } catch (err: any) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950">
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 p-8 rounded-2xl shadow-2xl backdrop-blur-md">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30 mb-3">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100 tracking-tight">Portal Sign In</h2>
          <p className="text-sm text-slate-400 mt-1">Institutional Online Quiz System</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-950/40 border border-rose-800/50 rounded-xl text-rose-300 text-sm flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@institution.edu"
                autoComplete="email"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/20 transition-all duration-200 flex items-center justify-center space-x-2 text-sm disabled:opacity-50"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-400 mb-2">Click to Quick-Fill Demo Credentials:</p>
          <div className="space-y-1 text-xs">
            <button
              type="button"
              onClick={() => handleDemoFill("admin@institution.edu", "Admin123!")}
              className="w-full py-1.5 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 text-left flex justify-between font-mono"
            >
              <span>Admin</span>
              <span className="text-indigo-400">admin@institution.edu</span>
            </button>

            <button
              type="button"
              onClick={() => handleDemoFill("teacher@institution.edu", "Teacher123!")}
              className="w-full py-1.5 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 text-left flex justify-between font-mono"
            >
              <span>Teacher</span>
              <span className="text-indigo-400">teacher@institution.edu</span>
            </button>

            <button
              type="button"
              onClick={() => handleDemoFill("student@institution.edu", "Student123!")}
              className="w-full py-1.5 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 text-left flex justify-between font-mono"
            >
              <span>Student</span>
              <span className="text-indigo-400">student@institution.edu</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
