import { getEffectiveSession } from "@/lib/effective-user";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getMyOffers } from "@/app/customer/candidate-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, ArrowLeft, Calendar, Sparkles, ArrowRight } from "lucide-react";

const statusColor: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export default async function CustomerOffersPage() {
  const session = await getEffectiveSession();
  if (!session?.user) redirect("/customer-login");

  const offers = await getMyOffers();
  const activeOffers = offers.filter((offer) => offer.status === "sent").length;
  const totalPipelineValue = offers.reduce((sum, offer) => sum + offer.totalAmount, 0);

  return (
    <div className="space-y-6">
      <section className="candidate-soft-panel overflow-hidden rounded-[30px] p-0">
        <div className="flex flex-col gap-6 bg-[linear-gradient(135deg,rgba(255,255,255,0.85),rgba(245,252,252,0.9)_45%,rgba(255,245,239,0.88)_100%)] px-6 py-6 sm:px-8">
          <div className="flex items-center gap-3">
            <Link href="/customer/dashboard" className="text-slate-400 transition-colors hover:text-slate-700">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/75 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-teal-700 shadow-sm">
                <Sparkles className="h-3.5 w-3.5" />
                Candidate Offers Desk
              </div>
              <h1 className="mt-3 text-2xl font-bold text-slate-900">My Offers</h1>
              <p className="mt-1 text-sm text-slate-600">Review commercial proposals, compare values, and move forward with confidence.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.5)]">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Total Offers</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{offers.length}</p>
              <p className="mt-1 text-sm text-slate-500">Including draft and active proposals</p>
            </div>
            <div className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.5)]">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Awaiting Action</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{activeOffers}</p>
              <p className="mt-1 text-sm text-slate-500">Offers currently sent for your review</p>
            </div>
            <div className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.5)]">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Pipeline Value</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">€{totalPipelineValue.toFixed(2)}</p>
              <p className="mt-1 text-sm text-slate-500">Combined value across your offer pipeline</p>
            </div>
          </div>
        </div>
      </section>

      {offers.length === 0 ? (
        <Card className="candidate-soft-panel">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No offers yet</p>
            <p className="text-sm text-gray-400 mt-1">Your partner will send you offers when available</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {offers.map((offer) => (
            <Link key={offer.id} href={`/customer/offers/${offer.id}`}>
              <Card className="candidate-link-card cursor-pointer overflow-hidden border-white/70">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm">{offer.offerNumber}</h3>
                        <Badge className={statusColor[offer.status] || "bg-gray-100 text-gray-800"}>
                          {offer.status}
                        </Badge>
                      </div>
                      {offer.partnerName && (
                        <p className="text-xs text-gray-500">From: {offer.partnerName}</p>
                      )}
                      {offer.notes && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">{offer.notes}</p>
                      )}
                      <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-teal-700">
                        Review details <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="flex items-center gap-1 text-sm font-bold">
                        €{offer.totalAmount.toFixed(2)}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Calendar className="h-3 w-3" />
                        Valid until {new Date(offer.validUntil).toLocaleDateString("en-GB")}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
