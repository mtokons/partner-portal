"use client";

import { useRouter } from "next/navigation";
import { CourseForm } from "@/components/school/CourseForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function NewCoursePage() {
  const router = useRouter();

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.back()}
          className="rounded-full h-12 w-12 hover:bg-gray-100"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div>
          <h1 className="text-3xl font-black tracking-tight">Create New Course</h1>
          <p className="text-muted-foreground text-sm font-medium">Define a new language course for the school catalog.</p>
        </div>
      </div>

      <div className="bg-white/60 backdrop-blur-xl border border-white/20 rounded-[32px] p-8 shadow-2xl">
        <CourseForm />
      </div>
    </div>
  );
}
