"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CourseForm } from "./CourseForm";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { deleteCourse } from "@/app/(portal)/admin/school/actions";
import type { SchoolCourse } from "@/types";

interface CourseActionsProps {
  course: SchoolCourse;
}

export function CourseActions({ course }: CourseActionsProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-end gap-2">
         <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsEditOpen(true)}
            className="h-8 w-8 rounded-lg text-gray-500 hover:text-primary hover:bg-primary/5"
         >
            <Edit2 className="h-4 w-4" />
         </Button>
         <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsDeleteOpen(true)}
            className="h-8 w-8 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"
         >
            <Trash2 className="h-4 w-4" />
         </Button>
      </div>

      {/* Edit Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="rounded-[32px] sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Edit Course</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <CourseForm 
              initialData={course} 
              onSuccess={() => setIsEditOpen(false)} 
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Delete Course?"
        description={`This will permanently delete "${course.courseName}" and its course settings. This action cannot be undone.`}
        onConfirm={async () => {
          await deleteCourse(course.id);
          setIsDeleteOpen(false);
        }}
      />
    </>
  );
}
