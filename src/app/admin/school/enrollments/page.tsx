import { fetchEnrollments } from "../actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Plus, User, Hash, Calendar } from "lucide-react";
import { EnrollmentActions } from "@/components/school/EnrollmentActions";

export default async function EnrollmentsPage() {
  const enrollments = await fetchEnrollments();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Enrollments</h1>
          <p className="text-muted-foreground text-sm font-medium">{enrollments.length} total students enrolled</p>
        </div>
        <Link href="/admin/school/enrollments/new" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform active:scale-95">
          <Plus className="h-4 w-4" /> Enroll Student
        </Link>
      </div>

      <Card className="border-0 shadow-2xl rounded-[32px] overflow-hidden bg-white/60 backdrop-blur-xl border border-white/20">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/50">
                <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Student Info</th>
                <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Course & Batch</th>
                <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Financials</th>
                <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Enrollment Status</th>
                <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Date</th>
                <th className="text-right py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.length === 0 ? (
                <tr><td colSpan={6} className="py-20 text-center text-gray-400 font-medium italic">No students enrolled yet.</td></tr>
              ) : (
                enrollments.map((e) => (
                  <tr key={e.id} className="border-b hover:bg-white/40 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="text-gray-900 font-black">{e.studentName}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{e.studentEmail}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="text-gray-800 font-bold">{e.courseName}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Hash className="h-2.5 w-2.5 text-primary/60" />
                          <span className="text-[10px] font-black text-primary/70">{e.batchCode}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-1">
                        <span className="font-black text-gray-900">৳{e.netFee.toLocaleString()}</span>
                        <Badge variant={e.paymentStatus === "paid" ? "default" : "secondary"} className={`text-[9px] w-fit font-bold tracking-widest px-1.5 py-0 ${
                          e.paymentStatus === "paid" ? "bg-green-500/10 text-green-700 hover:bg-green-500/20" : ""
                        }`}>
                          {e.paymentStatus}
                        </Badge>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                       <Badge 
                        variant={e.status === "enrolled" || e.status === "active" ? "default" : "outline"} 
                        className={`capitalize font-black tracking-widest px-2 py-0.5 rounded-md ${
                          e.status === "active" ? "bg-primary/5 text-primary border-primary/10" : ""
                        }`}
                      >
                        {e.status}
                      </Badge>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                        <Calendar className="h-3 w-3" />
                        {e.enrolledAt?.split("T")[0]}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <EnrollmentActions enrollment={e} />
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
