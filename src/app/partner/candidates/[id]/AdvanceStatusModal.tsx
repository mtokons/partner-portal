"use client";

import { useState, useEffect, useRef } from "react";
import { X, MessageSquare, Loader2, ArrowRight } from "lucide-react";
import { formatStatusLabel } from "@/lib/engine/candidate-workflow";

interface AdvanceStatusModalProps {
  isOpen: boolean;
  candidateName: string;
  fromStatus: string;
  toStatus: string;
  isPending: boolean;
  onConfirm: (comment: string) => void;
  onClose: () => void;
}

export function AdvanceStatusModal({
  isOpen,
  candidateName,
  fromStatus,
  toStatus,
  isPending,
  onConfirm,
  onClose,
}: AdvanceStatusModalProps) {
  const [comment, setComment] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setComment("");
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onConfirm(comment.trim());
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-card rounded-2xl border shadow-2xl w-full max-w-md p-6 space-y-5 animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Close */}
        <button
          onClick={onClose}
          disabled={isPending}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="space-y-1.5">
          <h2 className="font-semibold text-lg">Advance Workflow Status</h2>
          <p className="text-sm text-muted-foreground">
            For <span className="font-medium text-foreground">{candidateName}</span>
          </p>
        </div>

        {/* Status transition */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/40 border">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">From</p>
            <p className="text-sm font-medium text-foreground">{formatStatusLabel(fromStatus)}</p>
          </div>
          <ArrowRight className="w-4 h-4 text-primary shrink-0" />
          <div className="flex-1 text-right">
            <p className="text-xs text-muted-foreground">To</p>
            <p className="text-sm font-bold text-primary">{formatStatusLabel(toStatus)}</p>
          </div>
        </div>

        {/* Comment */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
              Comment / Notes
              <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              ref={textareaRef}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Add a note about this status change — this will be included in the email notification to the candidate and partner…"
              className="w-full px-3 py-2.5 rounded-xl border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/25 placeholder:text-muted-foreground/40"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isPending ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Advancing…</>
              ) : (
                <>Confirm <ArrowRight className="w-3.5 h-3.5" /></>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
