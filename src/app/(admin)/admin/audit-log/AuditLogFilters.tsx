"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search, RotateCcw, Filter } from "lucide-react";

interface UserOption {
  id: string;
  name: string;
  email: string;
}

interface AuditLogFiltersProps {
  users: UserOption[];
}

export default function AuditLogFilters({ users }: AuditLogFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [userId, setUserId] = useState(searchParams.get("userId") || "");
  const [action, setAction] = useState(searchParams.get("action") || "");
  const [entityType, setEntityType] = useState(searchParams.get("entityType") || "");
  const [startDate, setStartDate] = useState(searchParams.get("startDate") || "");
  const [endDate, setEndDate] = useState(searchParams.get("endDate") || "");

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (userId) params.set("userId", userId);
    if (action) params.set("action", action);
    if (entityType) params.set("entityType", entityType);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);

    router.push(`/admin/audit-log?${params.toString()}`);
  };

  const handleReset = () => {
    setUserId("");
    setAction("");
    setEntityType("");
    setStartDate("");
    setEndDate("");
    router.push("/admin/audit-log");
  };

  return (
    <form onSubmit={handleApply} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl mb-8 space-y-4">
      <div className="flex items-center space-x-2 pb-3 border-b border-slate-800/60 mb-2 text-slate-100 font-bold text-sm">
        <Filter className="w-4 h-4 text-indigo-400" />
        <span>Filter Logs</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* User Select */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">User</label>
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email})
              </option>
            ))}
          </select>
        </div>

        {/* Action Input */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Action Code</label>
          <input
            type="text"
            placeholder="e.g. CREATE_USER"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Entity Type Select */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Entity Type</label>
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Entities</option>
            <option value="USER">USER</option>
            <option value="SUBJECT">SUBJECT</option>
            <option value="QUIZ">QUIZ</option>
            <option value="QUESTION">QUESTION</option>
            <option value="ANSWER">ANSWER</option>
            <option value="GENERAL">GENERAL</option>
          </select>
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-indigo-500 font-sans"
          />
        </div>

        {/* End Date */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-indigo-500 font-sans"
          />
        </div>
      </div>

      <div className="flex items-center justify-end space-x-3 pt-2">
        <button
          type="button"
          onClick={handleReset}
          className="px-3.5 py-2 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-350 border border-slate-800 rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Filters</span>
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-lg shadow-indigo-600/20 transition-all"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Apply Filters</span>
        </button>
      </div>
    </form>
  );
}
