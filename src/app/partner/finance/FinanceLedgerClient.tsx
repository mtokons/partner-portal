"use client";

import { useState, useTransition } from "react";
import { 
  Search, Save, CheckCircle, AlertCircle, Loader2, 
  TrendingUp, Wallet, ArrowUpRight, DollarSign, Calendar
} from "lucide-react";
import { updateCandidateFinanceAction } from "../candidates/actions";
import type { Candidate, Partner } from "@/types";

interface FinanceLedgerClientProps {
  initialCandidates: Candidate[];
  partner: Partner;
}

interface RowState {
  candidateId: string;
  totalServiceFee: number;
  depositAmount: number;
  dueDate: string;
  payoutStatus: string;
  isSaving: boolean;
  isSaved: boolean;
  error?: string;
}

export default function FinanceLedgerClient({
  initialCandidates,
  partner
}: FinanceLedgerClientProps) {
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  // Initialize interactive row states from candidates notes JSON
  const [rowStates, setRowStates] = useState<Record<string, RowState>>(() => {
    const states: Record<string, RowState> = {};
    initialCandidates.forEach((c) => {
      let dueDate = "";
      let payoutStatus = "Unpaid";
      try {
        if (c.notes && c.notes.trim().startsWith("{")) {
          const parsed = JSON.parse(c.notes);
          dueDate = parsed.dueDate || "";
          payoutStatus = parsed.payoutStatus || "Unpaid";
        }
      } catch {}

      states[c.id] = {
        candidateId: c.id,
        totalServiceFee: c.totalServiceFee || 0,
        depositAmount: c.depositAmount || 0,
        dueDate,
        payoutStatus,
        isSaving: false,
        isSaved: false
      };
    });
    return states;
  });

  const handleFieldChange = (
    candidateId: string,
    field: "totalServiceFee" | "depositAmount" | "dueDate" | "payoutStatus",
    value: string | number
  ) => {
    setRowStates((prev) => {
      const current = prev[candidateId];
      if (!current) return prev;

      return {
        ...prev,
        [candidateId]: {
          ...current,
          [field]: value,
          isSaved: false, // Reset saved status on edit
          error: undefined
        }
      };
    });
  };

  const handleSaveRow = async (candidateId: string) => {
    const state = rowStates[candidateId];
    if (!state) return;

    // Set saving
    setRowStates((prev) => ({
      ...prev,
      [candidateId]: { ...prev[candidateId], isSaving: true, error: undefined }
    }));

    // Calculate Partner Share and SCCG Share
    const marginPercent = initialCandidates.find(c => c.id === candidateId)?.marginPercentage || 15;
    const partnerShare = state.totalServiceFee * (Number(marginPercent) / 100);
    const sccgShare = state.totalServiceFee - partnerShare;

    try {
      const res = await updateCandidateFinanceAction(candidateId, {
        totalServiceFee: state.totalServiceFee,
        depositAmount: state.depositAmount,
        partnerShare,
        sccgShare,
        dueDate: state.dueDate,
        payoutStatus: state.payoutStatus
      });

      if (res.success) {
        setRowStates((prev) => ({
          ...prev,
          [candidateId]: { 
            ...prev[candidateId], 
            isSaving: false, 
            isSaved: true 
          }
        }));

        // Update local candidate array with calculated splits
        setCandidates((prevList) => 
          prevList.map((c) => 
            c.id === candidateId 
              ? { 
                  ...c, 
                  totalServiceFee: state.totalServiceFee, 
                  depositAmount: state.depositAmount,
                  partnerShare,
                  sccgShare,
                  paymentStatus: state.depositAmount >= state.totalServiceFee && state.totalServiceFee > 0 
                    ? "fully-paid" 
                    : state.depositAmount > 0 
                    ? "deposit-paid" 
                    : "pending"
                } 
              : c
          )
        );

        // Clear green saved icon after 3 seconds
        setTimeout(() => {
          setRowStates((prev) => {
            if (prev[candidateId]?.isSaved) {
              return {
                ...prev,
                [candidateId]: { ...prev[candidateId], isSaved: false }
              };
            }
            return prev;
          });
        }, 3000);
      } else {
        throw new Error(res.error || "Save failed");
      }
    } catch (err: any) {
      setRowStates((prev) => ({
        ...prev,
        [candidateId]: { 
          ...prev[candidateId], 
          isSaving: false, 
          error: err.message || "Failed to save" 
        }
      }));
    }
  };

  // Filter candidates by search query
  const filteredCandidates = candidates.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.fullName.toLowerCase().includes(q) ||
      (c.sccgId && c.sccgId.toLowerCase().includes(q)) ||
      c.email.toLowerCase().includes(q)
    );
  });

  // Calculate totals
  const totalSalesAll = candidates.reduce((acc, c) => acc + (rowStates[c.id]?.totalServiceFee || 0), 0);
  const totalReceivedAll = candidates.reduce((acc, c) => acc + (rowStates[c.id]?.depositAmount || 0), 0);
  const totalDueAll = totalSalesAll - totalReceivedAll;
  
  const totalPartnerShareAll = candidates.reduce((acc, c) => {
    const state = rowStates[c.id];
    const marginPercent = c.marginPercentage || 15;
    const fee = state ? state.totalServiceFee : c.totalServiceFee;
    return acc + (fee * (Number(marginPercent) / 100));
  }, 0);

  const totalSccgShareAll = totalSalesAll - totalPartnerShareAll;

  return (
    <div className="space-y-6">
      {/* Search & Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Interactive Financial Ledger</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Spreadsheet-style grid where you can update sales, track splits, manage payout statuses, and set due dates.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search candidates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-muted border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total Sales", value: totalSalesAll, icon: DollarSign, color: "text-foreground" },
          { label: "Deposit Paid", value: totalReceivedAll, icon: Wallet, color: "text-emerald-500" },
          { label: "Total Due", value: totalDueAll, icon: ArrowUpRight, color: "text-rose-500" },
          { label: "Partner Share", value: totalPartnerShareAll, icon: TrendingUp, color: "text-primary" },
          { label: "SCCG Share", value: totalSccgShareAll, icon: DollarSign, color: "text-indigo-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card/50 border border-white/10 rounded-2xl p-4 flex items-center justify-between shadow-lg backdrop-blur-md">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
              <p className={`text-lg font-bold mt-1 ${color}`}>
                €{value.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-muted-foreground">
              <Icon className="w-4 h-4" />
            </div>
          </div>
        ))}
      </div>

      {/* Spreadsheet Grid */}
      <div className="bg-card border border-white/10 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-muted-foreground font-bold uppercase tracking-wider select-none text-[10px]">
                <th className="px-4 py-3 min-w-[200px]">Candidate Name / ID</th>
                <th className="px-4 py-3 text-right w-[130px]">Total Sales (€)</th>
                <th className="px-4 py-3 text-right w-[130px]">Deposit Paid (€)</th>
                <th className="px-4 py-3 text-right w-[120px]">Due (€)</th>
                <th className="px-4 py-3 text-right w-[120px]">Partner Share</th>
                <th className="px-4 py-3 text-right w-[120px]">SCCG Amount</th>
                <th className="px-4 py-3 w-[150px]">Paid to SCCG</th>
                <th className="px-4 py-3 w-[150px]">Due Date</th>
                <th className="px-4 py-3 text-center w-[80px]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground text-sm">
                    No candidates found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((c) => {
                  const state = rowStates[c.id] || {
                    totalServiceFee: c.totalServiceFee,
                    depositAmount: c.depositAmount,
                    payoutStatus: "Unpaid",
                    dueDate: "",
                    isSaving: false,
                    isSaved: false
                  };

                  const dueAmount = state.totalServiceFee - state.depositAmount;
                  const partnerShare = state.totalServiceFee * (Number(c.marginPercentage || 15) / 100);
                  const sccgShare = state.totalServiceFee - partnerShare;

                  return (
                    <tr 
                      key={c.id} 
                      className={`hover:bg-white/5 transition-colors duration-150 ${
                        state.isSaved ? "bg-emerald-500/5" : ""
                      }`}
                    >
                      {/* Name & ID */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground truncate max-w-[190px]" title={c.fullName}>
                          {c.fullName}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                          {c.sccgId || c.id}
                        </div>
                      </td>

                      {/* Total Sales (Editable input) */}
                      <td className="px-4 py-3 text-right">
                        <div className="relative group">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">€</span>
                          <input
                            type="number"
                            step="0.01"
                            value={state.totalServiceFee}
                            onChange={(e) => 
                              handleFieldChange(c.id, "totalServiceFee", parseFloat(e.target.value) || 0)
                            }
                            className="w-full bg-muted/40 hover:bg-muted/70 focus:bg-muted/90 border border-white/5 focus:border-primary/50 focus:outline-none rounded-lg pl-6 pr-2 py-1 text-right font-medium text-foreground transition-all"
                          />
                        </div>
                      </td>

                      {/* Deposit Paid (Editable input) */}
                      <td className="px-4 py-3 text-right">
                        <div className="relative group">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">€</span>
                          <input
                            type="number"
                            step="0.01"
                            value={state.depositAmount}
                            onChange={(e) => 
                              handleFieldChange(c.id, "depositAmount", parseFloat(e.target.value) || 0)
                            }
                            className="w-full bg-muted/40 hover:bg-muted/70 focus:bg-muted/90 border border-white/5 focus:border-primary/50 focus:outline-none rounded-lg pl-6 pr-2 py-1 text-right font-medium text-foreground transition-all"
                          />
                        </div>
                      </td>

                      {/* Due (Calculated) */}
                      <td className="px-4 py-3 text-right font-semibold">
                        <span className={dueAmount > 0 ? "text-rose-400" : "text-emerald-400"}>
                          €{dueAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Partner Share (Calculated) */}
                      <td className="px-4 py-3 text-right font-semibold text-primary">
                        €{partnerShare.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        <span className="block text-[8px] font-normal text-muted-foreground mt-0.5">
                          ({c.marginPercentage || 15}% margin)
                        </span>
                      </td>

                      {/* SCCG Share (Calculated) */}
                      <td className="px-4 py-3 text-right font-semibold text-indigo-400">
                        €{sccgShare.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>

                      {/* Paid to SCCG status (Dropdown selection) */}
                      <td className="px-4 py-3">
                        <select
                          value={state.payoutStatus}
                          onChange={(e) => handleFieldChange(c.id, "payoutStatus", e.target.value)}
                          className="w-full bg-muted border border-white/5 focus:border-primary/50 focus:outline-none rounded-lg px-2.5 py-1.5 font-medium text-foreground cursor-pointer transition-all"
                        >
                          <option value="Unpaid">Unpaid</option>
                          <option value="Paid to SCCG">Paid to SCCG</option>
                          <option value="Paid to Partner">Paid to Partner</option>
                          <option value="Fully Settled">Fully Settled</option>
                        </select>
                      </td>

                      {/* Due Date (Interactive calendar selection) */}
                      <td className="px-4 py-3">
                        <div className="relative flex items-center">
                          <Calendar className="absolute left-2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                          <input
                            type="date"
                            value={state.dueDate}
                            onChange={(e) => handleFieldChange(c.id, "dueDate", e.target.value)}
                            className="w-full bg-muted border border-white/5 focus:border-primary/50 focus:outline-none rounded-lg pl-8 pr-2 py-1.5 font-mono text-[10px] text-foreground cursor-pointer transition-all"
                          />
                        </div>
                      </td>

                      {/* Action save trigger */}
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleSaveRow(c.id)}
                          disabled={state.isSaving}
                          className={`p-2 rounded-lg border transition-all cursor-pointer ${
                            state.isSaved 
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                              : state.error 
                              ? "bg-red-500/10 border-red-500/20 text-red-400"
                              : "bg-white/5 hover:bg-white/10 border-white/10 text-muted-foreground hover:text-foreground"
                          }`}
                          title={state.error || "Save Row"}
                        >
                          {state.isSaving ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                          ) : state.isSaved ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          ) : state.error ? (
                            <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                          ) : (
                            <Save className="w-3.5 h-3.5" />
                          )}
                        </button>
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
  );
}
