import Link from "next/link";
import {
  Award,
  BookOpen,
  Calendar,
  CreditCard,
  DollarSign,
  GraduationCap,
  Hourglass,
  Layers,
  Plus,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  AlertCircle,
  Clock,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react";
import { requirePermission } from "@/lib/permissions";
import {
  getSchoolBatches,
  getSchoolCertificates,
  getSchoolCourses,
  getSchoolEnrollments,
  getSchoolTeachers,
} from "@/lib/firestore-services";
import SchoolDashboardClient from "./SchoolDashboardClient";

export const metadata = {
  title: "German Language School CRM | SCCG Career Lab",
  description: "Manage courses, batches, students, waiting lists, and revenue distribution.",
};

export default async function SccgSchoolDashboardPage() {
  await requirePermission("school.report");

  const [courses, batches, enrollments, certificates, teachers] = await Promise.all([
    getSchoolCourses().catch(() => []),
    getSchoolBatches().catch(() => []),
    getSchoolEnrollments().catch(() => []),
    getSchoolCertificates().catch(() => []),
    getSchoolTeachers().catch(() => []),
  ]);

  // KPI Calculations
  const enrolledStudents = enrollments.filter((e) => e.status !== "waiting-list");
  const totalStudents = enrollments.length;
  
  const activeBatches = batches.filter((b) =>
    ["running", "in-progress", "active", "enrollment-open"].includes(b.status)
  ).length;

  const completedBatches = batches.filter((b) => b.status === "completed").length;

  const waitingListStudents = enrollments.filter(
    (e) => e.status === "waiting-list" || (!e.batchId || e.batchId === "" || e.batchId === "waiting-list")
  ).length;

  const totalRevenue = enrollments.reduce((sum, e) => sum + (e.netFee || e.totalFee || 0), 0);
  
  const outstandingPayments = enrollments
    .filter((e) => e.paymentStatus === "pending" || e.paymentStatus === "unpaid" || e.paymentStatus === "partial")
    .reduce((sum, e) => sum + (e.amountRemaining || e.netFee || e.totalFee || 0), 0);

  const pendingPaymentsCount = enrollments.filter(
    (e) => e.paymentStatus === "pending" || e.paymentStatus === "unpaid" || e.paymentStatus === "partial"
  ).length;

  // Level Distribution
  const levelCounts: Record<string, number> = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0 };
  enrollments.forEach((e) => {
    const lvl = (e.desiredLevel || "A1").toUpperCase();
    if (levelCounts[lvl] !== undefined) levelCounts[lvl]++;
    else levelCounts.A1++;
  });

  return (
    <SchoolDashboardClient
      kpis={{
        totalStudents,
        activeBatches,
        waitingListStudents,
        totalRevenue,
        completedBatches,
        outstandingPayments,
        pendingPaymentsCount,
      }}
      courses={courses}
      batches={batches}
      enrollments={enrollments}
      certificates={certificates}
      teachers={teachers}
      levelCounts={levelCounts}
    />
  );
}