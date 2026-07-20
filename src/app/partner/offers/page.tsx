import { redirect } from "next/navigation";
import { getEffectiveSession } from "@/lib/effective-user";
import type { SessionUser } from "@/types";
import { getSalesOffers, getPartnerByEmail } from "@/lib/sharepoint";
import { getEurToRate } from "@/lib/currency";
import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import OffersListClient from "./OffersListClient";

export default async function PartnerOffersPage() {
  const session = await getEffectiveSession();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  if (!user.partnerId) redirect("/partner-pending");

  const partner = await getPartnerByEmail(user.email!);
  const secCur = partner?.preferredCurrency || "BDT";
  const [offers, rate] = await Promise.all([
    getSalesOffers(user.partnerId),
    secCur !== "EUR" ? getEurToRate(secCur) : Promise.resolve(1),
  ]);

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
        <OffersListClient
          offers={sorted}
          secCur={secCur}
          rate={rate}
        />
      )}
    </div>
  );
}
