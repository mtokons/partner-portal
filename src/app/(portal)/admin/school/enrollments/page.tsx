import { fetchEnrollments } from "../actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Plus } from "lucide-react";
import { IssueCertificateButton } from "@/components/IssueCertificateButton";

export default async function EnrollmentsPage() {
  const enrollments = await fetchEnrollments();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Enrollments</h1>
          <p className="text-muted-foreground">{enrollments.length} total enrollments</p>
        </div>
        <Link href="/admin/school/enrollments/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium">
          <Plus className="h-4 w-4" /> Enroll Student
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Student</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Course</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Batch</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Net Fee</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Payment</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">No enrollments yet</td></tr>
              ) : (
                enrollments.map((e) => (
                  <tr key={e.id} className="border-b hover:bg-muted/30">
                    <td className="py-3 px-4 font-medium">{e.studentName}</td>
                    <td className="py-3 px-4">{e.courseName}</td>
                    <td className="py-3 px-4 font-mono text-xs">{e.batchCode}</td>
                    <td className="py-3 px-4">৳{e.netFee.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <Badge variant={e.paymentStatus === "paid" ? "default" : e.paymentStatus === "partial" ? "outline" : "secondary"} className="capitalize text-xs">{e.paymentStatus}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={e.status === "enrolled" ? "default" : e.status === "completed" ? "outline" : "destructive"} className="capitalize text-xs">{e.status}</Badge>
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">{e.enrolledAt?.split("T")[0]}</td>
                    <td className="py-3 px-4 text-right">
                      <IssueCertificateButton enrollment={e} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
