import { getEffectiveSession } from "@/lib/effective-user";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import { fetchSccgTaskBoardDataAction } from "@/app/(portal)/sccg/tasks/actions";
import SccgTaskBoardClient from "@/app/(portal)/sccg/tasks/SccgTaskBoardClient";

export const metadata = {
  title: "My Tasks | SCCG Partner Portal",
  description: "Manage, assign, and track operations for your candidate milestones.",
};

export default async function PartnerTasksPage() {
  const session = await getEffectiveSession();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  
  // Fetch unified task board data
  const result = await fetchSccgTaskBoardDataAction();
  const data = result.success && result.data ? result.data : { tasks: [], candidates: [], partners: [], staff: [] };

  return (
    <div className="space-y-6">
      <SccgTaskBoardClient
        initialTasks={data.tasks || []}
        candidates={data.candidates || []}
        partners={data.partners || []}
        staff={data.staff || []}
        viewMode="personal"
        currentUserEmail={user.email}
        currentUserId={user.id}
        title="Partner Task Board"
        subtitle="Track and manage operational tasks, candidate milestones, and partner actions."
      />
    </div>
  );
}
