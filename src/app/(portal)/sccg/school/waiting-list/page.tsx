import { requirePermission } from "@/lib/permissions";
import { getSchoolBatches, getSchoolWaitingList } from "@/lib/firestore-services";
import WaitingListClient from "./WaitingListClient";

export const metadata = {
  title: "Smart Waiting List | SCCG Language School",
  description: "Automated student waiting list with intelligent batch matching and FIFO assignment.",
};

export default async function WaitingListPage() {
  await requirePermission("school.enrollment.manage");
  const [waitingList, batches] = await Promise.all([
    getSchoolWaitingList().catch(() => []),
    getSchoolBatches().catch(() => []),
  ]);

  return <WaitingListClient initialWaitingList={waitingList} batches={batches} />;
}
