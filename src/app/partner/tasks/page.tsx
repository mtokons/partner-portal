import { getEffectiveSession } from "@/lib/effective-user";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import { fetchPartnerTaskBoardDataAction } from "./actions";
import TaskBoardClient from "./TaskBoardClient";

export const metadata = {
  title: "Task Board | SCCG Partner Portal",
  description: "Manage, assign, and track operations for your candidate milestones.",
};

export default async function PartnerTasksPage() {
  const session = await getEffectiveSession();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  
  // Call server action to fetch data
  const result = await fetchPartnerTaskBoardDataAction();
  if (!result.success || !result.data) {
    // If not found or unauthorised, redirect
    redirect("/partner-pending");
  }

  const { tasks, candidates, partner } = result.data;

  return (
    <div className="space-y-6">
      <TaskBoardClient
        initialTasks={tasks}
        candidates={candidates}
        partner={partner}
      />
    </div>
  );
}
