import { useState } from "react";
import { GraduationCap, LogIn, Lock, Mail, AlertCircle } from "lucide-react";
import { API_URL } from "../lib/api";

interface LoginProps {
  navigate: (to: string) => void;
}

export default function LoginPage({ navigate }: LoginProps) {
  const [email, setEmail] = useState("student@institution.edu");
  const [password, setPassword] = useState("Student123!");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Authentication failed.");
      } else {
        // Save stateless JWT token and user info to localStorage
        localStorage.setItem("quiz_auth_token", data.token);
        localStorage.setItem("quiz_auth_user", JSON.stringify(data.user));
        
        // Navigate client-side based on user role
        if (data.user.role === "ADMIN") {
          navigate("/admin/dashboard");
        } else if (data.user.role === "TEACHER") {
          navigate("/teacher/dashboard");
        } else {
          navigate("/student/dashboard");
        }
      }
    } catch (err: any) {
      setError("Cannot reach auth server. Please verify the API connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950 font-sans text-slate-100">
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 p-8 rounded-2xl shadow-2xl backdrop-blur-md">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30 mb-3">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Portal Sign In</h2>
          <p className="text-sm text-slate-400 mt-1">Split-Architecture Decoupled Frontend SPA</p>
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
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
              />
            </div>
            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
              >
                Forgot Password?
              </button>
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

        {/* Demo Accounts Panel */}
        <div className="mt-8 pt-6 border-t border-slate-800">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 text-center">
            Demo Credentials
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleDemoFill("student@institution.edu", "Student123!")}
              className="py-2 px-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg text-[10px] font-medium text-slate-300 transition-colors"
            >
              Student Profile
            </button>
            <button
              onClick={() => handleDemoFill("teacher@institution.edu", "Teacher123!")}
              className="py-2 px-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg text-[10px] font-medium text-slate-300 transition-colors"
            >
              Teacher Profile
            </button>
            <button
              onClick={() => handleDemoFill("admin@institution.edu", "Admin123!")}
              className="py-2 px-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg text-[10px] font-medium text-slate-300 transition-colors"
            >
              Admin Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
