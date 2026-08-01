import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Sidebar } from "@/components/layout/Sidebar";
import ProfileForms from "./ProfileForms";

export default async function ProfilePage() {
  const user = await requireRole(["STUDENT", "TEACHER", "ADMIN"]);

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      year: true,
      avatarUrl: true,
    },
  });

  if (!dbUser) return <div>User not found</div>;

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar role={dbUser.role as any} user={dbUser} />

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Account Profile</h1>
          <p className="text-slate-400 text-sm mt-1">Manage your credentials, upload an avatar, and review user status</p>
        </div>

        <ProfileForms user={dbUser} />
      </main>
    </div>
  );
}
