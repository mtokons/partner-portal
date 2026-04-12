import { fetchCourses, fetchBatches, fetchEnrollments, fetchCertificates } from "../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, GraduationCap, Award, TrendingUp, BarChart3 } from "lucide-react";

export default async function SchoolReportsPage() {
  const [courses, batches, enrollments, certificates] = await Promise.all([
    fetchCourses(),
    fetchBatches(),
    fetchEnrollments(),
    fetchCertificates(),
  ]);

  const activeBatches = batches.filter((b) => b.status === "active");
  const completedBatches = batches.filter((b) => b.status === "completed");
  const activeEnrollments = enrollments.filter((e) => e.status === "enrolled");
  const totalRevenue = enrollments.reduce((sum, e) => sum + (e.netFee || 0), 0);
  const paidEnrollments = enrollments.filter((e) => e.paymentStatus === "paid");
  const collectedRevenue = paidEnrollments.reduce((sum, e) => sum + (e.netFee || 0), 0);

  // Language distribution
  const langDist = courses.reduce<Record<string, number>>((acc, c) => {
    acc[c.language] = (acc[c.language] || 0) + 1;
    return acc;
  }, {});

  // Level distribution
  const levelDist = courses.reduce<Record<string, number>>((acc, c) => {
    acc[c.level] = (acc[c.level] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">School Reports</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <BookOpen className="h-5 w-5 mx-auto text-blue-500 mb-1" />
            <p className="text-2xl font-bold">{courses.length}</p>
            <p className="text-xs text-muted-foreground">Courses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <BarChart3 className="h-5 w-5 mx-auto text-violet-500 mb-1" />
            <p className="text-2xl font-bold">{activeBatches.length}</p>
            <p className="text-xs text-muted-foreground">Active Batches</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <Users className="h-5 w-5 mx-auto text-green-500 mb-1" />
            <p className="text-2xl font-bold">{activeEnrollments.length}</p>
            <p className="text-xs text-muted-foreground">Active Students</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <GraduationCap className="h-5 w-5 mx-auto text-yellow-600 mb-1" />
            <p className="text-2xl font-bold">{completedBatches.length}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <Award className="h-5 w-5 mx-auto text-red-500 mb-1" />
            <p className="text-2xl font-bold">{certificates.length}</p>
            <p className="text-xs text-muted-foreground">Certificates</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <TrendingUp className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
            <p className="text-2xl font-bold">৳{(totalRevenue / 1000).toFixed(0)}K</p>
            <p className="text-xs text-muted-foreground">Total Revenue</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Revenue Summary */}
        <Card>
          <CardHeader><CardTitle>Revenue Summary</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Billed</span>
              <span className="font-medium">৳{totalRevenue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Collected</span>
              <span className="font-medium text-green-600">৳{collectedRevenue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Outstanding</span>
              <span className="font-medium text-red-600">৳{(totalRevenue - collectedRevenue).toLocaleString()}</span>
            </div>
            <div className="pt-2 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Collection Rate</span>
                <span className="font-bold">{totalRevenue > 0 ? Math.round((collectedRevenue / totalRevenue) * 100) : 0}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Course Distribution by Language */}
        <Card>
          <CardHeader><CardTitle>Courses by Language</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(langDist).map(([lang, count]) => (
              <div key={lang} className="flex items-center justify-between">
                <span className="capitalize text-sm">{lang}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${(count / courses.length) * 100}%` }} />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Course Distribution by Level */}
        <Card>
          <CardHeader><CardTitle>Courses by Level</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {["A1", "A2", "B1", "B2", "C1", "C2"].map((level) => (
              <div key={level} className="flex items-center justify-between">
                <span className="text-sm font-mono">{level}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${((levelDist[level] || 0) / Math.max(courses.length, 1)) * 100}%` }} />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{levelDist[level] || 0}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Batch Status Breakdown */}
        <Card>
          <CardHeader><CardTitle>Batch Status</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {["planned", "active", "completed", "cancelled"].map((status) => {
              const count = batches.filter((b) => b.status === status).length;
              return (
                <div key={status} className="flex items-center justify-between">
                  <span className="capitalize text-sm">{status}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${status === "active" ? "bg-green-500" : status === "completed" ? "bg-blue-500" : status === "cancelled" ? "bg-red-500" : "bg-yellow-500"}`}
                        style={{ width: `${batches.length > 0 ? (count / batches.length) * 100 : 0}%` }} />
                    </div>
                    <span className="text-sm font-medium w-8 text-right">{count}</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
