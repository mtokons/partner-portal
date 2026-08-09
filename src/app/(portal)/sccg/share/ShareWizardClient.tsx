"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Paperclip, Send, Search } from "lucide-react";
import type { ShareWizardCandidate, ShareWizardPartner } from "./actions";
import { fetchCandidateDocumentsForShareAction, sendCandidateShareEmailAction } from "./actions";
import type { CandidateDocument } from "@/lib/candidate-documents";

export default function ShareWizardClient({
  candidates,
  partners,
}: {
  candidates: ShareWizardCandidate[];
  partners: ShareWizardPartner[];
}) {
  const [candidateQuery, setCandidateQuery] = useState("");
  const [candidateId, setCandidateId] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [documents, setDocuments] = useState<CandidateDocument[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const candidate = useMemo(() => candidates.find((c) => c.id === candidateId) || null, [candidates, candidateId]);
  const partner = useMemo(() => partners.find((p) => p.id === partnerId) || null, [partners, partnerId]);

  const filteredCandidates = useMemo(() => {
    const q = candidateQuery.trim().toLowerCase();
    if (!q) return candidates.slice(0, 50);
    return candidates.filter(
      (c) => c.fullName.toLowerCase().includes(q) || c.sccgId.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    ).slice(0, 50);
  }, [candidates, candidateQuery]);

  useEffect(() => {
    if (!candidate) {
      setDocuments([]);
      setSelectedDocIds([]);
      return;
    }
    setDocsLoading(true);
    setSelectedDocIds([]);
    fetchCandidateDocumentsForShareAction(candidate.id, candidate.fullName)
      .then((res) => setDocuments(res.success && res.data ? res.data : []))
      .finally(() => setDocsLoading(false));
    setSubject(`Candidate Profile: ${candidate.fullName} (${candidate.sccgId})`);
    setMessage(
      `Dear Partner,\n\nPlease find attached the profile for ${candidate.fullName} (${candidate.sccgId}, ${candidate.workflowCategory}).\n\nBest regards,\nSCCG Career Lab Team`
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateId]);

  const toggleDoc = (docId: string) => {
    setSelectedDocIds((prev) => (prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]));
  };

  const canSend = candidate && partner && subject.trim() && message.trim() && !isPending;

  const send = () => {
    if (!candidate || !partner) return;
    setResult(null);
    startTransition(async () => {
      const res = await sendCandidateShareEmailAction({
        candidateId: candidate.id,
        partnerId: partner.id,
        documentIds: selectedDocIds,
        subject,
        message,
      });
      setResult(
        res.success
          ? { type: "success", text: `Profile shared with ${partner.name} successfully.` }
          : { type: "error", text: res.error || "Failed to send." }
      );
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">1. Select Candidate</h2>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={candidateQuery}
              onChange={(e) => setCandidateQuery(e.target.value)}
              placeholder="Search by name, SCCG ID, or email..."
              className="w-full rounded-xl border border-input bg-background pl-9 pr-3 py-2 text-sm"
            />
          </div>
          <select
            value={candidateId}
            onChange={(e) => setCandidateId(e.target.value)}
            size={6}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
          >
            {filteredCandidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName} — {c.sccgId} ({c.workflowCategory})
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">2. Attach CV / Profile Documents</h2>
          {!candidate ? (
            <p className="text-xs text-muted-foreground">Select a candidate first.</p>
          ) : docsLoading ? (
            <p className="text-xs text-muted-foreground">Loading documents…</p>
          ) : documents.length === 0 ? (
            <p className="text-xs text-muted-foreground">No uploaded documents found for this candidate.</p>
          ) : (
            <ul className="space-y-1.5">
              {documents.map((doc) => (
                <li key={doc.id}>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedDocIds.includes(doc.id)}
                      onChange={() => toggleDoc(doc.id)}
                    />
                    <Paperclip className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{doc.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">3. Select Partner</h2>
          <select
            value={partnerId}
            onChange={(e) => setPartnerId(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Choose a partner…</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.company})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3 h-fit">
        <h2 className="text-sm font-semibold text-foreground">4. Editable Email</h2>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">To</label>
          <input
            value={partner ? `${partner.name} <${partner.email}>` : ""}
            disabled
            className="w-full rounded-xl border border-input bg-muted px-3 py-2 text-sm text-muted-foreground"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Subject</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={8}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        {result && (
          <div
            className={`rounded-lg px-3 py-2 text-xs font-medium ${
              result.type === "success"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
            }`}
          >
            {result.text}
          </div>
        )}

        <button
          onClick={send}
          disabled={!canSend}
          className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
          {isPending ? "Sending…" : "Send to Partner"}
        </button>
      </div>
    </div>
  );
}
