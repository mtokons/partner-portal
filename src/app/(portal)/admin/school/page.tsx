import { fetchCourses, fetchBatches, fetchEnrollments, fetchCertificates } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, BookOpen, Layers, Users, Award } from "lucide-react";
import Link from "next/link";

export default async function SchoolDashboardPage() {
  const [courses, batches, enrollments, certificates] = await Promise.all([
    fetchCourses(),
    fetchBatches(),
    fetchEnrollments(),
    fetchCertificates(),
  ]);

  const activeCourses = courses.filter((c) => c.status === "published").length;
  const runningBatches = batches.filter((b) => b.status === "in-progress").length;
  const totalStudents = enrollments.filter((e) => ["enrolled", "active", "completed"].includes(e.status)).length;
  const issuedCerts = certificates.filter((c) => c.status === "issued").length;

  const batchStatusCounts: Record<string, number> = {};
  batches.forEach((b) => {
    batchStatusCounts[b.status] = (batchStatusCounts[b.status] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Language School Dashboard</h1>
          <p className="text-muted-foreground">SCCG Language School Overview</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCourses}</p>
                <p className="text-xs text-muted-foreground">Active Courses</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Layers className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{runningBatches}</p>
                <p className="text-xs text-muted-foreground">Running Batches</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalStudents}</p>
                <p className="text-xs text-muted-foreground">Total Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Award className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{issuedCerts}</p>
                <p className="text-xs text-muted-foreground">Certificates Issued</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-teal-500/10 flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-teal-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{courses.length}</p>
                <p className="text-xs text-muted-foreground">Total Courses</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Batch Status */}
      <Card>
        <CardHeader><CardTitle>Batch Status Overview</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {Object.entries(batchStatusCounts).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between p-3 rounded-lg border">
                <span className="text-sm capitalize">{status.replace(/-/g, " ")}</span>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/admin/school/courses" className="block">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Manage Courses</p>
                <p className="text-sm text-muted-foreground">Create and manage language courses</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/school/batches" className="block">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <Layers className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Manage Batches</p>
                <p className="text-sm text-muted-foreground">Create batches and assign teachers</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/school/enrollments" className="block">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Enrollments</p>
                <p className="text-sm text-muted-foreground">Enroll students into batches</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Batches */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Recent Batches
            <Link href="/admin/school/batches" className="text-sm font-normal text-primary hover:underline">View All →</Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Batch Code</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Course</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Teacher</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Students</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Start</th>
                </tr>
              </thead>
              <tbody>
                {batches.slice(0, 8).map((batch) => (
                  <tr key={batch.id} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-3 font-mono text-xs">
                      <Link href={`/admin/school/batches/${batch.id}`} className="text-primary hover:underline">
                        {batch.batchCode}
                      </Link>
                    </td>
                    <td className="py-2 px-3">{batch.courseName}</td>
                    <td className="py-2 px-3">{batch.teacherName}</td>
                    <td className="py-2 px-3">{batch.enrolledStudents}/{batch.maxStudents}</td>
                    <td className="py-2 px-3">
                      <Badge variant="secondary" className="capitalize text-xs">{batch.status.replace(/-/g, " ")}</Badge>
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">{batch.startDate}</td>
                  </tr>
                ))}
                {batches.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No batches yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
