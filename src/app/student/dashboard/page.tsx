import { redirect } from "next/navigation";
import { getSchoolEnrollments } from "@/lib/firestore-services";
import type { SessionUser, SchoolEnrollment } from "@/types";
import { getEffectiveUser } from "@/lib/effective-user";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  BookOpen, CreditCard, Clock, CheckCircle2,
  AlertCircle, GraduationCap, Hash, User,
} from "lucide-react";
import StudentCharts from "@/components/student/StudentCharts";

function statusColor(s: SchoolEnrollment["status"]) {
  switch (s) {
    case "active":
    case "enrolled": return "bg-green-50 text-green-700 border-green-200";
    case "applied": return "bg-amber-50 text-amber-700 border-amber-200";
    case "completed": return "bg-blue-50 text-blue-700 border-blue-200";
    case "dropped":
    case "expelled": return "bg-red-50 text-red-700 border-red-200";
    default: return "bg-gray-50 text-gray-700 border-gray-200";
  }
}

function paymentColor(s: SchoolEnrollment["paymentStatus"]) {
  switch (s) {
    case "paid": return "bg-green-50 text-green-700 border-green-200";
    case "partial": return "bg-amber-50 text-amber-700 border-amber-200";
    default: return "bg-red-50 text-red-700 border-red-200";
  }
}

export default async function StudentDashboardPage() {
  const user = await getEffectiveUser();
  if (!user) redirect("/login");

  const enrollments = await getSchoolEnrollments({ studentUserId: user.id });
  const active = enrollments.filter((e) => ["enrolled", "active", "applied"].includes(e.status));
  const past = enrollments.filter((e) => ["completed", "dropped", "expelled"].includes(e.status));
  const totalPaid = enrollments.reduce((s, e) => s + (e.amountPaid || 0), 0);
  const totalOwed = enrollments.reduce((s, e) => s + (e.amountRemaining || 0), 0);

  const statusBuckets: Record<string, number> = {};
  enrollments.forEach((e) => {
    const label =
      e.status === "enrolled" || e.status === "active"
        ? "Active"
        : e.status === "applied"
        ? "Applied"
        : e.status === "completed"
        ? "Completed"
        : "Dropped";
    statusBuckets[label] = (statusBuckets[label] || 0) + 1;
  });
  const courseStatus = Object.entries(statusBuckets).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">My Courses</h1>
          <p className="text-sm text-muted-foreground mt-1">Welcome back, {user.name || user.email}</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-primary/5 border border-primary/10">
          <User className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold text-primary font-mono">{(user as SessionUser & { sccgId?: string }).sccgId || "Student"}</span>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/customer/school" className="block group outline-none">
          <Card className="border-0 shadow-xl rounded-[24px] bg-white/70 backdrop-blur-xl transition-all duration-200 hover:scale-[1.02] hover:shadow-2xl cursor-pointer">
            <CardContent className="p-5 text-center">
              <BookOpen className="h-5 w-5 mx-auto text-indigo-500 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-2xl font-black">{active.length}</p>
              <p className="text-xs font-bold text-muted-foreground group-hover:text-indigo-600 transition-colors">Active Courses</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/customer/payments" className="block group outline-none">
          <Card className="border-0 shadow-xl rounded-[24px] bg-white/70 backdrop-blur-xl transition-all duration-200 hover:scale-[1.02] hover:shadow-2xl cursor-pointer">
            <CardContent className="p-5 text-center">
              <CreditCard className="h-5 w-5 mx-auto text-green-500 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-2xl font-black">৳{totalPaid.toLocaleString()}</p>
              <p className="text-xs font-bold text-muted-foreground group-hover:text-green-600 transition-colors">Paid Amount</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/customer/payments" className="block group outline-none">
          <Card className="border-0 shadow-xl rounded-[24px] bg-white/70 backdrop-blur-xl transition-all duration-200 hover:scale-[1.02] hover:shadow-2xl cursor-pointer">
            <CardContent className="p-5 text-center">
              <AlertCircle className={`h-5 w-5 mx-auto mb-2 group-hover:scale-110 transition-transform ${totalOwed > 0 ? "text-red-500" : "text-green-500"}`} />
              <p className="text-2xl font-black">৳{totalOwed.toLocaleString()}</p>
              <p className="text-xs font-bold text-muted-foreground group-hover:text-red-600 transition-colors">Due Amount</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Visual analytics */}
      {enrollments.length > 0 && (
        <StudentCharts courseStatus={courseStatus} paid={totalPaid} due={totalOwed} />
      )}

      {/* Current courses */}
      {active.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-black flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" /> Current Courses
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {active.map((e) => <EnrollmentCard key={e.id} enrollment={e} />)}
          </div>
        </section>
      )}

      {/* Past courses */}
      {past.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-black flex items-center gap-2 text-muted-foreground">
            <GraduationCap className="h-5 w-5" /> Past Courses
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 opacity-70">
            {past.map((e) => <EnrollmentCard key={e.id} enrollment={e} />)}
          </div>
        </section>
      )}

      {enrollments.length === 0 && (
        <Card className="border-0 shadow-xl rounded-[32px] bg-white/60 backdrop-blur-xl">
          <CardContent className="py-20 text-center">
            <BookOpen className="h-12 w-12 text-gray-200 mx-auto mb-4" />
            <p className="text-lg font-black text-gray-400">No enrollments yet</p>
            <p className="text-sm text-muted-foreground mt-2">Contact the school to get enrolled in a course.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EnrollmentCard({ enrollment: e }: { enrollment: SchoolEnrollment }) {
  const hasBatch = e.batchId && e.batchId !== "" && e.batchId !== "pending";

  return (
    <Card className="border-0 shadow-2xl rounded-[28px] overflow-hidden bg-white/70 backdrop-blur-xl">
      <CardHeader className="border-b border-gray-100 bg-gray-50/50 px-6 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-black text-base truncate">{e.courseName}</p>
            {hasBatch ? (
              <div className="flex items-center gap-1 mt-0.5">
                <Hash className="h-3 w-3 text-primary/60" />
                <span className="text-[10px] font-black text-primary/70">{e.batchCode}</span>
              </div>
            ) : (
              <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1 mt-0.5">
                <Clock className="h-3 w-3" /> Batch being scheduled
              </span>
            )}
          </div>
          <Badge className={`text-[10px] font-bold border capitalize shrink-0 ${statusColor(e.status)}`}>{e.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {/* Financials */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-xl bg-gray-50">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Fee</p>
            <p className="font-black text-sm mt-1">৳{e.totalFee?.toLocaleString()}</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-gray-50">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Paid</p>
            <p className={`font-black text-sm mt-1 ${(e.amountPaid || 0) > 0 ? "text-green-700" : "text-gray-400"}`}>
              ৳{(e.amountPaid || 0).toLocaleString()}
            </p>
          </div>
          <div className="text-center p-3 rounded-xl bg-gray-50">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Due</p>
            <p className={`font-black text-sm mt-1 ${(e.amountRemaining || 0) > 0 ? "text-red-600" : "text-green-600"}`}>
              ৳{(e.amountRemaining || 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Payment status */}
        <div className="flex items-center justify-between">
          <Badge className={`text-[10px] font-bold border capitalize flex items-center gap-1 ${paymentColor(e.paymentStatus)}`}>
            {e.paymentStatus === "paid"
              ? <CheckCircle2 className="h-3 w-3" />
              : <AlertCircle className="h-3 w-3" />}
            {e.paymentStatus}
          </Badge>
          <span className="text-[10px] text-muted-foreground font-medium">
            {e.enrolledAt?.split("T")[0]}
          </span>
        </div>

        {/* Grade if completed */}
        {e.finalGrade && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 border border-blue-100 text-xs font-bold text-blue-700">
            <GraduationCap className="h-4 w-4" />
            Grade: {e.finalGrade}{e.examScore != null ? ` — ${e.examScore}%` : ""}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
