import { useState, useEffect } from "react";
import { Sidebar } from "../components/layout/Sidebar";
import { KeyRound, Lock, CheckCircle, AlertCircle, User } from "lucide-react";
import { apiFetch } from "../lib/api";

interface ProfileProps {
  navigate: (to: string) => void;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "TEACHER" | "STUDENT";
  department: string | null;
  year: string | null;
  avatarUrl: string | null;
}

export default function ProfilePage({ navigate }: ProfileProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  
  // Password change form states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem("quiz_auth_user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    } else {
      navigate("/login");
    }
  }, []);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await apiFetch("/api/profile/password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess("Password updated! Logging out of all devices in 3 seconds...");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");

        // Wait 3 seconds and execute session clear + redirect
        setTimeout(() => {
          localStorage.removeItem("quiz_auth_token");
          localStorage.removeItem("quiz_auth_user");
          navigate("/login");
        }, 3000);
      } else {
        setError(data.error || "Failed to change password.");
      }
    } catch (err) {
      setError("An unexpected network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <p className="animate-pulse">Loading profile settings...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Sidebar role={user.role} user={user} navigate={navigate} />

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
            <p className="text-slate-400 text-sm mt-1">Configure profile credentials and security passwords</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-950/40 border border-rose-800/50 rounded-xl text-rose-300 text-sm flex items-center space-x-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-950/40 border border-emerald-800/50 rounded-xl text-emerald-300 text-sm flex items-center space-x-2 animate-pulse">
            <CheckCircle className="w-4 h-4" />
            <span>{success}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User profile card */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col items-center justify-center text-center shadow-xl">
            <div className="p-4 bg-slate-950 rounded-full border-2 border-indigo-500/30 text-indigo-400 mb-4">
              <User className="w-16 h-16" />
            </div>
            <h2 className="text-xl font-bold text-slate-200">{user.name}</h2>
            <p className="text-sm text-slate-500 mt-1">{user.email}</p>
            <span className="mt-3 px-3 py-1 bg-indigo-950 text-indigo-400 border border-indigo-850 rounded-full text-xs font-semibold uppercase">
              {user.role}
            </span>

            {user.role === "STUDENT" && user.department && (
              <div className="mt-5 w-full pt-4 border-t border-slate-800 text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Department:</span>
                  <span className="text-slate-300 font-medium">{user.department}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Academic Year:</span>
                  <span className="text-slate-300 font-medium">{user.year || "N/A"}</span>
                </div>
              </div>
            )}
          </div>

          {/* Change password card */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
            <h2 className="text-lg font-bold text-slate-100 mb-5 flex items-center space-x-2">
              <KeyRound className="w-5 h-5 text-indigo-400" />
              <span>Change Security Password</span>
            </h2>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Current Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">New Password (Min 8 chars)</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Confirm New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-xl shadow-lg transition-all cursor-pointer text-sm"
              >
                {loading ? "Saving Changes..." : "Update Password"}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
