import { redirect } from "next/navigation";
import { getEffectiveSession } from "@/lib/effective-user";
import { requireSccgAccess } from "@/lib/admin-guard";
import { fetchSccgTaskBoardDataAction } from "./actions";
import SccgTaskBoardClient from "./SccgTaskBoardClient";

export const metadata = {
  title: "Task Board | SCCG Career Lab",
};

export default async function SccgTasksPage() {
  await requireSccgAccess();
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
      currentUserName={(session.user as any).name || session.user.email}
      title="Task Board"
      subtitle="Manage all operational and automated tasks across candidates, partners, and staff."
    />
  );
}