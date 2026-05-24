import { fetchBatches, fetchCourses, fetchTeachers } from "../actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Plus, Users, Calendar } from "lucide-react";
import { BatchActions } from "@/components/school/BatchActions";

export default async function BatchesPage() {
  const [batches, courses, teachers] = await Promise.all([
    fetchBatches(),
    fetchCourses(),
    fetchTeachers(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Batches</h1>
          <p className="text-muted-foreground">{batches.length} batches</p>
        </div>
        <Link href="/admin/school/batches/new" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform active:scale-95">
          <Plus className="h-4 w-4" /> New Batch
        </Link>
      </div>

      <Card className="border-0 shadow-2xl rounded-[32px] overflow-hidden bg-white/60 backdrop-blur-xl border border-white/20">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/50">
                <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Batch Code</th>
                <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Batch Details</th>
                <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Teacher</th>
                <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Timeline</th>
                <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Enrollment</th>
                <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Status</th>
                <th className="text-right py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {batches.length === 0 ? (
                <tr><td colSpan={7} className="py-20 text-center text-gray-400 font-medium italic">No batches yet. Start by creating a new batch.</td></tr>
              ) : (
                batches.map((b) => (
                  <tr key={b.id} className="border-b hover:bg-white/40 transition-colors">
                    <td className="py-4 px-6 font-mono text-xs font-bold text-primary/60">{b.batchCode}</td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <Link href={`/admin/school/batches/${b.id}`} className="text-gray-900 hover:text-primary font-black transition-colors">{b.batchName}</Link>
                        <span className="text-xs text-muted-foreground font-medium">{b.courseName}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-bold text-gray-600">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/5 flex items-center justify-center text-[10px] font-black text-primary border border-primary/10">
                          {b.teacherName?.slice(0, 1)}
                        </div>
                        {b.teacherName}
                      </div>
                    </td>
                    <td className="py-4 px-6 font-bold text-gray-600">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                          <Calendar className="h-3 w-3 text-primary" />
                          {b.startDate}
                        </div>
                        <div className="text-[10px] font-medium text-gray-400 pl-4.5">{b.schedule}</div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Users className="h-3 w-3 text-gray-400" />
                          <span className="font-black text-gray-900">{b.enrolledStudents} / {b.maxStudents}</span>
                        </div>
                        <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary" 
                            style={{ width: `${Math.min(100, (b.enrolledStudents / b.maxStudents) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <Badge 
                        variant={b.status === "active" ? "default" : "secondary"} 
                        className={`capitalize font-black tracking-widest px-2 py-0.5 rounded-md ${
                          b.status === "active" ? "bg-green-50 text-green-700 border-green-100" : ""
                        }`}
                      >
                        {b.status}
                      </Badge>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <BatchActions batch={b} courses={courses} teachers={teachers} />
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
