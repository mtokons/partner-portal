import { fetchLanguageProducts, fetchTeachers } from "../../actions";
import { BatchForm } from "@/components/school/BatchForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { SchoolCourse } from "@/types";

export default async function NewBatchPage() {
  const [products, teachers] = await Promise.all([
    fetchLanguageProducts(),
    fetchTeachers(),
  ]);

  // Map language products to the SchoolCourse shape that BatchForm expects.
  // Products from the catalogue are the source of truth for courses.
  const courses: SchoolCourse[] = products.map((p) => ({
    id: p.id,
    sccgId: p.sku || p.id,
    courseName: p.name,
    courseCode: p.sku || p.name.slice(0, 8).toUpperCase().replace(/\s+/g, "-"),
    language: (
      (p.category || p.tags?.join(" ") || "").toLowerCase().includes("english") ? "english"
      : (p.category || p.tags?.join(" ") || "").toLowerCase().includes("japanese") ? "japanese"
      : "german"
    ) as SchoolCourse["language"],
    level: "custom" as SchoolCourse["level"],
    description: p.description || "",
    totalSessions: p.sessionsCount || 0,
    sessionDurationMinutes: 60,
    totalDurationWeeks: 0,
    courseFee: p.retailPriceBdt || 0,
    courseFeeCurrency: "BDT" as const,
    maxStudentsPerBatch: 25,
    status: (p.isAvailable ? "published" : "draft") as SchoolCourse["status"],
    createdBy: "",
    createdAt: new Date().toISOString(),
  }));

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
