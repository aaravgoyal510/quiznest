"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { LogOut, GraduationCap, BookOpen, LayoutDashboard, UserCheck, HelpCircle, FileText, Settings, ShieldCheck } from "lucide-react";

interface SidebarProps {
  role: "ADMIN" | "TEACHER" | "STUDENT";
  user: { name?: string | null; email?: string | null };
}

export function Sidebar({ role, user }: SidebarProps) {
  const adminLinks = [
    { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Manage Users", href: "/admin/users", icon: UserCheck },
    { label: "Manage Subjects", href: "/admin/subjects", icon: BookOpen },
    { label: "System Results", href: "/admin/results", icon: FileText },
    { label: "Audit Logs", href: "/admin/audit-log", icon: ShieldCheck },
  ];

  const teacherLinks = [
    { label: "Dashboard", href: "/teacher/dashboard", icon: LayoutDashboard },
    { label: "Question Bank", href: "/teacher/questions", icon: HelpCircle },
    { label: "Quizzes", href: "/teacher/quizzes", icon: BookOpen },
  ];

  const studentLinks = [
    { label: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
    { label: "Available Quizzes", href: "/student/dashboard", icon: BookOpen },
  ];

  const navLinks = role === "ADMIN" ? adminLinks : role === "TEACHER" ? teacherLinks : studentLinks;

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between h-screen sticky top-0">
      <div>
        <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
          <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/30">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-100 tracking-tight">Quiz Portal</h1>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold uppercase bg-indigo-950 text-indigo-400 border border-indigo-800">
              {role}
            </span>
          </div>
        </div>

        <nav className="p-4 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={`${link.label}-${link.href}`}
                href={link.href}
                className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-indigo-400 transition-colors font-medium text-sm"
              >
                <Icon className="w-4 h-4 text-slate-400" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-800 space-y-3">
        <Link
          href="/profile"
          className="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-indigo-400 transition-colors font-medium text-sm border border-slate-800 bg-slate-950/40"
        >
          <Settings className="w-4 h-4 text-slate-400" />
          <span>Profile Settings</span>
        </Link>

        <div className="px-3 py-2 bg-slate-850 rounded-lg border border-slate-800">
          <p className="text-sm font-semibold text-slate-200 truncate">{user?.name || "User"}</p>
          <p className="text-xs text-slate-400 truncate">{user?.email}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg bg-rose-950/40 text-rose-300 border border-rose-800/40 hover:bg-rose-900/50 transition-colors font-medium text-sm"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
