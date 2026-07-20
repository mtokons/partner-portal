"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Eye, Trash2, Loader2, AlertCircle } from "lucide-react";
import { deletePartnerOffer } from "./actions";
import type { SalesOffer } from "@/types";
import { dual } from "@/lib/formatCurrency";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  sent: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  accepted: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  rejected: "bg-red-500/10 text-red-500 border-red-500/20",
  expired: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  converted: "bg-purple-500/10 text-purple-500 border-purple-500/20",
};

interface Props {
  offers: SalesOffer[];
  secCur: string;
  rate: number;
}

export default function OffersListClient({ offers, secCur, rate }: Props) {
  const [localOffers, setLocalOffers] = useState(offers);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const confirmOffer = localOffers.find((o) => o.id === confirmId);

  function handleDelete(offerId: string) {
    setDeletingId(offerId);
    setDeleteError(null);
    startTransition(async () => {
      try {
        await deletePartnerOffer(offerId);
        setLocalOffers((prev) => prev.filter((o) => o.id !== offerId));
        setConfirmId(null);
      } catch (err) {
        setDeleteError(err instanceof Error ? err.message : "Failed to delete offer");
      } finally {
        setDeletingId(null);
      }
    });
  }

  if (localOffers.length === 0) return null;

  return (
    <>
      <div className="bg-card border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Offer #</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
                <th className="text-center px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {localOffers.map((offer) => (
                <tr key={offer.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-4">
                    <Link href={`/partner/offers/${offer.id}`} className="font-mono text-sm font-medium text-primary hover:underline">
                      {offer.offerNumber}
                    </Link>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-foreground">
                      {offer.clientName}
                      {offer.clientType === "prospective" && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold uppercase">
                          Prospective
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{offer.clientEmail || offer.prospectEmail}</p>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {offer.createdAt ? format(parseISO(offer.createdAt), "MMM d, yyyy") : "—"}
                  </td>
                  <td className="px-5 py-4 text-right font-semibold">
                    {dual(offer.totalAmount, secCur, rate)}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider border ${STATUS_STYLES[offer.status] || STATUS_STYLES.draft}`}>
                      {offer.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/partner/offers/${offer.id}`}
                        className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        title="View offer"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => { setConfirmId(offer.id); setDeleteError(null); }}
                        className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                        title="Delete offer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {confirmId && confirmOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-sm border p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Delete Offer?</h2>
                <p className="text-xs text-muted-foreground mt-0.5">This action cannot be undone.</p>
              </div>
            </div>

            <div className="bg-muted/40 rounded-xl px-4 py-3 text-sm space-y-1">
              <p className="font-semibold text-foreground font-mono">{confirmOffer.offerNumber}</p>
              <p className="text-muted-foreground">{confirmOffer.clientName}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold uppercase border ${STATUS_STYLES[confirmOffer.status] || STATUS_STYLES.draft}`}>
                  {confirmOffer.status}
                </span>
                <span className="text-xs text-muted-foreground">{formatAmount(confirmOffer.totalAmount)}</span>
              </div>
            </div>

            {deleteError && (
              <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" /> {deleteError}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setConfirmId(null); setDeleteError(null); }}
                disabled={isPending}
                className="flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmId)}
                disabled={isPending || deletingId === confirmId}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deletingId === confirmId ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</>
                ) : (
                  <><Trash2 className="w-4 h-4" /> Yes, Delete</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
