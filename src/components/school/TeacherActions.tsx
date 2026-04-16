"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TeacherForm } from "./TeacherForm";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { deleteTeacher } from "@/app/(portal)/admin/school/actions";
import type { SchoolTeacher } from "@/types";

interface TeacherActionsProps {
  teacher: SchoolTeacher;
}

export function TeacherActions({ teacher }: TeacherActionsProps) {
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
        <DialogContent className="rounded-[32px] sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Edit Teacher Profile</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <TeacherForm 
              initialData={teacher} 
              onSuccess={() => setIsEditOpen(false)} 
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Delete Teacher?"
        description={`This will permanently delete the teacher profile for "${teacher.name}". They will no longer be assignable to future batches.`}
        onConfirm={async () => {
          await deleteTeacher(teacher.id);
          setIsDeleteOpen(false);
        }}
      />
    </>
  );
}
