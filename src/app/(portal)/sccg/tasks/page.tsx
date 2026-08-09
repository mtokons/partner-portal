import { redirect } from "next/navigation";
import { requireSccgAccess } from "@/lib/admin-guard";
import { fetchSccgTaskBoardDataAction } from "./actions";
import SccgTaskBoardClient from "./SccgTaskBoardClient";

export const metadata = {
  title: "Task Board | SCCG Career Lab",
};

export default async function SccgTasksPage() {
  await requireSccgAccess();
  const result = await fetchSccgTaskBoardDataAction();
  if (!result.success || !result.data) redirect("/sccg/dashboard");

  return <SccgTaskBoardClient initialTasks={result.data.tasks} candidates={result.data.candidates} />;
}