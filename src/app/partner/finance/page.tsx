import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getPartnerByEmail, getCandidates, getTransactions } from "@/lib/sharepoint";
import { getEurToRate } from "@/lib/currency";
import { DollarSign } from "lucide-react";
import FinanceOverviewClient from "./FinanceOverviewClient";

export default async function PartnerFinancePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  const partner = await getPartnerByEmail(user.email!);
  if (!partner) redirect("/partner-pending");

  const secondaryCurrency = partner.preferredCurrency || "BDT";
  const [candidates, transactions, exchangeRate] = await Promise.all([
    getCandidates(partner.id),
    getTransactions(partner.id),
    secondaryCurrency !== "EUR" ? getEurToRate(secondaryCurrency) : Promise.resolve(1),
  ]);

  const marginPercent = partner.marginPercentage || 15;
  const salesTarget = partner.salesTarget || 0;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-primary/10 border border-primary/20 text-primary rounded-2xl">
          <DollarSign className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Financial Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track sales, commissions, client payments and SCCG settlements — all in one place.
          </p>
        </div>
      </div>

      <FinanceOverviewClient
        candidates={candidates}
        transactions={transactions}
        partnerName={partner.name}
        partnerCompany={partner.company}
        marginPercent={marginPercent}
        salesTarget={salesTarget}
        secondaryCurrency={secondaryCurrency}
        exchangeRate={exchangeRate}
      />
    </div>
  );
}
