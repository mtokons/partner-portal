import { redirect } from "next/navigation";
import { getEffectiveSession } from "@/lib/effective-user";
import { fetchExpertTasksAction } from "./actions";
import SccgTaskBoardClient from "@/app/(portal)/sccg/tasks/SccgTaskBoardClient";

export const metadata = {
  title: "My Tasks | Expert Portal",
  description: "View your assigned tasks and track progress on the kanban board.",
};

export default async function ExpertTasksPage() {
  const session = await getEffectiveSession();
  if (!session?.user) redirect("/expert-login");

  const result = await fetchExpertTasksAction();

  const tasks = result.success ? result.tasks : [];
  const currentUserId = result.success ? result.currentUserId : "";
  const currentUserEmail = result.success ? result.currentUserEmail : "";
  const currentUserName = result.success ? result.currentUserName : "";

  return (
    <SccgTaskBoardClient
      initialTasks={tasks}
      candidates={result.candidates || []}
      partners={[]}
      staff={[]}
      viewMode="personal"
      currentUserEmail={currentUserEmail}
      currentUserId={currentUserId}
      currentUserName={currentUserName}
      hideCreate={false}
      title="My Tasks"
      subtitle="Tasks assigned to you — drag cards to update status."
    />
  );
}
