import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getPartners } from "@/lib/sharepoint";
import { getExchangeRates, CURRENCY_SYMBOLS, CURRENCY_NAMES, type SupportedCurrency } from "@/lib/currency";
import { RefreshCw, Globe, DollarSign, Users, TrendingUp } from "lucide-react";
import { refreshRatesAction } from "./actions";
import PartnerCurrencySelect from "./PartnerCurrencySelect";

export default async function AdminCurrencyPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  if (user.role !== "admin") redirect("/dashboard");

  const [partners, rates] = await Promise.all([
    getPartners(),
    getExchangeRates(),
  ]);

  const currencies = Object.entries(CURRENCY_NAMES).map(([code, name]) => ({
    code,
    name,
    symbol: CURRENCY_SYMBOLS[code] || code,
    rate: code === "EUR" ? 1 : rates[code] || 0,
  }));

  const partnerAccounts = partners.filter((p) =>
    ["partner", "partner-individual", "partner-institutional"].includes(p.role?.toLowerCase() || "partner")
    || p.onboardingStatus === "approved" || p.status === "active"
  );

  const currencyDistribution: Record<string, number> = {};
  partnerAccounts.forEach((p) => {
    const c = p.preferredCurrency || "EUR";
    currencyDistribution[c] = (currencyDistribution[c] || 0) + 1;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 border border-primary/20 text-primary rounded-2xl">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Currency Management</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage exchange rates and partner currency preferences. EUR is the home currency.
            </p>
          </div>
        </div>
        <form action={async () => { "use server"; await refreshRatesAction(); }}>
          <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-card border rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground shadow-sm transition-all">
            <RefreshCw className="h-4 w-4" /> Refresh Rates
          </button>
        </form>
      </div>

      {/* Live Exchange Rates */}
      <div className="bg-card border rounded-2xl p-5">
        <h2 className="font-bold text-foreground text-sm mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" /> Live Exchange Rates (EUR → X)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {currencies.filter((c) => c.code !== "EUR").map((c) => (
            <div key={c.code} className="bg-muted/30 border rounded-xl p-3 text-center">
              <p className="text-lg font-extrabold text-foreground">{c.symbol}</p>
              <p className="text-xs font-bold text-muted-foreground">{c.code}</p>
              <p className="text-sm font-bold text-primary mt-1">
                1€ = {c.rate.toLocaleString("en", { maximumFractionDigits: 2 })}
              </p>
              <p className="text-[9px] text-muted-foreground mt-0.5">{c.name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Currency Distribution */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(currencyDistribution).sort((a, b) => b[1] - a[1]).map(([code, count]) => (
          <div key={code} className="bg-card border rounded-2xl p-4 text-center">
            <p className="text-2xl font-extrabold text-foreground">{count}</p>
            <p className="text-xs font-bold text-muted-foreground mt-1">
              {CURRENCY_SYMBOLS[code] || code} {code} Partners
            </p>
          </div>
        ))}
      </div>

      {/* Partner Currency Assignment */}
      <div className="bg-card border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b bg-muted/30 flex items-center justify-between">
          <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> Partner Currency Preferences ({partnerAccounts.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 border-b text-muted-foreground font-bold uppercase text-[10px] tracking-wider">
                <th className="px-4 py-3 text-left">Partner</th>
                <th className="px-4 py-3 text-left">Company</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-center">Current Currency</th>
                <th className="px-4 py-3 text-center">Change</th>
                <th className="px-4 py-3 text-right">Rate (1€ =)</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {partnerAccounts.map((p) => {
                const curr = p.preferredCurrency || "EUR";
                const rate = curr === "EUR" ? 1 : rates[curr] || 0;
                return (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-semibold">{p.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.company}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.email}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-bold">
                        {CURRENCY_SYMBOLS[curr] || curr} {curr}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <PartnerCurrencySelect
                        partnerId={p.id}
                        partnerName={p.name}
                        currentCurrency={curr}
                        currencies={currencies}
                      />
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {curr === "EUR" ? "—" : `${CURRENCY_SYMBOLS[curr]}${rate.toLocaleString("en", { maximumFractionDigits: 2 })}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
