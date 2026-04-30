import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { fetchMyEnrollments, fetchMyCertificates } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { BookOpen, Award, Calendar } from "lucide-react";

export default async function CustomerSchoolPage() {
  const session = await auth();
  const user = session?.user as SessionUser;

  void user;
  const [enrollments, certificates] = await Promise.all([
    fetchMyEnrollments(),
    fetchMyCertificates(),
  ]);

  const activeEnrollments = enrollments.filter((e) => e.status === "enrolled");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Courses</h1>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <BookOpen className="h-5 w-5 mx-auto text-blue-500 mb-1" />
            <p className="text-2xl font-bold">{activeEnrollments.length}</p>
            <p className="text-xs text-muted-foreground">Active Courses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <Calendar className="h-5 w-5 mx-auto text-green-500 mb-1" />
            <p className="text-2xl font-bold">{enrollments.length}</p>
            <p className="text-xs text-muted-foreground">Total Enrollments</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <Award className="h-5 w-5 mx-auto text-yellow-600 mb-1" />
            <p className="text-2xl font-bold">{certificates.length}</p>
            <p className="text-xs text-muted-foreground">Certificates</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Enrollments */}
      <Card>
        <CardHeader><CardTitle>My Enrollments</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-4 text-xs text-muted-foreground">Course</th>
                <th className="text-left py-3 px-4 text-xs text-muted-foreground">Batch</th>
                <th className="text-left py-3 px-4 text-xs text-muted-foreground">Fee</th>
                <th className="text-left py-3 px-4 text-xs text-muted-foreground">Payment</th>
                <th className="text-left py-3 px-4 text-xs text-muted-foreground">Status</th>
                <th className="text-left py-3 px-4 text-xs text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {enrollments.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">You are not enrolled in any courses yet.</td></tr>
              ) : (
                enrollments.map((e) => (
                  <tr key={e.id} className="border-b hover:bg-muted/30">
                    <td className="py-3 px-4 font-medium">{e.courseName}</td>
                    <td className="py-3 px-4 font-mono text-xs">{e.batchCode}</td>
                    <td className="py-3 px-4">৳{e.netFee.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <Badge variant={e.paymentStatus === "paid" ? "default" : "secondary"} className="capitalize text-xs">{e.paymentStatus}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={e.status === "enrolled" ? "default" : e.status === "completed" ? "outline" : "destructive"} className="capitalize text-xs">{e.status}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Link href={`/customer/school/${e.id}`} className="text-primary text-xs hover:underline">View Details</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Certificates */}
      {certificates.length > 0 && (
        <Card>
          <CardHeader><CardTitle>My Certificates</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {certificates.map((c) => (
                <div key={c.id} className={`rounded-lg border p-4 ${c.status === "issued" ? "bg-green-50/50 border-green-200" : "bg-red-50/50 border-red-200"}`}>
                  <div className="flex items-center gap-3">
                    <Award className={`h-8 w-8 ${c.status === "issued" ? "text-green-600" : "text-red-400"}`} />
                    <div>
                      <p className="font-medium text-sm capitalize">{c.certificateType === "completion" ? "Course Completion" : "Participation"}</p>
                      <p className="text-xs text-muted-foreground">{c.courseName} ({c.courseLevel})</p>
                      <p className="text-xs font-mono">{c.certificateNumber}</p>
                    </div>
                  </div>
                  {c.status === "issued" && c.verificationUrl && (
                    <Link href={c.verificationUrl} target="_blank" className="text-xs text-primary hover:underline mt-2 block">Verify Certificate →</Link>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
