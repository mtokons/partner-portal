"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  ChevronDown, ChevronRight, Eye, Package, CreditCard,
  AlertCircle, CheckCircle, Clock, ShoppingBag, UserPlus, Hourglass, Trash2, Loader2,
} from "lucide-react";
import type { Candidate, CandidateService, Product, PartnerMargin } from "@/types";
import BuyServiceDrawer from "./[id]/BuyServiceDrawer";
import { deleteCandidateAction } from "./actions";

type CandidateWithServices = Candidate & { services: CandidateService[] };

export interface WaitingOffer {
  offerId: string;
  offerNumber: string;
  name: string;
  email: string;
  totalAmount: number;
  acceptedAt?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Training & Language": "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  Ausbildung: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  "Student": "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  "Opportunity Card": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  "Others": "bg-gray-500/10 text-gray-600 dark:text-gray-400",
};

const PAYMENT_STYLES: Record<string, { color: string; icon: typeof CheckCircle }> = {
  "fully-paid": { color: "text-emerald-500", icon: CheckCircle },
  "deposit-paid": { color: "text-blue-500", icon: Clock },
  "partially-paid": { color: "text-amber-500", icon: Clock },
  pending: { color: "text-red-500", icon: AlertCircle },
  refunded: { color: "text-gray-500", icon: AlertCircle },
};

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function CandidateListClient({
  candidates,
  products = [],
  partnerMargin = 15,
  secondaryCurrency,
  exchangeRate,
  waitingOffers = [],
}: {
  candidates: CandidateWithServices[];
  products?: Product[];
  partnerMargin?: PartnerMargin;
  secondaryCurrency?: string;
  exchangeRate?: number;
  waitingOffers?: WaitingOffer[];
}) {
  const [activeTab, setActiveTab] = useState<"registered" | "waiting">(
    waitingOffers.length > 0 && candidates.length === 0 ? "waiting" : "registered"
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [serviceDrawer, setServiceDrawer] = useState<CandidateWithServices | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleDelete(candidateId: string) {
    setDeletingId(candidateId);
    setDeleteError(null);
    startTransition(async () => {
      const res = await deleteCandidateAction(candidateId);
      if (res.success) {
        setConfirmDeleteId(null);
        // Remove from local state by forcing page refresh via router is not available here;
        // The revalidatePath in the action will refresh on next navigation.
        // For immediate UI update, filter out locally:
        window.location.reload();
      } else {
        setDeleteError(res.error || "Failed to delete");
      }
      setDeletingId(null);
    });
  }

  const d = (v: number) => `€${v.toLocaleString("en", { minimumFractionDigits: 2 })}`;

  const filtered = candidates.filter((c) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      c.fullName.toLowerCase().includes(q) ||
      c.sccgId.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  });

  // Sort: newest first
  const sorted = [...filtered].sort(
    (a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")
  );

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setActiveTab("registered")}
          className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
            activeTab === "registered"
              ? "border-b-2 border-primary text-primary bg-primary/5"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          Registered Candidates
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${activeTab === "registered" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            {candidates.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("waiting")}
          className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
            activeTab === "waiting"
              ? "border-b-2 border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-500/10"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Hourglass className="w-4 h-4" />
          Waiting for Registration
          {waitingOffers.length > 0 && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${activeTab === "waiting" ? "bg-amber-500 text-white" : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"}`}>
              {waitingOffers.length}
            </span>
          )}
        </button>
      </div>

      {/* === REGISTERED CANDIDATES TAB === */}
      {activeTab === "registered" && (
        <div className="space-y-4">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search by name, ID, or email..."
            className="w-full max-w-md px-4 py-2.5 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />

          {sorted.length === 0 ? (
            <div className="bg-card border rounded-2xl p-16 text-center">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/20" />
              <p className="font-medium text-muted-foreground">
                {filter ? `No candidates match "${filter}"` : "No registered candidates yet"}
              </p>
              {!filter && (
                <Link
                  href="/partner/candidates/new"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Register a New Candidate
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {sorted.map((c) => {
                const isExpanded = expandedId === c.id;
                const paymentInfo = PAYMENT_STYLES[c.paymentStatus] || PAYMENT_STYLES.pending;
                const PaymentIcon = paymentInfo.icon;
                const totalPaid = c.depositAmount || 0;
                const remaining = c.totalServiceFee - totalPaid;

                return (
                  <div key={c.id} className="bg-card border rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : c.id)}
                      className="w-full flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors text-left"
                    >
                      <div className="shrink-0">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground truncate">{c.fullName}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold uppercase ${CATEGORY_COLORS[c.workflowCategory] || "bg-muted text-muted-foreground"}`}>
                            {c.workflowCategory}
                          </span>
                          {c.isOnHold && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-red-500/10 text-red-500">
                              On Hold
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {c.sccgId} · {c.email} · {c.createdAt ? format(parseISO(c.createdAt), "MMM d, yyyy") : ""}
                        </p>
                      </div>
                      <div className="hidden sm:flex items-center gap-6 shrink-0">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Services</p>
                          <p className="text-sm font-bold">{c.services.length}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Total Fee</p>
                          <p className="text-sm font-bold">{d(c.totalServiceFee)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Payment</p>
                          <div className={`flex items-center gap-1 text-sm font-semibold ${paymentInfo.color}`}>
                            <PaymentIcon className="w-3.5 h-3.5" />
                            <span className="capitalize text-xs">{c.paymentStatus.replace("-", " ")}</span>
                          </div>
                        </div>
                        <div className="text-center min-w-[80px]">
                          <p className="text-xs text-muted-foreground">Status</p>
                          <p className="text-xs font-semibold">{formatStatus(c.currentStatus)}</p>
                        </div>
                      </div>
                      <Link
                        href={`/partner/candidates/${c.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View Details
                      </Link>
                      <button
                        onClick={(e) => { e.stopPropagation(); setServiceDrawer(c); }}
                        className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                      >
                        <ShoppingBag className="w-3 h-3 inline mr-1" />
                        Register Service
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(c.id); setDeleteError(null); }}
                        className="shrink-0 p-2 rounded-lg text-xs font-medium bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors"
                        title="Delete candidate"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </button>

                    {isExpanded && (
                      <div className="border-t bg-muted/10">
                        <div className="px-5 py-3 border-b bg-muted/20">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                              <Package className="w-3.5 h-3.5" /> Service Orders ({c.services.length})
                            </h3>
                            <button
                              onClick={() => setServiceDrawer(c)}
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              <ShoppingBag className="w-3 h-3" /> Register Service
                            </button>
                          </div>
                        </div>
                        {c.services.length === 0 ? (
                          <div className="px-5 py-6 text-center text-sm text-muted-foreground">
                            No services registered yet.
                          </div>
                        ) : (
                          <div className="divide-y">
                            {c.services.map((svc) => (
                              <div key={svc.id} className="px-5 py-3 flex items-center gap-4">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                  <Package className="w-4 h-4 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">{svc.serviceName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {svc.packageType} · Qty: {svc.quantity}
                                    {svc.workflowCategory && (
                                      <span className={`ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold ${CATEGORY_COLORS[svc.workflowCategory] || "bg-muted text-muted-foreground"}`}>
                                        {svc.workflowCategory}
                                      </span>
                                    )}
                                    {svc.createdAt && ` · ${format(parseISO(svc.createdAt), "MMM d, yyyy")}`}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-sm font-semibold">{d(svc.totalPrice)}</p>
                                  <p className="text-[10px] text-muted-foreground">{d(svc.basePrice)} × {svc.quantity}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="px-5 py-3 border-t bg-muted/20">
                          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                            <CreditCard className="w-3.5 h-3.5" /> Payment Summary
                          </h3>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                              ["Total Fee", d(c.totalServiceFee), ""],
                              ["Deposit Paid", d(totalPaid), "text-emerald-600 dark:text-emerald-400"],
                              ["Remaining", d(remaining), remaining > 0 ? "text-red-500" : "text-emerald-500"],
                              ["Partner Share", d(c.partnerShare), "text-blue-600 dark:text-blue-400"],
                            ].map(([label, val, color]) => (
                              <div key={label} className="p-2.5 rounded-lg bg-card border">
                                <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
                                <p className={`text-sm font-bold ${color}`}>{val}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* === WAITING FOR REGISTRATION TAB === */}
      {activeTab === "waiting" && (
        <div className="space-y-4">
          {waitingOffers.length === 0 ? (
            <div className="bg-card border rounded-2xl p-16 text-center">
              <Hourglass className="w-12 h-12 mx-auto mb-3 text-muted-foreground/20" />
              <p className="font-medium text-muted-foreground">No candidates waiting for registration</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                When a candidate accepts your offer, they will appear here for you to complete their registration.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                These candidates have accepted your offer. Select one to start their full registration process.
              </p>
              <div className="space-y-3">
                {waitingOffers.map((w) => (
                  <div key={w.offerId} className="bg-card border border-amber-200 dark:border-amber-500/30 rounded-2xl overflow-hidden">
                    <div className="flex items-center gap-4 px-5 py-4">
                      {/* Avatar placeholder */}
                      <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0 text-amber-700 dark:text-amber-400 font-bold text-sm">
                        {(w.name || w.email)[0]?.toUpperCase() || "?"}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-foreground truncate">{w.name || "(No name)"}</p>
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 uppercase">
                            Awaiting Registration
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {w.email}
                          {w.offerNumber && <span className="ml-2">· Offer: {w.offerNumber}</span>}
                          {w.acceptedAt && (
                            <span className="ml-2">
                              · Accepted {format(parseISO(w.acceptedAt), "MMM d, yyyy")}
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="hidden sm:block text-right shrink-0">
                        <p className="text-xs text-muted-foreground">Offer Value</p>
                        <p className="text-sm font-bold">{d(w.totalAmount)}</p>
                      </div>

                      <Link
                        href={`/partner/candidates/new?email=${encodeURIComponent(w.email)}&name=${encodeURIComponent(w.name)}&offerId=${w.offerId}`}
                        className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 shadow-sm transition-colors"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Start Registration
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Service drawer for existing candidates */}
      {serviceDrawer && (
        <BuyServiceDrawer
          isOpen={true}
          onClose={() => setServiceDrawer(null)}
          candidateId={serviceDrawer.id}
          candidateName={serviceDrawer.fullName}
          candidateSccgId={serviceDrawer.sccgId}
          candidateMargin={serviceDrawer.marginPercentage || partnerMargin}
          products={products}
          secondaryCurrency={secondaryCurrency}
          exchangeRate={exchangeRate}
        />
      )}

      {/* Delete confirmation modal */}
      {confirmDeleteId && (() => {
        const target = candidates.find((c) => c.id === confirmDeleteId);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-background rounded-2xl shadow-2xl w-full max-w-sm border p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">Delete Candidate?</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">This action cannot be undone.</p>
                </div>
              </div>
              {target && (
                <div className="bg-muted/40 rounded-xl px-4 py-3 text-sm">
                  <p className="font-semibold text-foreground">{target.fullName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{target.sccgId} · {target.email}</p>
                </div>
              )}
              {deleteError && (
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {deleteError}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => { setConfirmDeleteId(null); setDeleteError(null); }}
                  disabled={isPending}
                  className="flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(confirmDeleteId)}
                  disabled={isPending || deletingId === confirmDeleteId}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deletingId === confirmDeleteId ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</>
                  ) : (
                    <><Trash2 className="w-4 h-4" /> Yes, Delete</>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
