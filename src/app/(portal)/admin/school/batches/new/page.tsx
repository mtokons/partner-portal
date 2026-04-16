import { fetchCourses, fetchTeachers } from "../../actions";
import { BatchForm } from "@/components/school/BatchForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NewBatchPage() {
  const [courses, teachers] = await Promise.all([
    fetchCourses(),
    fetchTeachers(),
  ]);

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/school/batches">
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full h-12 w-12 hover:bg-gray-100"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900">Create New Batch</h1>
          <p className="text-muted-foreground text-sm font-medium">Set up a new schedule and assign a teacher to a course.</p>
        </div>
      </div>

      <div className="bg-white/60 backdrop-blur-xl border border-white/20 rounded-[32px] p-8 shadow-2xl">
        <BatchForm courses={courses} teachers={teachers} />
      </div>
    </div>
  );
}
