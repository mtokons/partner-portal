"use client";

import { useState, useMemo } from "react";
import type { SalesOrder, Partner } from "@/types";
import { format, isSameDay, isSameMonth, isSameYear, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { 
  Calendar, CalendarDays, CalendarRange, Filter, BarChart3, 
  Search, ArrowUpRight, ArrowDownRight, Wallet, Users
} from "lucide-react";

interface Props {
  orders: SalesOrder[];
  partners: Partner[];
}

type DateFilterType = "daily" | "monthly" | "yearly" | "custom";

export default function SalesReportsClient({ orders, partners }: Props) {
  const [filterType, setFilterType] = useState<DateFilterType>("monthly");
  
  // Custom date range state
  const [customStart, setCustomStart] = useState(format(new Date(), "yyyy-MM-dd"));
  const [customEnd, setCustomEnd] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedPartner, setSelectedPartner] = useState("all");

  const now = new Date();

  // Filter orders based on the selected date filter and partner
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Filter by Partner
      if (selectedPartner !== "all") {
        if (selectedPartner === "SCCG-DIRECT") {
          if (order.partnerId !== "SCCG-DIRECT") return false;
        } else {
          if (order.partnerId !== selectedPartner) return false;
        }
      }

      // Must be a completed or at least created order. Let's include all non-cancelled orders for sales reports.
      if (order.status === "cancelled") return false;

      if (!order.createdAt) return false;
      const orderDate = parseISO(order.createdAt);

      switch (filterType) {
        case "daily":
          return isSameDay(orderDate, now);
        case "monthly":
          return isSameMonth(orderDate, now);
        case "yearly":
          return isSameYear(orderDate, now);
        case "custom":
          try {
            const start = startOfDay(parseISO(customStart));
            const end = endOfDay(parseISO(customEnd));
            return isWithinInterval(orderDate, { start, end });
          } catch {
            return false;
          }
        default:
          return true;
      }
    });
  }, [orders, filterType, customStart, customEnd, selectedPartner, now]);

  // Aggregate metrics
  const totalSales = filteredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const orderCount = filteredOrders.length;
  const avgOrderValue = orderCount > 0 ? totalSales / orderCount : 0;

  // Breakdown by Partner
  const partnerBreakdown = useMemo(() => {
    const map = new Map<string, { partnerName: string; totalSales: number; orders: number; isDirect: boolean }>();
    
    filteredOrders.forEach(o => {
      const pid = o.partnerId || "UNKNOWN";
      const isDirect = pid === "SCCG-DIRECT";
      
      if (!map.has(pid)) {
        map.set(pid, {
          partnerName: isDirect ? "SCCG Direct Sales" : (o.partnerName || "Unknown Partner"),
          totalSales: 0,
          orders: 0,
          isDirect
        });
      }
      
      const stat = map.get(pid)!;
      stat.totalSales += (o.totalAmount || 0);
      stat.orders += 1;
    });

    return Array.from(map.values()).sort((a, b) => b.totalSales - a.totalSales);
  }, [filteredOrders]);

  return (
    <div className="space-y-8">
      {/* Filters */}
      <div className="bg-card border rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Date Filter Type */}
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
          {/* Custom Date Range Picker */}
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

          {/* Partner Filter */}
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
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border rounded-3xl p-6 shadow-sm">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4">
            <Wallet className="w-6 h-6" />
          </div>
          <p className="text-muted-foreground font-medium mb-1">Total Sales Volume</p>
          <h2 className="text-3xl font-black">€{totalSales.toFixed(2)}</h2>
        </div>

        <div className="bg-card border rounded-3xl p-6 shadow-sm">
          <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mb-4">
            <BarChart3 className="w-6 h-6" />
          </div>
          <p className="text-muted-foreground font-medium mb-1">Total Orders</p>
          <h2 className="text-3xl font-black">{orderCount}</h2>
        </div>

        <div className="bg-card border rounded-3xl p-6 shadow-sm">
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mb-4">
            <Users className="w-6 h-6" />
          </div>
          <p className="text-muted-foreground font-medium mb-1">Avg. Order Value</p>
          <h2 className="text-3xl font-black">€{avgOrderValue.toFixed(2)}</h2>
        </div>
      </div>

      {/* Breakdown Table */}
      <div className="bg-card border rounded-3xl overflow-hidden shadow-sm">
        <div className="p-6 border-b bg-muted/20">
          <h3 className="text-lg font-bold">Sales Breakdown by Channel</h3>
          <p className="text-sm text-muted-foreground">Compare B2B partner performance against direct sales.</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Channel / Partner</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Orders</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Total Volume</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Avg. Order</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {partnerBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                    No sales data found for the selected period.
                  </td>
                </tr>
              ) : (
                partnerBreakdown.map((row, i) => (
                  <tr key={i} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${row.isDirect ? 'bg-primary' : 'bg-blue-500'}`} />
                        <span className="font-semibold text-foreground">
                          {row.partnerName}
                        </span>
                        {row.isDirect && (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                            Direct
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-medium">{row.orders}</td>
                    <td className="px-6 py-4 text-right font-bold text-foreground">€{row.totalSales.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right text-muted-foreground">
                      €{(row.totalSales / row.orders).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
