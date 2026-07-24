"use client";

import { useState, useEffect, useRef } from "react";
import { Search, UserPlus, User, Edit2, Check, X, ArrowRight, Loader2 } from "lucide-react";
import { 
  searchCandidatesAction, 
  getPartnerCandidatesAction, 
  updateCandidateAction,
  getCandidateDocumentsAction,
} from "@/app/partner/candidates/actions";
import type { Candidate } from "@/types";
import type { WizardState } from "../WizardShell";

interface Step1LookupProps {
  onNext: (partial: Partial<WizardState> & { targetStep?: number }) => void;
}

export function Step1Lookup({ onNext }: Step1LookupProps) {
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Candidate>>({});
  const [saveError, setSaveError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load all candidates of the partner on mount
  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await getPartnerCandidatesAction();
      setCandidates(data);
      setLoading(false);
    }
    load();
  }, []);

  // Sync debounce search if there is a query, otherwise fall back to full local array
  useEffect(() => {
    if (!query.trim()) {
      setSearching(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const res = await searchCandidatesAction(query);
      // Merge results with existing local state to preserve any local edits
      setCandidates((prev) => {
        const merged = [...prev];
        res.forEach((r) => {
          if (!merged.some((m) => m.id === r.id)) {
            merged.push(r);
          }
        });
        return merged;
      });
      setSearching(false);
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Filter local candidates list dynamically
  const filteredCandidates = candidates.filter((c) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      c.fullName.toLowerCase().includes(q) ||
      (c.sccgId && c.sccgId.toLowerCase().includes(q)) ||
      c.email.toLowerCase().includes(q)
    );
  });

  async function selectExisting(c: Candidate) {
    // Load previously uploaded documents for reuse
    let existingDocs: { documentType: string; fileUrl: string; fileName: string }[] = [];
    try {
      const docsResult = await getCandidateDocumentsAction(c.id, c.fullName);
      if ("files" in docsResult && Array.isArray(docsResult.files)) {
        existingDocs = docsResult.files.map((f: { name: string; webUrl: string }) => ({
          documentType: f.name.split(".")[0].replace(/-/g, " "),
          fileUrl: f.webUrl,
          fileName: f.name,
        }));
      }
    } catch {
      // Continue without pre-loaded docs
    }

    onNext({
      existingCandidateId: c.id,
      isNewCandidate: false,
      personalInfo: {
        fullName: c.fullName,
        dateOfBirth: c.dateOfBirth || "",
        email: c.email,
        phone: c.phone,
        address: c.address || "",
        passportNumber: c.passportNumber || "",
        nationalId: c.nationalId || "",
        nationality: c.nationality,
        country: c.country,
        workflowCategory: c.workflowCategory,
      },
      selectedServices: [],
      paymentOption: "pay-later",
      uploadedDocuments: existingDocs,
      targetStep: 3, // Directly skip to service package selection
    });
  }

  function startEdit(c: Candidate) {
    setEditingId(c.id);
    setEditForm({
      fullName: c.fullName,
      email: c.email,
      phone: c.phone,
      nationality: c.nationality,
      country: c.country,
    });
    setSaveError("");
  }

  async function saveEdit(id: string) {
    if (!editForm.fullName || !editForm.email) {
      setSaveError("Name and Email are required");
      return;
    }
    setSavingId(id);
    setSaveError("");
    try {
      const res = await updateCandidateAction(id, editForm);
      if ("error" in res) {
        setSaveError(res.error);
        setSavingId(null);
        return;
      }
      setCandidates((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...editForm } : c))
      );
      setEditingId(null);
    } catch (err) {
      setSaveError("Failed to update candidate");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Find or Create Candidate</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Search registered roster below, update details inline, or initialize a completely new candidate registration.
        </p>
      </div>

      {/* Top Search bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type to filter directory or search live..."
          className="w-full pl-11 pr-4 py-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
        />
        {searching && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" /> Searching...
          </span>
        )}
      </div>

      {/* Create New Candidate Button */}
      <button
        onClick={() => {
          onNext({
            isNewCandidate: true,
            existingCandidateId: undefined,
            personalInfo: {
              fullName: "",
              dateOfBirth: "",
              email: "",
              phone: "",
              nationality: "",
              country: "",
              workflowCategory: "Training & Language",
            },
            selectedServices: [],
            paymentOption: "pay-later",
            uploadedDocuments: [],
            targetStep: 2, // Standard next step
          });
        }}
        className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/30 hover:border-primary/60 py-4.5 text-sm font-semibold text-primary hover:bg-primary/5 transition-all shadow-sm"
      >
        <UserPlus className="w-4 h-4" />
        Create New Candidate
      </button>

      {/* Roster Directory Table */}
      <div className="pt-4 border-t">
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <User className="w-4 h-4 text-primary" /> Current Candidates Directory ({filteredCandidates.length})
        </h3>

        {saveError && (
          <div className="p-3 mb-3 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold">
            {saveError}
          </div>
        )}

        <div className="border rounded-2xl overflow-hidden bg-card/40 backdrop-blur-md shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-muted/50 border-b text-muted-foreground font-semibold uppercase tracking-wider">
                  <th className="px-4 py-3">Candidate ID</th>
                  <th className="px-4 py-3">Full Name</th>
                  <th className="px-4 py-3">Email Address</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Nationality</th>
                  <th className="px-4 py-3">Workflow</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y font-medium text-foreground">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <span className="text-sm">Loading candidates roster...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No candidates found. Click "Create New Candidate" to register one.
                    </td>
                  </tr>
                ) : (
                  filteredCandidates.map((c) => {
                    const isEditing = editingId === c.id;
                    const isSaving = savingId === c.id;

                    return (
                      <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-primary">{c.sccgId || "Pending"}</td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <input
                              value={editForm.fullName || ""}
                              onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                              className="px-2 py-1 bg-background border rounded w-full focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          ) : (
                            c.fullName
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <input
                              value={editForm.email || ""}
                              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                              className="px-2 py-1 bg-background border rounded w-full focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          ) : (
                            c.email
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <input
                              value={editForm.phone || ""}
                              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                              className="px-2 py-1 bg-background border rounded w-full focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          ) : (
                            c.phone
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <input
                              value={editForm.nationality || ""}
                              onChange={(e) => setEditForm({ ...editForm, nationality: e.target.value })}
                              className="px-2 py-1 bg-background border rounded w-full focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          ) : (
                            c.nationality
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary">
                            {c.workflowCategory}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isEditing ? (
                              <>
                                <button
                                  disabled={isSaving}
                                  onClick={() => saveEdit(c.id)}
                                  className="p-1 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 disabled:opacity-50"
                                >
                                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  disabled={isSaving}
                                  onClick={() => setEditingId(null)}
                                  className="p-1 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEdit(c)}
                                  className="p-1 rounded-lg bg-muted hover:bg-muted-foreground/10 text-muted-foreground hover:text-foreground transition-colors"
                                  title="Edit Info Inline"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => selectExisting(c)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/95 transition-all shadow-sm"
                                >
                                  Select <ArrowRight className="w-3 h-3" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
