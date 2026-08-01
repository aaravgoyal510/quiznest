import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Sidebar } from "@/components/layout/Sidebar";
import { ShieldCheck } from "lucide-react";
import AuditLogFilters from "./AuditLogFilters";

interface AuditLogPageProps {
  searchParams: Promise<{
    userId?: string;
    action?: string;
    entityType?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function AdminAuditLogPage({ searchParams }: AuditLogPageProps) {
  const admin = await requireRole(["ADMIN"]);
  const params = await searchParams;

  const where: any = {};

  if (params.userId) {
    where.userId = params.userId;
  }
  if (params.action) {
    where.action = { contains: params.action, mode: "insensitive" };
  }
  if (params.entityType) {
    where.entityType = params.entityType;
  }
  if (params.startDate || params.endDate) {
    where.createdAt = {};
    if (params.startDate) {
      where.createdAt.gte = new Date(params.startDate);
    }
    if (params.endDate) {
      const end = new Date(params.endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  // Load distinct users and filtered audit logs
  const [users, auditLogs] = await Promise.all([
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { user: true },
    }),
  ]);

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar role="ADMIN" user={admin} />

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-100 tracking-tight">System Audit Log</h1>
            <p className="text-slate-400 text-sm mt-1">Traceability and history of question creation, edits, and administrative actions</p>
          </div>
        </div>

        {/* Filters Panel */}
        <AuditLogFilters users={users} />

        {/* Audit Log Table list */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-800 flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-slate-100">Audit Trail ({auditLogs.length})</h2>
          </div>

          <div className="divide-y divide-slate-800/80">
            {auditLogs.length === 0 ? (
              <div className="text-center py-12">
                <ShieldCheck className="w-12 h-12 text-slate-700 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">No audit logs found matching the selected filters.</p>
              </div>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-slate-850/40 transition-colors flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-3">
                      <span className="text-xs px-2 py-0.5 rounded-md font-mono font-bold bg-slate-850 text-indigo-300 border border-slate-750">
                        {log.action}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        {log.entityType}
                      </span>
                      <span className="text-sm font-semibold text-slate-200">{log.user.name}</span>
                      <span className="text-xs text-slate-400 font-mono">({log.user.email})</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5">{log.details}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500 font-mono">{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
