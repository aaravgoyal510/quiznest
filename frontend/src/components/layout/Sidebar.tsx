import { useState } from "react";
import { LogOut, GraduationCap, BookOpen, LayoutDashboard, UserCheck, FileText, Settings, ShieldCheck, Menu, X, Unlock } from "lucide-react";

interface SidebarProps {
  role: "ADMIN" | "TEACHER" | "STUDENT";
  user: { name?: string | null; email?: string | null };
  navigate: (to: string) => void;
}

export function Sidebar({ role, user, navigate }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const adminLinks = [
    { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Manage Users", href: "/admin/users", icon: UserCheck },
    { label: "Manage Subjects", href: "/admin/subjects", icon: BookOpen },
    { label: "All Quizzes", href: "/admin/quizzes", icon: BookOpen },
    { label: "Unlock Requests", href: "/admin/unlock-requests", icon: Unlock },
    { label: "System Results", href: "/admin/results", icon: FileText },
    { label: "Audit Logs", href: "/admin/audit-log", icon: ShieldCheck },
  ];

  const teacherLinks = [
    { label: "Dashboard", href: "/teacher/dashboard", icon: LayoutDashboard },
  ];

  const studentLinks = [
    { label: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
    { label: "Available Quizzes", href: "/student/dashboard", icon: BookOpen },
  ];

  const navLinks = role === "ADMIN" ? adminLinks : role === "TEACHER" ? teacherLinks : studentLinks;

  const handleSignOut = () => {
    localStorage.removeItem("quiz_auth_token");
    localStorage.removeItem("quiz_auth_user");
    navigate("/login");
  };

  return (
    <>
      {/* Mobile Top Navigation Bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 sticky top-0 z-30 w-full flex-shrink-0">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/30">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-sm text-slate-100 tracking-tight block">Quiz Nest</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold uppercase bg-indigo-950 text-indigo-400 border border-indigo-800 leading-none">
              {role}
            </span>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 bg-slate-850 hover:bg-slate-800 text-slate-200 rounded-xl border border-slate-800 transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer Menu Container */}
          <aside className="relative w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between h-full text-slate-300 z-10 animate-in slide-in-from-left duration-200">
            <div>
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/30">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div>
                    <h1 className="font-bold text-base text-slate-100 tracking-tight">Quiz Nest</h1>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase bg-indigo-950 text-indigo-400 border border-indigo-800">
                      {role}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="p-4 space-y-1">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <button
                      key={`${link.label}-${link.href}`}
                      onClick={() => {
                        setIsOpen(false);
                        navigate(link.href);
                      }}
                      className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-indigo-400 transition-colors font-medium text-sm text-left cursor-pointer"
                    >
                      <Icon className="w-4 h-4 text-slate-400" />
                      <span>{link.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="p-4 border-t border-slate-800 space-y-3">
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate("/profile");
                }}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-indigo-400 transition-colors font-medium text-sm border border-slate-800 bg-slate-950/40 text-left cursor-pointer"
              >
                <Settings className="w-4 h-4 text-slate-400" />
                <span>Profile Settings</span>
              </button>

              <div className="px-3 py-2 bg-slate-950/50 rounded-lg border border-slate-800">
                <p className="text-sm font-semibold text-slate-200 truncate">{user?.name || "User"}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg bg-rose-950/40 text-rose-300 border border-rose-800/40 hover:bg-rose-900/50 transition-colors font-medium text-sm cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Sticky Sidebar */}
      <aside className="hidden md:flex w-64 bg-slate-900 border-r border-slate-800 flex-col justify-between h-screen sticky top-0 text-slate-300 flex-shrink-0">
        <div>
          <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/30">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-100 tracking-tight">Quiz Nest</h1>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold uppercase bg-indigo-950 text-indigo-400 border border-indigo-800">
                {role}
              </span>
            </div>
          </div>

          <nav className="p-4 space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <button
                  key={`${link.label}-${link.href}`}
                  onClick={() => navigate(link.href)}
                  className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-indigo-400 transition-colors font-medium text-sm text-left cursor-pointer"
                >
                  <Icon className="w-4 h-4 text-slate-400" />
                  <span>{link.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800 space-y-3">
          <button
            onClick={() => navigate("/profile")}
            className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-indigo-400 transition-colors font-medium text-sm border border-slate-800 bg-slate-950/40 text-left cursor-pointer"
          >
            <Settings className="w-4 h-4 text-slate-400" />
            <span>Profile Settings</span>
          </button>

          <div className="px-3 py-2 bg-slate-950/50 rounded-lg border border-slate-800">
            <p className="text-sm font-semibold text-slate-200 truncate">{user?.name || "User"}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg bg-rose-950/40 text-rose-300 border border-rose-800/40 hover:bg-rose-900/50 transition-colors font-medium text-sm cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
