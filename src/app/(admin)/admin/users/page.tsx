import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Sidebar } from "@/components/layout/Sidebar";
import { createUserAction, deleteUserAction } from "../actions";
import { Trash2, UserPlus } from "lucide-react";

export default async function AdminUsersPage() {
  const admin = await requireRole(["ADMIN"]);
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar role="ADMIN" user={admin} />

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-100 tracking-tight">User Management</h1>
            <p className="text-slate-400 text-sm mt-1">Create and manage institutional Teachers and Students</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create User Form */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl h-fit">
            <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center space-x-2">
              <UserPlus className="w-5 h-5 text-indigo-400" />
              <span>Add New User</span>
            </h2>

            <form action={createUserAction} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Full Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Dr. Jane Smith"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="user@institution.edu"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Password</label>
                <input
                  type="password"
                  name="password"
                  required
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Role</label>
                <select
                  name="role"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500 text-sm"
                >
                  <option value="STUDENT">Student</option>
                  <option value="TEACHER">Teacher</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Department</label>
                  <input
                    type="text"
                    name="department"
                    placeholder="CSE, ECE"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Year</label>
                  <input
                    type="text"
                    name="year"
                    placeholder="3rd Year"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-sm transition-all"
              >
                Create Account
              </button>
            </form>
          </div>

          {/* User List Table */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-2xl overflow-hidden">
            <h2 className="text-lg font-bold text-slate-100 mb-4">All Accounts ({users.length})</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Name & Email</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Dept / Year</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-850/50">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200">{u.name}</div>
                        <div className="text-xs text-slate-400 font-mono">{u.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            u.role === "ADMIN"
                              ? "bg-purple-950 text-purple-400 border border-purple-800"
                              : u.role === "TEACHER"
                              ? "bg-indigo-950 text-indigo-400 border border-indigo-800"
                              : "bg-emerald-950 text-emerald-400 border border-emerald-800"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-400">
                        {u.department || "-"} {u.year ? `(${u.year})` : ""}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {u.id !== admin.id && (
                          <form action={async () => { "use server"; await deleteUserAction(u.id); }}>
                            <button
                              type="submit"
                              className="p-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 rounded-lg transition-colors"
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
