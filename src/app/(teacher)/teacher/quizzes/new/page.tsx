import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Sidebar } from "@/components/layout/Sidebar";
import CreateQuizForm from "./CreateQuizForm";

export default async function NewQuizPage() {
  const teacher = await requireRole(["TEACHER", "ADMIN"]);

  const [subjects, questions] = await Promise.all([
    prisma.subject.findMany(),
    prisma.question.findMany({
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar role={teacher.role as any} user={teacher} />

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Create & Publish Quiz</h1>
          <p className="text-slate-400 text-sm mt-1">Configure availability timeframe, duration, and question composition</p>
        </div>

        <CreateQuizForm subjects={subjects} questions={questions} />
      </main>
    </div>
  );
}
