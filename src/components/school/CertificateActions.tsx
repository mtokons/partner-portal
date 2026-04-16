"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { CertificateDownloadButton } from "@/components/CertificateDownloadButton";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { revokeCertificateAction } from "@/app/(portal)/admin/school/actions";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, AlertTriangle } from "lucide-react";
import type { SchoolCertificate } from "@/types";

interface CertificateActionsProps {
  certificate: SchoolCertificate;
}

export function CertificateActions({ certificate }: CertificateActionsProps) {
  const [isRevokeOpen, setIsRevokeOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRevoke() {
    if (!revokeReason.trim()) return;
    setLoading(true);
    try {
      await revokeCertificateAction(certificate.id, revokeReason);
      setIsRevokeOpen(false);
      setRevokeReason("");
    } catch (err) {
      console.error("Failed to revoke certificate:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <CertificateDownloadButton certificate={certificate} />
      {certificate.status === "issued" && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsRevokeOpen(true)}
          className="h-8 w-8 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}

      {/* Revoke Confirmation Dialog */}
      <Dialog open={isRevokeOpen} onOpenChange={setIsRevokeOpen}>
        <DialogContent className="rounded-[32px] sm:max-w-[425px]">
          <DialogHeader>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 mb-4">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <DialogTitle className="text-center text-2xl font-black">Revoke Certificate?</DialogTitle>
            <p className="text-center text-gray-500 font-medium text-sm">
              This will permanently revoke certificate <strong>{certificate.certificateNumber}</strong> for {certificate.studentName}. This action cannot be undone.
            </p>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Reason for revocation (required)"
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              className="rounded-xl h-12"
            />
          </div>
          <DialogFooter className="flex-col gap-3 sm:flex-col sm:space-x-0">
            <Button
              variant="destructive"
              onClick={handleRevoke}
              disabled={loading || !revokeReason.trim()}
              className="w-full h-14 rounded-2xl font-black text-lg bg-red-600 hover:bg-red-700 shadow-xl shadow-red-200"
            >
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "Confirm Revoke"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setIsRevokeOpen(false)}
              disabled={loading}
              className="w-full h-12 rounded-2xl font-bold text-gray-500 hover:bg-gray-50"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
