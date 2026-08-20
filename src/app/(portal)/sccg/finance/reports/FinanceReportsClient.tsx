"use client";

import { useState, useMemo } from "react";
import type { Candidate, Expense, Partner, SalesOrder } from "@/types";
import { format, isSameDay, isSameMonth, isSameYear, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { 
  Calendar, CalendarDays, CalendarRange, Filter, BarChart3, 
  Search, ArrowUpRight, ArrowDownRight, Wallet, Users, Receipt, TrendingUp
} from "lucide-react";

interface Props {
  candidates: Candidate[];
  expenses: Expense[];
  partners: Partner[];
  orders: SalesOrder[];
}

type DateFilterType = "daily" | "monthly" | "yearly" | "custom";
type TabType = "income" | "expenses";

export default function FinanceReportsClient({ candidates, expenses, partners, orders }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>("income");
  const [filterType, setFilterType] = useState<DateFilterType>("monthly");
  const [customStart, setCustomStart] = useState(format(new Date(), "yyyy-MM-dd"));
  const [customEnd, setCustomEnd] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedPartner, setSelectedPartner] = useState("all");

  const now = new Date();

  // Create a fast lookup for partner margins
  const partnerMargins = useMemo(() => {
    const map = new Map<string, number>();
    partners.forEach(p => map.set(p.id, p.marginPercentage || 15));
    return map;
  }, [partners]);

  // -- FILTER INCOME (ORDERS) --
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (selectedPartner !== "all") {
        if (selectedPartner === "SCCG-DIRECT") {
          if (order.partnerId !== "SCCG-DIRECT") return false;
        } else {
          if (order.partnerId !== selectedPartner) return false;
        }
      }

      if (order.status === "cancelled") return false;
      if (!order.createdAt) return false;
      
      const d = parseISO(order.createdAt);
      switch (filterType) {
        case "daily": return isSameDay(d, now);
        case "monthly": return isSameMonth(d, now);
        case "yearly": return isSameYear(d, now);
        case "custom":
          try {
            return isWithinInterval(d, { start: startOfDay(parseISO(customStart)), end: endOfDay(parseISO(customEnd)) });
          } catch {
            return false;
          }
        default: return true;
      }
    });
  }, [orders, filterType, customStart, customEnd, selectedPartner, now]);

  // Calculate Income KPIs
  const { grossRevenue, totalCommissions, netIncome } = useMemo(() => {
    let gross = 0;
    let comms = 0;
    
    filteredOrders.forEach(o => {
      const amount = o.totalAmount || 0;
      gross += amount;
      
      if (o.partnerId !== "SCCG-DIRECT") {
        const margin = partnerMargins.get(o.partnerId) || 15;
        comms += (amount * (margin / 100));
      }
    });

    return { grossRevenue: gross, totalCommissions: comms, netIncome: gross - comms };
  }, [filteredOrders, partnerMargins]);

  const incomeBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; gross: number; commission: number; isDirect: boolean }>();
    filteredOrders.forEach(o => {
      const pid = o.partnerId || "UNKNOWN";
      const isDirect = pid === "SCCG-DIRECT";
      if (!map.has(pid)) {
        map.set(pid, { name: isDirect ? "SCCG Direct" : (o.partnerName || "Unknown"), gross: 0, commission: 0, isDirect });
      }
      
      const stat = map.get(pid)!;
      const amount = o.totalAmount || 0;
      stat.gross += amount;
      if (!isDirect) {
        const margin = partnerMargins.get(pid) || 15;
        stat.commission += (amount * (margin / 100));
      }
    });
    return Array.from(map.values()).sort((a, b) => b.gross - a.gross);
  }, [filteredOrders, partnerMargins]);

  // -- FILTER EXPENSES --
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      if (!exp.date) return false;
      const d = parseISO(exp.date);
      switch (filterType) {
        case "daily": return isSameDay(d, now);
        case "monthly": return isSameMonth(d, now);
        case "yearly": return isSameYear(d, now);
        case "custom":
          try {
            return isWithinInterval(d, { start: startOfDay(parseISO(customStart)), end: endOfDay(parseISO(customEnd)) });
          } catch {
            return false;
          }
        default: return true;
      }
    });
  }, [expenses, filterType, customStart, customEnd, now]);

  const totalExpenses = filteredExpenses.reduce((s, e) => s + (e.amountEur ?? e.amount ?? 0), 0);

  const expenseBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    filteredExpenses.forEach(e => {
      const cat = e.category || "Uncategorized";
      const amt = e.amountEur ?? e.amount ?? 0;
      map.set(cat, (map.get(cat) || 0) + amt);
    });
    return Array.from(map.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses]);

  return (
    <div className="space-y-8">
      {/* Top Controls */}
      <div className="flex flex-col gap-4">
        {/* Module Tabs */}
        <div className="flex bg-muted p-1 rounded-xl w-full md:w-fit">
          <button
            onClick={() => setActiveTab("income")}
            className={`flex-1 px-6 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === "income" ? "bg-background shadow-sm text-primary" : "text-muted-foreground"
            }`}
          >
            Income Reports
          </button>
          <button
            onClick={() => setActiveTab("expenses")}
            className={`flex-1 px-6 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === "expenses" ? "bg-background shadow-sm text-destructive" : "text-muted-foreground"
            }`}
          >
            Expense Reports
          </button>
        </div>

        {/* Date & Partner Filters */}
        <div className="bg-card border rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex bg-muted p-1 rounded-xl w-full md:w-auto overflow-x-auto">
            {[
              { id: "daily", icon: Calendar, label: "Daily" },
              { id: "monthly", icon: CalendarDays, label: "Monthly" },
              { id: "yearly", icon: CalendarRange, label: "Yearly" },
              { id: "custom", icon: Filter, label: "Custom" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setFilterType(t.id as any)}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterType === t.id
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            {filterType === "custom" && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="h-10 px-3 rounded-xl border bg-background text-sm"
                />
                <span className="text-muted-foreground">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="h-10 px-3 rounded-xl border bg-background text-sm"
                />
              </div>
            )}

            {activeTab === "income" && (
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <select
                  value={selectedPartner}
                  onChange={(e) => setSelectedPartner(e.target.value)}
                  className="h-10 pl-9 pr-8 rounded-xl border bg-background text-sm appearance-none outline-none focus:border-primary"
                >
                  <option value="all">All Channels</option>
                  <option value="SCCG-DIRECT">SCCG Direct Sales</option>
                  <optgroup label="B2B Partners">
                    {partners.map(p => (
                      <option key={p.id} value={p.id}>{p.companyName || p.name}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {activeTab === "income" ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card border rounded-3xl p-6 shadow-sm">
              <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6" />
              </div>
              <p className="text-muted-foreground font-medium mb-1">Gross Revenue (Total Sales)</p>
              <h2 className="text-3xl font-black">€{grossRevenue.toFixed(2)}</h2>
            </div>
            <div className="bg-card border rounded-3xl p-6 shadow-sm">
              <div className="w-12 h-12 bg-orange-500/10 text-orange-500 rounded-2xl flex items-center justify-center mb-4">
                <Users className="w-6 h-6" />
              </div>
              <p className="text-muted-foreground font-medium mb-1">Partner Commissions</p>
              <h2 className="text-3xl font-black text-orange-600">€{totalCommissions.toFixed(2)}</h2>
            </div>
            <div className="bg-card border border-primary/20 bg-primary/5 rounded-3xl p-6 shadow-sm">
              <div className="w-12 h-12 bg-primary/20 text-primary rounded-2xl flex items-center justify-center mb-4">
                <Wallet className="w-6 h-6" />
              </div>
              <p className="text-primary/80 font-medium mb-1">Net SCCG Income</p>
              <h2 className="text-3xl font-black text-primary">€{netIncome.toFixed(2)}</h2>
            </div>
          </div>

          <div className="bg-card border rounded-3xl overflow-hidden shadow-sm">
            <div className="p-6 border-b bg-muted/20">
              <h3 className="text-lg font-bold">Income Breakdown by Channel</h3>
              <p className="text-sm text-muted-foreground">Track gross sales and B2B partner commission splits.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Channel / Partner</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Gross Sales</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Commission Split</th>
                    <th className="px-6 py-4 text-xs font-semibold text-primary uppercase tracking-wider text-right">SCCG Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {incomeBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">No income recorded for this period.</td>
                    </tr>
                  ) : (
                    incomeBreakdown.map((row, i) => (
                      <tr key={i} className="hover:bg-muted/10 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${row.isDirect ? 'bg-primary' : 'bg-orange-500'}`} />
                            <span className="font-semibold text-foreground">{row.name}</span>
                            {row.isDirect && (
                              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary">Direct</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-medium">€{row.gross.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right text-orange-600 font-medium">
                          {row.isDirect ? "—" : `€${row.commission.toFixed(2)}`}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-primary">
                          €{(row.gross - row.commission).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6">
            <div className="bg-card border rounded-3xl p-6 shadow-sm">
              <div className="w-12 h-12 bg-destructive/10 text-destructive rounded-2xl flex items-center justify-center mb-4">
                <Receipt className="w-6 h-6" />
              </div>
              <p className="text-muted-foreground font-medium mb-1">Total Operating Expenses</p>
              <h2 className="text-3xl font-black text-destructive">€{totalExpenses.toFixed(2)}</h2>
            </div>
          </div>

          <div className="bg-card border rounded-3xl overflow-hidden shadow-sm">
            <div className="p-6 border-b bg-muted/20">
              <h3 className="text-lg font-bold">Expense Breakdown by Category</h3>
              <p className="text-sm text-muted-foreground">Review where funds were allocated during this period.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Amount Spent</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {expenseBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-6 py-12 text-center text-muted-foreground">No expenses recorded for this period.</td>
                    </tr>
                  ) : (
                    expenseBreakdown.map((row, i) => (
                      <tr key={i} className="hover:bg-muted/10 transition-colors">
                        <td className="px-6 py-4 font-semibold text-foreground">{row.category}</td>
                        <td className="px-6 py-4 text-right font-bold text-destructive">€{row.amount.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
