"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Send, CheckCircle2 } from "lucide-react";
import { createPartnerInvoice } from "./actions";

interface Candidate { id: string; name: string; fee: number; }

export default function CreateInvoiceButton({ candidates }: { candidates: Candidate[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit() {
    if (!clientName.trim() || !amount || !dueDate) {
      setError("Please fill all required fields.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const result = await createPartnerInvoice({
        clientName: clientName.trim(),
        amount: parseFloat(amount),
        description: description || undefined,
        dueDate,
      });
      setSuccess(`Invoice ${result.invoiceNumber} created!`);
      setTimeout(() => { setOpen(false); setSuccess(""); router.refresh(); }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invoice");
    } finally {
      setSubmitting(false);
    }
  }

  function selectCandidate(id: string) {
    const c = candidates.find((c) => c.id === id);
    if (c) {
      setClientName(c.name);
      setAmount(c.fee.toString());
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors">
        <Plus className="w-4 h-4" /> Create Invoice
      </button>
    );
  }

  return (
    <div className="bg-card border-2 border-primary/20 rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">New Invoice</h3>
        <button onClick={() => { setOpen(false); setError(""); setSuccess(""); }}
          className="p-1.5 rounded-lg hover:bg-accent transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {success && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {success}
        </div>
      )}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">{error}</div>
      )}

      {candidates.length > 0 && (
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Quick Select Candidate</label>
          <select onChange={(e) => selectCandidate(e.target.value)} defaultValue=""
            className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="">Select a candidate...</option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>{c.name} — €{c.fee.toFixed(2)}</option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Client Name *</label>
          <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Client or candidate name"
            className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Amount (€) *</label>
          <input type="number" min={0} step={0.01} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
            className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Due Date *</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Description (optional)</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Service description..."
            className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
      </div>

      <button onClick={handleSubmit} disabled={submitting}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors">
        <Send className="w-4 h-4" /> {submitting ? "Creating..." : "Create Invoice"}
      </button>
    </div>
  );
}
