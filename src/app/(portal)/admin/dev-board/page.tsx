import { redirect } from "next/navigation";
import { getEffectiveSession } from "@/lib/effective-user";
import { fetchDevBoardDataAction } from "../../sccg/dev-board/actions";
import DevBoardClient from "../../sccg/dev-board/DevBoardClient";

export const metadata = {
  title: "Project Dev Board | Admin Console",
  description: "DevOps and Jira style project development task board.",
};

export default async function AdminDevBoardPage() {
  const session = await getEffectiveSession();
  if (!session?.user) redirect("/login");

  const result = await fetchDevBoardDataAction();
  const data = result.success && result.data ? result.data : { projects: [], activeProjectKey: "PORTAL", workItems: [], users: [] };

  return (
    <DevBoardClient
      initialProjects={data.projects || []}
      initialActiveProjectKey={data.activeProjectKey || "PORTAL"}
      initialWorkItems={data.workItems || []}
      users={data.users || []}
      currentUserEmail={session.user.email}
      baseTasksPath="/admin/tasks"
    />
  );
}
