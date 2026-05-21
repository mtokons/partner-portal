"use client";

import { useState, useEffect, useRef } from "react";
import { Search, UserPlus, User } from "lucide-react";
import { searchCandidatesAction } from "@/app/(portal)/partner/candidates/actions";
import type { Candidate } from "@/types";
import type { WizardState } from "../WizardShell";

interface Step1LookupProps {
  onNext: (partial: Partial<WizardState>) => void;
  onNextStep: () => void;
}

export function Step1Lookup({ onNext, onNextStep }: Step1LookupProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Candidate[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const res = await searchCandidatesAction(query);
      setResults(res);
      setSearching(false);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function selectExisting(c: Candidate) {
    onNext({
      existingCandidateId: c.id,
      isNewCandidate: false,
      personalInfo: {
        fullName: c.fullName,
        dateOfBirth: c.dateOfBirth,
        email: c.email,
        phone: c.phone,
        address: c.address,
        passportNumber: c.passportNumber,
        nationalId: c.nationalId,
        nationality: c.nationality,
        country: c.country,
        workflowCategory: c.workflowCategory,
      },
    });
    onNextStep();
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Find or Create Candidate</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Search by name, SCCG ID, or email to find an existing candidate, or create a new one.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search candidates…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        {searching && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            Searching…
          </span>
        )}
      </div>

      {results.length > 0 && (
        <div className="border rounded-xl divide-y overflow-hidden">
          {results.map((c) => (
            <button
              key={c.id}
              onClick={() => selectExisting(c)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">{c.fullName}</p>
                <p className="text-xs text-muted-foreground">
                  {c.sccgId} · {c.email}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {query && results.length === 0 && !searching && (
        <p className="text-sm text-muted-foreground text-center py-2">
          No candidates found. Create a new one below.
        </p>
      )}

      <button
        onClick={() => { onNext({ isNewCandidate: true, existingCandidateId: undefined }); onNextStep(); }}
        className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/40 py-4 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
      >
        <UserPlus className="w-4 h-4" />
        Create New Candidate
      </button>
    </div>
  );
}
