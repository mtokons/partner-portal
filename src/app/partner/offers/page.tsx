import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getSalesOffers, getPartnerByEmail } from "@/lib/sharepoint";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Plus, FileText, Send, Eye, Trash2 } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  sent: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  accepted: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  rejected: "bg-red-500/10 text-red-500 border-red-500/20",
  expired: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  converted: "bg-purple-500/10 text-purple-500 border-purple-500/20",
};

export default async function PartnerOffersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  if (!user.partnerId) redirect("/partner-pending");

  const offers = await getSalesOffers(user.partnerId);

  // Sort by newest first
  const sorted = [...offers].sort((a, b) =>
    (b.createdAt || "").localeCompare(a.createdAt || "")
  );

  const draftCount = offers.filter((o) => o.status === "draft").length;
  const sentCount = offers.filter((o) => o.status === "sent").length;
  const acceptedCount = offers.filter((o) => o.status === "accepted").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Client Offers</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create and manage offers for your clients. Send as email or download as PDF.
          </p>
        </div>
        <Link
          href="/partner/offers/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Create Offer
        </Link>
      </div>

      {/* Summary Pills */}
      <div className="flex gap-3 flex-wrap">
        <div className="px-3 py-1.5 rounded-lg bg-muted/50 border text-sm">
          <span className="text-muted-foreground">Total:</span>{" "}
          <span className="font-semibold">{offers.length}</span>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-gray-500/10 border border-gray-500/20 text-sm">
          <span className="text-gray-500">Draft:</span>{" "}
          <span className="font-semibold">{draftCount}</span>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm">
          <span className="text-blue-500">Sent:</span>{" "}
          <span className="font-semibold">{sentCount}</span>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm">
          <span className="text-emerald-500">Accepted:</span>{" "}
          <span className="font-semibold">{acceptedCount}</span>
        </div>
      </div>

      {/* Offers Table */}
      {sorted.length === 0 ? (
        <div className="bg-card border rounded-2xl p-12 text-center">
          <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No offers created yet</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Start by creating your first offer for a client.
          </p>
          <Link
            href="/partner/offers/new"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create First Offer
          </Link>
        </div>
      ) : (
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
                {sorted.map((offer) => (
                  <tr key={offer.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-4">
                      <Link href={`/partner/offers/${offer.id}`} className="font-mono text-sm font-medium text-primary hover:underline">
                        {offer.offerNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-foreground">{offer.clientName}</p>
                      <p className="text-xs text-muted-foreground">{offer.clientEmail}</p>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {offer.createdAt ? format(parseISO(offer.createdAt), "MMM d, yyyy") : "—"}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold">
                      €{offer.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
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
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
