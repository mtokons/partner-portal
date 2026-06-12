"use client";

import { useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  ChevronDown, ChevronRight, Eye, Package, CreditCard,
  AlertCircle, CheckCircle, Clock, ShoppingBag,
} from "lucide-react";
import type { Candidate, CandidateService, Product, PartnerMargin } from "@/types";
import BuyServiceDrawer from "./[id]/BuyServiceDrawer";

type CandidateWithServices = Candidate & { services: CandidateService[] };

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
}: {
  candidates: CandidateWithServices[];
  products?: Product[];
  partnerMargin?: PartnerMargin;
  secondaryCurrency?: string;
  exchangeRate?: number;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [serviceDrawer, setServiceDrawer] = useState<CandidateWithServices | null>(null);

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
      {/* Search */}
      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Search by name, ID, or email..."
        className="w-full max-w-md px-4 py-2.5 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />

      {/* Candidate Cards */}
      <div className="space-y-3">
        {sorted.map((c) => {
          const isExpanded = expandedId === c.id;
          const paymentInfo = PAYMENT_STYLES[c.paymentStatus] || PAYMENT_STYLES.pending;
          const PaymentIcon = paymentInfo.icon;
          const totalPaid = c.depositAmount || 0;
          const remaining = c.totalServiceFee - totalPaid;

          return (
            <div key={c.id} className="bg-card border rounded-2xl overflow-hidden">
              {/* Candidate Header Row */}
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
                  {/* Services Count */}
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Services</p>
                    <p className="text-sm font-bold">{c.services.length}</p>
                  </div>

                  {/* Total Fee */}
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Total Fee</p>
                    <p className="text-sm font-bold">{d(c.totalServiceFee)}</p>
                  </div>

                  {/* Payment Status */}
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Payment</p>
                    <div className={`flex items-center gap-1 text-sm font-semibold ${paymentInfo.color}`}>
                      <PaymentIcon className="w-3.5 h-3.5" />
                      <span className="capitalize text-xs">{c.paymentStatus.replace("-", " ")}</span>
                    </div>
                  </div>

                  {/* Status */}
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
              </button>

              {/* Expanded: Services Sub-grid */}
              {isExpanded && (
                <div className="border-t bg-muted/10">
                  {/* Service Orders */}
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
                            <p className="text-sm font-medium text-foreground truncate">
                              {svc.serviceName}
                            </p>
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
                            <p className="text-[10px] text-muted-foreground">
                              {d(svc.basePrice)} × {svc.quantity}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Transaction Summary Sub-sub-grid */}
                  <div className="px-5 py-3 border-t bg-muted/20">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                      <CreditCard className="w-3.5 h-3.5" /> Payment Summary
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-2.5 rounded-lg bg-card border">
                        <p className="text-[10px] text-muted-foreground uppercase">Total Fee</p>
                        <p className="text-sm font-bold">{d(c.totalServiceFee)}</p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-card border">
                        <p className="text-[10px] text-muted-foreground uppercase">Deposit Paid</p>
                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          {d(totalPaid)}
                        </p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-card border">
                        <p className="text-[10px] text-muted-foreground uppercase">Remaining</p>
                        <p className={`text-sm font-bold ${remaining > 0 ? "text-red-500" : "text-emerald-500"}`}>
                          {d(remaining)}
                        </p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-card border">
                        <p className="text-[10px] text-muted-foreground uppercase">Partner Share</p>
                        <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                          {d(c.partnerShare)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {sorted.length === 0 && filter && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No candidates match &ldquo;{filter}&rdquo;
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
    </div>
  );
}
