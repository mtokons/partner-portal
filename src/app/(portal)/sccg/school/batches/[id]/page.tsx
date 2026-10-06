import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/permissions";
import {
  getSchoolBatchById,
  getSchoolCourseById,
  getSchoolEnrollments,
  getSchoolStudents,
  getSchoolTeacherById,
  getSchoolWaitingList,
} from "@/lib/firestore-services";
import { getCandidates, getClients } from "@/lib/sharepoint";
import BatchDetailClient, { type ExistingClientOption } from "./BatchDetailClient";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const batch = await getSchoolBatchById(id);
  return {
    title: batch ? `${batch.batchName} (${batch.batchCode}) | SCCG Language School` : "Batch Details",
  };
}

export default async function BatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("school.batch.manage");
  const rawParams = await params;
  const id = decodeURIComponent(rawParams.id);
  const batch = await getSchoolBatchById(id);
  if (!batch) notFound();

  const [course, enrollments, waitingList, teacher, coordinator, candidates, clients, students] = await Promise.all([
    getSchoolCourseById(batch.courseId).catch(() => null),
    getSchoolEnrollments({ batchId: batch.id }).catch(() => []),
    getSchoolWaitingList(batch.level || course?.level).catch(() => []),
    batch.teacherId ? getSchoolTeacherById(batch.teacherId).catch(() => null) : null,
    batch.coordinatorId ? getSchoolTeacherById(batch.coordinatorId).catch(() => null) : null,
    getCandidates().catch(() => []),
    getClients().catch(() => []),
    getSchoolStudents().catch(() => []),
  ]);

  const existingClientsMap = new Map<string, ExistingClientOption>();

  for (const c of candidates) {
    const email = (c.email || "").trim().toLowerCase();
    const name = (c.fullName || "").trim();
    if (!name && !email) continue;
    const key = email || c.id;
    const isPaid =
      c.paymentStatus === "deposit-paid" ||
      c.paymentStatus === "fully-paid" ||
      (c as any).paymentStatus === "paid";
    existingClientsMap.set(key, {
      id: c.id,
      candidateId: c.id,
      name: name || email,
      email: c.email || "",
      phone: c.phone || "",
      source: "Candidate",
      paymentStatus: isPaid ? "paid" : "pending",
      details: c.sccgId
        ? `ID: ${c.sccgId} · ${isPaid ? "Paid" : "Pending"}`
        : isPaid
        ? "Paid in Candidate Gallery"
        : c.currentStatus || "Candidate",
    });
  }

  for (const cl of clients) {
    const email = (cl.email || "").trim().toLowerCase();
    const name = (cl.name || "").trim();
    if (!name && !email) continue;
    const key = email || cl.id;
    if (!existingClientsMap.has(key)) {
      existingClientsMap.set(key, {
        id: cl.id,
        name: name || email,
        email: cl.email || "",
        phone: cl.phone || "",
        source: "Client",
        details: cl.company ? `Company: ${cl.company}` : "Client",
      });
    }
  }

  for (const st of students) {
    const email = (st.email || "").trim().toLowerCase();
    const name = (st.fullName || st.name || "").trim();
    if (!name && !email) continue;
    const key = email || st.id;
    if (!existingClientsMap.has(key)) {
      existingClientsMap.set(key, {
        id: st.id,
        name: name || email,
        email: st.email || "",
        phone: (st.phone as string) || (st.mobileNumber as string) || "",
        source: "User",
        details: st.sccgId ? `ID: ${st.sccgId}` : "Portal User",
      });
    }
  }

  const existingClients = Array.from(existingClientsMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <BatchDetailClient
      batch={batch}
      course={course}
      enrollments={enrollments}
      waitingList={waitingList}
      teacher={teacher}
      coordinator={coordinator}
      existingClients={existingClients}
    />
  );
}
