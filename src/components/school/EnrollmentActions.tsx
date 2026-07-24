"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, BookOpen, CreditCard, CheckCircle2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import {
  deleteEnrollment, updateEnrollment,
  assignBatchToEnrollmentAction, confirmEnrollmentPaymentAction,
  fetchAvailableBatches,
} from "@/app/(portal)/admin/school/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { IssueCertificateButton } from "@/components/IssueCertificateButton";
import type { SchoolEnrollment, SchoolStudentStatus } from "@/types";

interface BatchOption { id: string; batchCode: string; batchName: string; courseFee?: number; }

interface EnrollmentActionsProps {
  enrollment: SchoolEnrollment;
}

export function EnrollmentActions({ enrollment }: EnrollmentActionsProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isAssignBatchOpen, setIsAssignBatchOpen] = useState(false);
  const [isConfirmPayOpen, setIsConfirmPayOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Assign batch state
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState("");

  // Confirm payment state
  const [amountPaid, setAmountPaid] = useState(String(enrollment.netFee || ""));
  const [payError, setPayError] = useState<string | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);

  const noBatch = !enrollment.batchId || enrollment.batchId === "" || enrollment.batchId === "pending";
  const paymentPending = enrollment.paymentStatus !== "paid";

  useEffect(() => {
    if (isAssignBatchOpen && batches.length === 0) {
      setLoadingBatches(true);
      fetchAvailableBatches()
        .then(setBatches)
        .catch(console.error)
        .finally(() => setLoadingBatches(false));
    }
  }, [isAssignBatchOpen, batches.length]);

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

  const handleAssignBatch = async () => {
    if (!selectedBatchId) return setBatchError("Please select a batch");
    setBatchError(null);
    setLoading(true);
    try {
      await assignBatchToEnrollmentAction(enrollment.id, selectedBatchId);
      setIsAssignBatchOpen(false);
    } catch (err) {
      setBatchError(err instanceof Error ? err.message : "Failed to assign batch");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async () => {
    const amt = parseFloat(amountPaid);
    if (!amt || amt <= 0) return setPayError("Enter a valid amount");
    setPayError(null);
    setLoading(true);
    try {
      await confirmEnrollmentPaymentAction(enrollment.id, amt);
      setIsConfirmPayOpen(false);
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Failed to confirm payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-1.5">
      {/* Assign Batch — shown when no batch assigned */}
      {noBatch && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAssignBatchOpen(true)}
          className="h-8 rounded-lg text-xs font-bold text-violet-700 border-violet-200 hover:bg-violet-50 gap-1.5"
        >
          <BookOpen className="h-3.5 w-3.5" /> Assign Batch
        </Button>
      )}

      {/* Confirm Payment — shown when payment not yet confirmed */}
      {paymentPending && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsConfirmPayOpen(true)}
          className="h-8 rounded-lg text-xs font-bold text-emerald-700 border-emerald-200 hover:bg-emerald-50 gap-1.5"
        >
          <CreditCard className="h-3.5 w-3.5" /> Confirm Pay
        </Button>
      )}

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

      {/* ── Assign Batch Modal ── */}
      <Dialog open={isAssignBatchOpen} onOpenChange={setIsAssignBatchOpen}>
        <DialogContent className="rounded-[32px] sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Assign Batch</DialogTitle>
            <p className="text-sm text-muted-foreground">{enrollment.studentName}</p>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {loadingBatches ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary/40" />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto pr-1">
                {batches.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">No active batches available</p>
                )}
                {batches.map((b) => {
                  const selected = selectedBatchId === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedBatchId(b.id)}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${
                        selected
                          ? "border-violet-500 bg-violet-50 text-violet-900"
                          : "border-gray-100 hover:border-violet-200"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-black text-sm">{b.batchName}</span>
                        <Badge variant="outline" className="font-mono text-[10px]">{b.batchCode}</Badge>
                      </div>
                      {b.courseFee && (
                        <p className="text-xs font-bold mt-1 text-muted-foreground">৳{b.courseFee.toLocaleString()}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            {batchError && <p className="text-xs text-red-600 font-bold">{batchError}</p>}
            <Button
              onClick={handleAssignBatch}
              disabled={loading || !selectedBatchId}
              className="w-full h-12 rounded-2xl font-black shadow-xl shadow-primary/20"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Assign Batch"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Confirm Payment Modal ── */}
      <Dialog open={isConfirmPayOpen} onOpenChange={setIsConfirmPayOpen}>
        <DialogContent className="rounded-[32px] sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Confirm Payment</DialogTitle>
            <p className="text-sm text-muted-foreground">{enrollment.studentName}</p>
          </DialogHeader>
          <div className="space-y-5 pt-4">
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1.5">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Enrollment Fee</p>
              <p className="text-2xl font-black text-primary">৳{enrollment.netFee?.toLocaleString()}</p>
              {enrollment.enrollmentSource === "partner" && enrollment.partnerName && (
                <p className="text-xs font-bold text-emerald-700">Via partner: {enrollment.partnerName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Amount Received (৳)</Label>
              <Input
                type="number"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="h-12 rounded-xl font-black text-lg"
              />
            </div>
            {payError && <p className="text-xs text-red-600 font-bold">{payError}</p>}
            <Button
              onClick={handleConfirmPayment}
              disabled={loading}
              className="w-full h-12 rounded-2xl font-black shadow-xl shadow-primary/20 gap-2"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><CheckCircle2 className="h-4 w-4" /> Mark as Paid</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit Modal ── */}
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
                <Label className="font-bold">Net Fee (৳)</Label>
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

      {/* ── Delete Confirmation ── */}
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
