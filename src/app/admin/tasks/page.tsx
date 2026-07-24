import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import TaskBoardClient from "./TaskBoardClient";
import SmartTasksPanel from "./SmartTasksPanel";

export const metadata = { title: "SCCG Planning Board | SCCG Admin" };

export default async function TaskBoardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  const roles = user.roles || [user.role];
  if (!roles.includes("admin")) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <SmartTasksPanel />
      <TaskBoardClient />
    </div>
  );
}
