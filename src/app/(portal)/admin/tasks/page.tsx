import { redirect } from "next/navigation";
import { getEffectiveSession } from "@/lib/effective-user";
import { fetchSccgTaskBoardDataAction } from "@/app/(portal)/sccg/tasks/actions";
import SccgTaskBoardClient from "@/app/(portal)/sccg/tasks/SccgTaskBoardClient";

export const metadata = {
  title: "Task Board | SCCG Admin",
};

export default async function AdminTasksPage() {
  const session = await getEffectiveSession();
  if (!session?.user) redirect("/login");

  const result = await fetchSccgTaskBoardDataAction();
  const data = result.success && result.data ? result.data : { tasks: [], candidates: [], partners: [], staff: [] };

  return (
    <SccgTaskBoardClient
      initialTasks={data.tasks || []}
      candidates={data.candidates || []}
      partners={data.partners || []}
      staff={data.staff || []}
      viewMode="admin"
      currentUserEmail={session.user.email}
      currentUserId={session.user.id}
      title="Admin Task Board"
      subtitle="Manage all operational and automated tasks across candidates, partners, and staff."
    />
  );
}
