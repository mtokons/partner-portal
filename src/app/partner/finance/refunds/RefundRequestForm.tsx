"use client";

import { useState } from "react";
import { Send, RotateCcw } from "lucide-react";
import { submitRefundRequest } from "./actions";

interface RefundCandidate {
  id: string;
  name: string;
  amountPaid: number;
  category: string;
}

export default function RefundRequestForm({ candidates }: { candidates: RefundCandidate[] }) {
  const [candidateId, setCandidateId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const selected = candidates.find((c) => c.id === candidateId);

  async function handleSubmit() {
    if (!candidateId || !amount || !reason.trim()) {
      setError("Please fill all required fields.");
      return;
    }
    const refundAmount = parseFloat(amount);
    if (selected && refundAmount > selected.amountPaid) {
      setError(`Refund cannot exceed the paid amount (€${selected.amountPaid.toFixed(2)}).`);
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await submitRefundRequest({
        candidateId,
        candidateName: selected?.name || "",
        amount: refundAmount,
        reason: reason.trim(),
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit refund request");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="bg-card border rounded-2xl p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
          <RotateCcw className="w-8 h-8 text-emerald-500" />
        </div>
        <h2 className="text-xl font-bold">Refund Request Submitted</h2>
        <p className="text-muted-foreground mt-2">
          Your request for €{parseFloat(amount).toFixed(2)} refund has been submitted for review.
          You will be notified once it&apos;s processed.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-2xl p-6 space-y-5">
      <h2 className="font-semibold text-foreground">Submit Refund Request</h2>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">{error}</div>
      )}

      {candidates.length === 0 ? (
        <p className="text-muted-foreground text-sm">No candidates with payments eligible for refund.</p>
      ) : (
        <>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Select Candidate</label>
            <select
              value={candidateId}
              onChange={(e) => {
                setCandidateId(e.target.value);
                const c = candidates.find((c) => c.id === e.target.value);
                if (c) setAmount(c.amountPaid.toString());
              }}
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Choose a candidate...</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.category} — Paid: €{c.amountPaid.toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          {selected && (
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              <p className="font-medium">{selected.name}</p>
              <p className="text-muted-foreground">Max refundable: €{selected.amountPaid.toFixed(2)}</p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Refund Amount (€)</label>
            <input
              type="number"
              min={0}
              step={0.01}
              max={selected?.amountPaid || 0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Reason for Refund</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Please explain why this refund is requested..."
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting || !candidateId || !amount || !reason.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
            {submitting ? "Submitting..." : "Submit Refund Request"}
          </button>
        </>
      )}
    </div>
  );
}
