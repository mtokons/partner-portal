import { fetchCourses } from "../actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Plus } from "lucide-react";
import { CourseActions } from "@/components/school/CourseActions";

export default async function CoursesPage() {
  const courses = await fetchCourses();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Courses</h1>
          <p className="text-muted-foreground">{courses.length} courses</p>
        </div>
        <Link href="/admin/school/courses/new" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform active:scale-95">
          <Plus className="h-4 w-4" /> New Course
        </Link>
      </div>

      <Card className="border-0 shadow-2xl rounded-[32px] overflow-hidden bg-white/60 backdrop-blur-xl border border-white/20">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/50">
                <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Code</th>
                <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Course Name</th>
                <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Language</th>
                <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Level</th>
                <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Sessions</th>
                <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Fee</th>
                <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Status</th>
                <th className="text-right py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.id} className="border-b hover:bg-white/40 transition-colors">
                  <td className="py-4 px-6 font-mono text-xs font-bold text-primary/60">{c.courseCode}</td>
                  <td className="py-4 px-6">
                    <Link href={`/admin/school/courses/${c.id}`} className="text-gray-900 hover:text-primary font-black transition-colors">{c.courseName}</Link>
                  </td>
                  <td className="py-4 px-6 capitalize font-bold text-gray-600">{c.language}</td>
                  <td className="py-4 px-6">
                    <Badge variant="outline" className="rounded-lg bg-white font-black">{c.level}</Badge>
                  </td>
                  <td className="py-4 px-6 font-bold text-gray-600">{c.totalSessions}</td>
                  <td className="py-4 px-6 font-black text-gray-900">৳{c.courseFee.toLocaleString()}</td>
                  <td className="py-4 px-6">
                    <Badge variant={c.status === "published" ? "default" : "secondary"} className="capitalize text-[10px] font-black tracking-widest px-2 py-0.5 rounded-md">{c.status}</Badge>
                  </td>
                  <td className="py-4 px-6">
                    <CourseActions course={c} />
                  </td>
                </tr>
              ))}
              {courses.length === 0 && (
                <tr><td colSpan={8} className="py-20 text-center text-gray-400 font-medium italic">No courses yet. Create your first course.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
