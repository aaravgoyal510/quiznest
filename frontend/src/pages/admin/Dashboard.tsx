import { useState, useEffect } from "react";
import { Sidebar } from "../../components/layout/Sidebar";
import { AlertCircle, Plus, Trash2, CheckCircle, ChevronLeft, ChevronRight, BookOpen, Unlock, Check, X, Lock } from "lucide-react";
import { apiFetch } from "../../lib/api";

interface DashboardProps {
  navigate: (to: string) => void;
  initialTab?: "users" | "subjects" | "audit" | "results" | "quizzes" | "unlock-requests";
}

interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "TEACHER" | "STUDENT";
  department: string | null;
  year: string | null;
  createdAt: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  createdBy: { name: string };
  createdAt: string;
}

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  details: string | null;
  createdAt: string;
  user: { name: string; email: string; role: string };
}

interface AdminQuiz {
  id: string;
  title: string;
  isPublished: boolean;
  adminUnlockedForEditing: boolean;
  createdAt: string;
  subject: { name: string; code: string };
  teacher: { id: string; name: string; email: string };
  _count: { attempts: number; questions: number };
}

interface UnlockRequest {
  id: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  quiz: { id: string; title: string; adminUnlockedForEditing: boolean };
  teacher: { id: string; name: string; email: string };
}

export default function AdminDashboard({ navigate, initialTab = "users" }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<"users" | "subjects" | "audit" | "results" | "quizzes" | "unlock-requests">(initialTab);
  
  const [users, setUsers] = useState<User[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [adminQuizzes, setAdminQuizzes] = useState<AdminQuiz[]>([]);
  const [unlockRequests, setUnlockRequests] = useState<UnlockRequest[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; role: "ADMIN" } | null>(null);

  // Modals
  const [showUserModal, setShowUserModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);

  // User form states
  const [uName, setUName] = useState("");
  const [uEmail, setUEmail] = useState("");
  const [uPassword, setUPassword] = useState("");
  const [uRole, setURole] = useState<"STUDENT" | "TEACHER" | "ADMIN">("STUDENT");
  const [uDept, setUDept] = useState("");
  const [uYear, setUYear] = useState("");

  // Subject form states
  const [sName, setSName] = useState("");
  const [sCode, setSCode] = useState("");
  const [sDesc, setSDesc] = useState("");

  useEffect(() => {
    const savedUser = localStorage.getItem("quiz_auth_user");
    if (savedUser) setCurrentUser(JSON.parse(savedUser));

    loadTabContent();
  }, [activeTab, currentPage]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  async function loadTabContent() {
    try {
      setLoading(true);
      setError("");
      
      if (activeTab === "users") {
        const res = await apiFetch("/api/admin/users");
        const data = await res.json();
        if (res.ok) setUsers(data.users || []);
      } else if (activeTab === "subjects") {
        const res = await apiFetch("/api/admin/subjects");
        const data = await res.json();
        if (res.ok) setSubjects(data.subjects || []);
      } else if (activeTab === "audit") {
        const res = await apiFetch(`/api/admin/audit-logs?page=${currentPage}&limit=15`);
        const data = await res.json();
        if (res.ok) {
          setAuditLogs(data.logs || []);
          setTotalPages(data.pagination.totalPages || 1);
        }
      } else if (activeTab === "results") {
        const res = await apiFetch("/api/admin/results");
        const data = await res.json();
        if (res.ok) {
          setAttempts(data.attempts || []);
        }
      } else if (activeTab === "quizzes") {
        const res = await apiFetch("/api/admin/quizzes");
        const data = await res.json();
        if (res.ok) setAdminQuizzes(data.quizzes || []);
      } else if (activeTab === "unlock-requests") {
        const res = await apiFetch("/api/admin/unlock-requests");
        const data = await res.json();
        if (res.ok) setUnlockRequests(data.requests || []);
      }
    } catch (err) {
      setError("Failed to load administration catalog records.");
    } finally {
      setLoading(false);
    }
  }

  // --- CRUD User actions ---
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const res = await apiFetch("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          name: uName,
          email: uEmail,
          password: uPassword,
          role: uRole,
          department: uDept || null,
          year: uYear || null,
        }),
      });

      if (res.ok) {
        setSuccess("User account created successfully.");
        setShowUserModal(false);
        setUName("");
        setUEmail("");
        setUPassword("");
        setUDept("");
        setUYear("");
        loadTabContent();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create user.");
      }
    } catch (err) {
      setError("Failed to register user.");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? All their history (quiz attempts, questions created, quizzes) will be deleted.")) return;
    try {
      const res = await apiFetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      if (res.ok) {
        loadTabContent();
      } else {
        const data = await res.json();
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to delete user.");
    }
  };

  // --- CRUD Subject actions ---
  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const res = await apiFetch("/api/admin/subjects", {
        method: "POST",
        body: JSON.stringify({
          name: sName,
          code: sCode,
          description: sDesc || null,
        }),
      });

      if (res.ok) {
        setSuccess("Subject course created successfully.");
        setShowSubjectModal(false);
        setSName("");
        setSCode("");
        setSDesc("");
        loadTabContent();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create subject.");
      }
    } catch (err) {
      setError("Failed to register subject.");
    }
  };

  const handleDeleteSubject = async (subjectId: string) => {
    if (!confirm("Delete this subject? This deletes all associated quizzes and questions.")) return;
    try {
      const res = await apiFetch(`/api/admin/subjects/${subjectId}`, { method: "DELETE" });
      if (res.ok) {
        loadTabContent();
      } else {
        const data = await res.json();
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to delete subject.");
    }
  };

  const handleUnlockQuiz = async (quizId: string) => {
    setError("");
    setSuccess("");
    try {
      const res = await apiFetch(`/api/admin/quizzes/${quizId}/unlock`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSuccess(`Successfully unlocked quiz "${data.quiz.title}" for editing.`);
        loadTabContent();
      } else {
        setError(data.error || "Failed to unlock quiz.");
      }
    } catch (err) {
      setError("Network error. Failed to unlock quiz.");
    }
  };

  const handleRelockQuiz = async (quizId: string) => {
    setError("");
    setSuccess("");
    try {
      const res = await apiFetch(`/api/admin/quizzes/${quizId}/relock`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSuccess(`Successfully re-locked quiz "${data.quiz.title}" to block edits.`);
        loadTabContent();
      } else {
        setError(data.error || "Failed to re-lock quiz.");
      }
    } catch (err) {
      setError("Network error. Failed to re-lock quiz.");
    }
  };

  const handleApproveUnlockRequest = async (requestId: string) => {
    setError(""); setSuccess("");
    try {
      const res = await apiFetch(`/api/admin/unlock-requests/${requestId}/approve`, { method: "POST" });
      if (res.ok) {
        setSuccess("Unlock request approved. Quiz is now unlocked for editing.");
        loadTabContent();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to approve request.");
      }
    } catch { setError("Network error."); }
  };

  const handleRejectUnlockRequest = async (requestId: string) => {
    setError(""); setSuccess("");
    try {
      const res = await apiFetch(`/api/admin/unlock-requests/${requestId}/reject`, { method: "POST" });
      if (res.ok) {
        setSuccess("Unlock request rejected.");
        loadTabContent();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to reject request.");
      }
    } catch { setError("Network error."); }
  };

  if (loading && users.length === 0 && subjects.length === 0 && auditLogs.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <p className="animate-pulse">Loading administration console...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-950 text-slate-100 font-sans">
      {currentUser && <Sidebar role="ADMIN" user={currentUser} navigate={navigate} />}

      <main className="flex-1 p-8 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Console</h1>
            <p className="text-slate-400 text-sm mt-1">Manage global system directories, roles, and audit compliance logs</p>
          </div>
          <div className="flex space-x-3">
            {activeTab === "users" && (
              <button
                onClick={() => setShowUserModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl shadow-lg flex items-center space-x-2 text-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Account</span>
              </button>
            )}
            {activeTab === "subjects" && (
              <button
                onClick={() => setShowSubjectModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl shadow-lg flex items-center space-x-2 text-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Course</span>
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-950/40 border border-rose-800/50 rounded-xl text-rose-300 text-sm flex items-center space-x-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-950/40 border border-emerald-800/50 rounded-xl text-emerald-300 text-sm flex items-center space-x-2">
            <CheckCircle className="w-4 h-4" />
            <span>{success}</span>
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 mb-6">
          <button
            onClick={() => { setActiveTab("users"); setCurrentPage(1); }}
            className={`px-5 py-3 font-semibold text-sm transition-colors border-b-2 cursor-pointer ${
              activeTab === "users" ? "border-indigo-500 text-indigo-400 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            User Directory
          </button>
          <button
            onClick={() => { setActiveTab("subjects"); setCurrentPage(1); }}
            className={`px-5 py-3 font-semibold text-sm transition-colors border-b-2 cursor-pointer ${
              activeTab === "subjects" ? "border-indigo-500 text-indigo-400 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Course Subjects
          </button>
          <button
            onClick={() => { setActiveTab("results"); setCurrentPage(1); }}
            className={`px-5 py-3 font-semibold text-sm transition-colors border-b-2 cursor-pointer ${
              activeTab === "results" ? "border-indigo-500 text-indigo-400 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            System Results
          </button>
          <button
            onClick={() => { setActiveTab("audit"); setCurrentPage(1); }}
            className={`px-5 py-3 font-semibold text-sm transition-colors border-b-2 cursor-pointer ${
              activeTab === "audit" ? "border-indigo-500 text-indigo-400 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            System Audit Trail
          </button>
          <button
            onClick={() => { setActiveTab("quizzes"); setCurrentPage(1); }}
            className={`px-5 py-3 font-semibold text-sm transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === "quizzes" ? "border-indigo-500 text-indigo-400 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            All Quizzes
          </button>
          <button
            onClick={() => { setActiveTab("unlock-requests"); setCurrentPage(1); }}
            className={`px-5 py-3 font-semibold text-sm transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === "unlock-requests" ? "border-amber-500 text-amber-400 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Unlock className="w-3.5 h-3.5" />
            Unlock Requests
            {unlockRequests.filter((r) => r.status === "PENDING").length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-amber-600 text-white rounded-full">
                {unlockRequests.filter((r) => r.status === "PENDING").length}
              </span>
            )}
          </button>
        </div>

        {/* Tab content 1: Users */}
        {activeTab === "users" && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Dept / Year</th>
                    <th className="py-3 px-4">Created At</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-950/40">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-200">{u.name}</p>
                        <p className="text-[10px] text-slate-500">{u.email}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          u.role === "ADMIN" ? "bg-purple-950 text-purple-400 border border-purple-900" :
                          u.role === "TEACHER" ? "bg-amber-950 text-amber-400 border border-amber-900" :
                          "bg-indigo-950 text-indigo-400 border border-indigo-900"
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {u.department ? `${u.department} ${u.year ? `(${u.year})` : ""}` : "N/A"}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1.5 hover:bg-rose-950/40 text-slate-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab content 2: Subjects */}
        {activeTab === "subjects" && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Course Code</th>
                    <th className="py-3 px-4">Course Name</th>
                    <th className="py-3 px-4">Registered By</th>
                    <th className="py-3 px-4">Created At</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {subjects.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-950/40">
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-400">{s.code}</td>
                      <td className="py-3.5 px-4 text-slate-200 font-semibold">{s.name}</td>
                      <td className="py-3.5 px-4 text-slate-400">{s.createdBy.name}</td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono">{new Date(s.createdAt).toLocaleDateString()}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDeleteSubject(s.id)}
                          className="p-1.5 hover:bg-rose-950/40 text-slate-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab content 3: Audit Trails */}
        {activeTab === "audit" && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {auditLogs.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-950/40">
                        <td className="py-3 px-4 text-slate-500 font-mono">{new Date(l.createdAt).toLocaleString()}</td>
                        <td className="py-3 px-4 font-bold text-slate-300">{l.user.name}</td>
                        <td className="py-3 px-4">
                          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                            {l.user.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-indigo-400 font-mono font-semibold">{l.action}</td>
                        <td className="py-3 px-4 text-slate-400">{l.details || "N/A"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 text-xs">
                <span className="text-slate-500">Page {currentPage} of {totalPages}</span>
                <div className="flex space-x-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    className="p-2 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    className="p-2 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab content 4: System Results */}
        {activeTab === "results" && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Subject & Quiz</th>
                    <th className="py-3 px-4">Time Started</th>
                    <th className="py-3 px-4">Time Submitted</th>
                    <th className="py-3 px-4 text-right">Score</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Quiz Lock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {attempts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 font-medium">
                        No completed quiz results found in system database.
                      </td>
                    </tr>
                  ) : (
                    attempts.map((att) => (
                      <tr key={att.id} className="hover:bg-slate-950/40">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-200">{att.student.name}</p>
                          <p className="text-[10px] text-slate-500">{att.student.email}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-900 mr-2">
                            {att.quiz.subject.code}
                          </span>
                          <span className="text-slate-300 font-medium">{att.quiz.title}</span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 font-mono">
                          {new Date(att.startedAt).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 font-mono">
                          {att.submittedAt ? new Date(att.submittedAt).toLocaleString() : "Active Attempt"}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="text-sm font-extrabold text-indigo-400">
                            {att.score !== null ? `${att.score} Pts` : "Grading..."}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {att.needsReview ? (
                            <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-rose-950/60 text-rose-400 border border-rose-800/40">
                              Needs Review
                            </span>
                          ) : (
                            <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-950 text-slate-500 border border-slate-850">
                              Verified
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {att.quiz.adminUnlockedForEditing ? (
                            <div className="flex items-center justify-end space-x-2">
                              <span className="text-[10px] text-amber-500 font-semibold">Unlocked</span>
                              <button
                                onClick={() => handleRelockQuiz(att.quiz.id)}
                                className="px-2.5 py-1 bg-rose-950 hover:bg-rose-900 border border-rose-900/60 text-rose-300 text-[10px] font-semibold rounded-lg transition-colors cursor-pointer"
                              >
                                Re-lock
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end space-x-2">
                              <span className="text-[10px] text-slate-500">Locked</span>
                              <button
                                onClick={() => handleUnlockQuiz(att.quiz.id)}
                                className="px-2.5 py-1 bg-slate-950 hover:bg-indigo-950 hover:border-indigo-900 text-indigo-400 border border-slate-800 text-[10px] font-semibold rounded-lg transition-colors cursor-pointer"
                              >
                                Unlock
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- MODAL: CREATE USER --- */}
        {showUserModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 text-slate-100 shadow-2xl">
              <h2 className="text-xl font-bold mb-4">Add User Account</h2>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Name</label>
                    <input
                      type="text" required value={uName} onChange={(e) => setUName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Role</label>
                    <select
                      value={uRole} onChange={(e) => setURole(e.target.value as any)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                    >
                      <option value="STUDENT">STUDENT</option>
                      <option value="TEACHER">TEACHER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Email Address</label>
                  <input
                    type="email" required value={uEmail} onChange={(e) => setUEmail(e.target.value)}
                    placeholder="user@institution.edu"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Password</label>
                  <input
                    type="password" required value={uPassword} onChange={(e) => setUPassword(e.target.value)}
                    placeholder="Password123!"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {uRole === "STUDENT" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Department</label>
                      <input
                        type="text" value={uDept} onChange={(e) => setUDept(e.target.value)}
                        placeholder="CSE"
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Year</label>
                      <input
                        type="text" value={uYear} onChange={(e) => setUYear(e.target.value)}
                        placeholder="3rd Year"
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <div className="flex space-x-2 justify-end pt-3">
                  <button
                    type="button" onClick={() => setShowUserModal(false)}
                    className="px-4 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-sm font-medium rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl cursor-pointer"
                  >
                    Create User
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- MODAL: CREATE SUBJECT --- */}
        {showSubjectModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 text-slate-100 shadow-2xl">
              <h2 className="text-xl font-bold mb-4">Add Course Subject</h2>
              <form onSubmit={handleCreateSubject} className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Code</label>
                    <input
                      type="text" required value={sCode} onChange={(e) => setSCode(e.target.value)}
                      placeholder="CS301"
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Subject Name</label>
                    <input
                      type="text" required value={sName} onChange={(e) => setSName(e.target.value)}
                      placeholder="Database Systems"
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Description</label>
                  <textarea
                    rows={3} value={sDesc} onChange={(e) => setSDesc(e.target.value)}
                    placeholder="Short summary of course topics..."
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none"
                  />
                </div>

                <div className="flex space-x-2 justify-end pt-3">
                  <button
                    type="button" onClick={() => setShowSubjectModal(false)}
                    className="px-4 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-sm font-medium rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl cursor-pointer"
                  >
                    Create Course
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Tab content 5: All Quizzes */}
        {activeTab === "quizzes" && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Quiz</th>
                    <th className="py-3 px-4">Teacher</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Attempts</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Lock Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {adminQuizzes.map((quiz) => (
                    <tr key={quiz.id} className="hover:bg-slate-950/40">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-200 truncate max-w-[200px]">{quiz.title}</p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {new Date(quiz.createdAt).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-300">{quiz.teacher.name}</p>
                        <p className="text-[10px] text-slate-500">{quiz.teacher.email}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-900">
                          {quiz.subject.code}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {quiz._count.attempts}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border w-fit ${
                            quiz.isPublished
                              ? "bg-emerald-950/50 text-emerald-400 border-emerald-800/40"
                              : "bg-slate-950 text-slate-500 border-slate-800"
                          }`}>
                            {quiz.isPublished ? "Published" : "Draft"}
                          </span>
                          {quiz.adminUnlockedForEditing && (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-950/50 text-amber-400 border border-amber-800/40 w-fit animate-pulse">
                              Unlocked
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {quiz.adminUnlockedForEditing ? (
                          <button
                            onClick={() => handleRelockQuiz(quiz.id)}
                            className="flex items-center gap-1 ml-auto px-2.5 py-1.5 bg-rose-950/40 hover:bg-rose-950 text-rose-400 border border-rose-800/40 rounded-lg text-[10px] font-semibold cursor-pointer transition-colors"
                          >
                            <Lock className="w-3 h-3" /> Re-lock
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUnlockQuiz(quiz.id)}
                            disabled={quiz._count.attempts === 0}
                            className="flex items-center gap-1 ml-auto px-2.5 py-1.5 bg-indigo-950/40 hover:bg-indigo-950 disabled:opacity-40 disabled:cursor-not-allowed text-indigo-400 border border-indigo-800/40 rounded-lg text-[10px] font-semibold cursor-pointer transition-colors"
                            title={quiz._count.attempts === 0 ? "No attempts — lock not needed" : "Unlock for editing"}
                          >
                            <Unlock className="w-3 h-3" /> Unlock
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {adminQuizzes.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">No quizzes found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab content 6: Unlock Requests */}
        {activeTab === "unlock-requests" && (
          <div className="space-y-4">
            {unlockRequests.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
                <Unlock className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No unlock requests found.</p>
              </div>
            ) : (
              unlockRequests.map((req) => (
                <div
                  key={req.id}
                  className={`bg-slate-900 border rounded-xl p-5 ${
                    req.status === "PENDING"
                      ? "border-amber-700/40"
                      : req.status === "APPROVED"
                      ? "border-emerald-700/30"
                      : "border-slate-800"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          req.status === "PENDING"
                            ? "bg-amber-950/50 text-amber-400 border-amber-700/40"
                            : req.status === "APPROVED"
                            ? "bg-emerald-950/50 text-emerald-400 border-emerald-700/40"
                            : "bg-slate-950 text-slate-500 border-slate-700"
                        }`}>
                          {req.status}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {new Date(req.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-100 truncate">{req.quiz.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Teacher: <span className="text-slate-300">{req.teacher.name}</span>{" "}
                        <span className="text-slate-500">({req.teacher.email})</span>
                      </p>
                      <div className="mt-2 p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg">
                        <p className="text-[10px] font-semibold text-slate-500 uppercase mb-1">Reason</p>
                        <p className="text-sm text-slate-300">{req.reason}</p>
                      </div>
                    </div>
                    {req.status === "PENDING" && (
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleApproveUnlockRequest(req.id)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-xl cursor-pointer transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => handleRejectUnlockRequest(req.id)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-rose-900/40 hover:bg-rose-900 text-rose-300 border border-rose-800/40 text-xs font-semibold rounded-xl cursor-pointer transition-colors"
                        >
                          <X className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </main>
    </div>
  );
}
