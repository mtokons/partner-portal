"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { Candidate, WorkflowCategory, SuccessStory } from "@/types";
import { createSuccessStoryAction, deleteSuccessStoryAction } from "./actions";
import { recordPaymentAction } from "@/app/partner/candidates/actions";

type SuccessfulCandidate = Candidate & { partnerName: string };

const CATEGORIES: WorkflowCategory[] = [
  "Training & Language",
  "Ausbildung",
  "Student",
  "Opportunity Card",
  "Others",
];

const CATEGORY_COLORS: Record<WorkflowCategory, string> = {
  "Training & Language": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  Ausbildung: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  Student: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  "Opportunity Card": "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
  Others: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

export default function SuccessfulCandidatesClient({
  candidates,
  partners,
  initialStories = [],
}: {
  candidates: SuccessfulCandidate[];
  partners: { id: string; name: string }[];
  initialStories?: SuccessStory[];
}) {
  const [activeCategory, setActiveCategory] = useState<WorkflowCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [partnerId, setPartnerId] = useState("all");

  // Success Stories state
  const [stories, setStories] = useState<SuccessStory[]>(initialStories);
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({ name: "", profession: "", service: "", story: "" });
  const [photo, setPhoto] = useState<{ base64: string; name: string; type: string } | null>(null);
  const [storyError, setStoryError] = useState<string | null>(null);

  // Payment modal state
  const [paymentCandidate, setPaymentCandidate] = useState<SuccessfulCandidate | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentError, setPaymentError] = useState<string | null>(null);

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setStoryError("Photo must be under 5MB"); return; }
    const reader = new FileReader();
    reader.onload = () => setPhoto({ base64: String(reader.result), name: file.name, type: file.type });
    reader.readAsDataURL(file);
  }

  function submitStory(e: React.FormEvent) {
    e.preventDefault();
    setStoryError(null);
    if (!form.name.trim() || !form.profession.trim() || !form.service.trim()) {
      setStoryError("Name, profession and service are required");
      return;
    }
    startTransition(async () => {
      const res = await createSuccessStoryAction({
        name: form.name,
        profession: form.profession,
        service: form.service,
        story: form.story,
        photoBase64: photo?.base64,
        photoName: photo?.name,
        photoType: photo?.type,
      });
      if (res.success && res.story) {
        setStories((prev) => [res.story!, ...prev]);
        setStoryModalOpen(false);
        setForm({ name: "", profession: "", service: "", story: "" });
        setPhoto(null);
      } else {
        setStoryError(res.error || "Failed to add success story");
      }
    });
  }

  function removeStory(id: string) {
    if (!confirm("Delete this success story?")) return;
    startTransition(async () => {
      const res = await deleteSuccessStoryAction(id);
      if (res.success) setStories((prev) => prev.filter((s) => s.id !== id));
      else alert(res.error || "Failed to delete");
    });
  }

  function submitPayment(e: React.FormEvent) {
    e.preventDefault();
    setPaymentError(null);
    if (!paymentCandidate) return;
    const amountNum = parseFloat(paymentAmount.replace(",", "."));
    if (isNaN(amountNum) || amountNum <= 0) {
      setPaymentError("Enter a valid positive amount");
      return;
    }
    startTransition(async () => {
      const res = await recordPaymentAction({
        candidateId: paymentCandidate.id,
        amountEur: amountNum,
        isInitialPayment: false,
        paymentMethod,
        paymentNote,
      });
      if ("error" in res) {
        setPaymentError(res.error);
      } else {
        setPaymentCandidate(null);
        setPaymentAmount("");
        setPaymentNote("");
        alert("Payment recorded successfully!");
      }
    });
  }

  const countsByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of candidates) counts[c.workflowCategory] = (counts[c.workflowCategory] || 0) + 1;
    return counts;
  }, [candidates]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return candidates.filter((c) => {
      if (activeCategory !== "all" && c.workflowCategory !== activeCategory) return false;
      if (partnerId !== "all" && c.partnerId !== partnerId) return false;
      if (q && !(c.fullName.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.sccgId.toLowerCase().includes(q))) {
        return false;
      }
      return true;
    });
  }, [candidates, activeCategory, partnerId, query]);

  return (
    <div className="space-y-4">
      {/* Success Stories */}
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Star className="h-4 w-4 text-amber-500" /> Success Stories
          </h2>
          <button
            onClick={() => setStoryModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" /> Add Success Story
          </button>
        </div>
        {stories.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">No success stories yet. Add one to showcase a candidate.</p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stories.map((s) => (
              <div key={s.id} className="group relative flex gap-3 rounded-xl border bg-background p-3">
                {s.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.photoUrl} alt={s.name} className="h-14 w-14 shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30">
                    <Award className="h-6 w-6" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">{s.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{s.profession}</p>
                  <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">{s.service}</span>
                </div>
                <button
                  onClick={() => removeStory(s.id)}
                  className="absolute right-2 top-2 rounded-lg p-1 text-muted-foreground opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveCategory("all")}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            activeCategory === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
          }`}
        >
          All ({candidates.length})
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeCategory === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {cat} ({countsByCategory[cat] || 0})
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, or SCCG ID..."
            className="w-full rounded-xl border border-input bg-background pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <select
          value={partnerId}
          onChange={(e) => setPartnerId(e.target.value)}
          className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">All Partners</option>
          {partners.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No successful candidates match your filters yet.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <Link
              key={c.id}
              href={`/partner/candidates/${c.id}`}
              className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-foreground">{c.fullName}</p>
                  <p className="text-xs text-muted-foreground">{c.sccgId}</p>
                </div>
                <Award className="w-5 h-5 text-emerald-500 shrink-0" />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold uppercase ${CATEGORY_COLORS[c.workflowCategory]}`}>
                  {c.workflowCategory}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                  {c.currentStatus.replace(/_/g, " ")}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground mb-3">Partner: {c.partnerName}</p>
              
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setPaymentCandidate(c);
                  }}
                  className="flex-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
                >
                  Add Payment
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Add Payment Modal */}
      {paymentCandidate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <form onSubmit={submitPayment} className="w-full max-w-sm space-y-4 rounded-2xl border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-foreground">Record Payment</h3>
              <button type="button" onClick={() => setPaymentCandidate(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div>
              <p className="text-sm font-semibold">{paymentCandidate.fullName}</p>
              <p className="text-xs text-muted-foreground">{paymentCandidate.sccgId}</p>
            </div>
            
            {paymentError && (
              <div className="p-3 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-900/30 dark:text-red-400">
                {paymentError}
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Amount (EUR) *</label>
              <input 
                type="number" step="0.01" 
                value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full rounded-xl border bg-background px-3 py-2 text-sm" 
                placeholder="e.g. 500" required 
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Payment Method</label>
              <select 
                value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
              >
                <option>Bank Transfer</option>
                <option>Cash</option>
                <option>Credit Card</option>
                <option>PayPal</option>
                <option>bKash / Nagad</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Reference / Note</label>
              <input 
                value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)}
                className="w-full rounded-xl border bg-background px-3 py-2 text-sm" 
                placeholder="Transaction ID or note..." 
              />
            </div>

            <button type="submit" disabled={isPending} className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {isPending ? "Saving..." : "Save Payment"}
            </button>
          </form>
        </div>
      )}

      {/* Add Success Story Modal */}
      {storyModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <form onSubmit={submitStory} className="w-full max-w-md space-y-4 rounded-2xl border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
                <Star className="h-5 w-5 text-amber-500" /> Add Success Story
              </h3>
              <button type="button" onClick={() => setStoryModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Name *</label>
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full rounded-xl border bg-background px-3 py-2 text-sm" placeholder="Candidate name" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Profession *</label>
              <input value={form.profession} onChange={(e) => setForm((p) => ({ ...p, profession: e.target.value }))}
                className="w-full rounded-xl border bg-background px-3 py-2 text-sm" placeholder="e.g. Nurse, Software Engineer" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Service *</label>
              <input value={form.service} onChange={(e) => setForm((p) => ({ ...p, service: e.target.value }))}
                className="w-full rounded-xl border bg-background px-3 py-2 text-sm" placeholder="e.g. Opportunity Card" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Story (optional)</label>
              <textarea value={form.story} onChange={(e) => setForm((p) => ({ ...p, story: e.target.value }))} rows={3}
                className="w-full rounded-xl border bg-background px-3 py-2 text-sm" placeholder="A short success story..." />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Photo (optional)</label>
              <input type="file" accept="image/png,image/jpeg" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPhoto(f); }}
                className="w-full text-xs" />
              {photo && <p className="text-[11px] text-emerald-600">Selected: {photo.name}</p>}
            </div>
            {storyError && <p className="text-xs text-red-500">{storyError}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setStoryModalOpen(false)} className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button>
              <button type="submit" disabled={isPending} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : "Save Story"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
