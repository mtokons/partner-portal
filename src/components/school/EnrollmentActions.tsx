"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, MoreVertical } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { deleteEnrollment, updateEnrollment } from "@/app/(portal)/admin/school/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IssueCertificateButton } from "@/components/IssueCertificateButton";
import type { SchoolEnrollment, SchoolStudentStatus } from "@/types";

interface EnrollmentActionsProps {
  enrollment: SchoolEnrollment;
}

export function EnrollmentActions({ enrollment }: EnrollmentActionsProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      await updateEnrollment(enrollment.id, {
        netFee: parseFloat(form.get("netFee") as string),
        status: form.get("status") as SchoolStudentStatus,
      });
      setIsEditOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-2">
      <IssueCertificateButton enrollment={enrollment} />
      
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => setIsEditOpen(true)}
        className="h-8 w-8 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5"
      >
        <Edit2 className="h-4 w-4" />
      </Button>

      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => setIsDeleteOpen(true)}
        className="h-8 w-8 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      {/* Edit Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="rounded-[32px] sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Update Enrollment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-6 pt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-bold">Student Name</Label>
                <Input disabled value={enrollment.studentName} className="rounded-xl h-12 bg-gray-50 border-gray-100 font-medium" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Net Fee (BDT)</Label>
                <Input name="netFee" type="number" defaultValue={enrollment.netFee} className="rounded-xl h-12" required />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Enrollment Status</Label>
                <Select name="status" defaultValue={enrollment.status}>
                  <SelectTrigger className="rounded-xl h-12"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {["applied", "enrolled", "active", "completed", "dropped"].map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full h-12 rounded-2xl font-black text-lg shadow-xl shadow-primary/20">
              {loading ? "Updating..." : "Save Changes"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Remove Enrollment?"
        description={`This will remove ${enrollment.studentName} from the batch. Student record will NOT be deleted, only the enrollment for this batch.`}
        onConfirm={async () => {
          await deleteEnrollment(enrollment.id);
          setIsDeleteOpen(false);
        }}
      />
    </div>
  );
}
