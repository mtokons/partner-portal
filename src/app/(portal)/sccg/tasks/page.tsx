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
  const data = result.success && result.data ? result.data : { tasks: [], candidates: [], partners: [], staff: [] };

  return (
    <SccgTaskBoardClient
      initialTasks={data.tasks || []}
      candidates={data.candidates || []}
      partners={data.partners || []}
      staff={data.staff || []}
    />
  );
}