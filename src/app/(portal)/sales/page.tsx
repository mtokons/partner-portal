import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getSalesOffers, getSalesOrders } from "@/lib/sharepoint";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Handshake, 
  ClipboardList, 
  ArrowRight, 
  TrendingUp, 
  Users, 
  Plus, 
  ChevronRight,
  Calculator,
  Receipt
} from "lucide-react";

export default async function SalesDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;

  const [offers, orders] = await Promise.all([
    getSalesOffers(user.role === "admin" ? undefined : user.partnerId),
    getSalesOrders(user.role === "admin" ? undefined : user.partnerId)
  ]);

  const activeOffers = offers.filter(o => o.status === "sent" || o.status === "draft");
  const pendingOrders = orders.filter(o => o.status === "pending" || o.status === "confirmed");

  const totalSalesAmount = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  return (
    <div className="space-y-8 page-enter py-6">
      {/* Header Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-[2.5rem] p-8 text-white shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <TrendingUp className="h-48 w-48" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-4xl font-black tracking-tight mb-2">Sales Command Center</h1>
          <p className="text-indigo-100 text-lg font-medium opacity-90">
            Manage your quotations, track orders, and monitor your revenue growth in real-time.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Link href="/shop">
              <Button variant="secondary" className="rounded-xl font-bold gap-2">
                <Plus className="h-4 w-4" /> New Quotation
              </Button>
            </Link>
            <Link href="/clients">
              <Button variant="outline" className="bg-white/10 border-white/20 text-white rounded-xl font-bold gap-2 hover:bg-white/20">
                <Users className="h-4 w-4" /> All Clients
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-[2rem] border-0 shadow-lg bg-white overflow-hidden group hover:shadow-xl transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                <Calculator className="h-6 w-6" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-muted px-2 py-1 rounded-full">Quotations</span>
            </div>
            <p className="text-3xl font-black text-foreground">{offers.length}</p>
            <p className="text-sm text-muted-foreground mt-1">Total created offers</p>
            <div className="mt-4 pt-4 border-t border-dashed flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-600">{activeOffers.length} Active / Sent</span>
              <Link href="/sales/offers" className="text-xs font-bold flex items-center gap-1 hover:underline">
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-0 shadow-lg bg-white overflow-hidden group hover:shadow-xl transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                <Receipt className="h-6 w-6" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-muted px-2 py-1 rounded-full">Sales Orders</span>
            </div>
            <p className="text-3xl font-black text-foreground">{orders.length}</p>
            <p className="text-sm text-muted-foreground mt-1">Confirmed orders</p>
            <div className="mt-4 pt-4 border-t border-dashed flex items-center justify-between">
              <span className="text-xs font-bold text-purple-600">{pendingOrders.length} Processing</span>
              <Link href="/sales/orders" className="text-xs font-bold flex items-center gap-1 hover:underline">
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-0 shadow-lg bg-white overflow-hidden group hover:shadow-xl transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                <TrendingUp className="h-6 w-6" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-muted px-2 py-1 rounded-full">Volume</span>
            </div>
            <p className="text-3xl font-black text-foreground">BDT {totalSalesAmount.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground mt-1">Total revenue volume</p>
            <div className="mt-4 pt-4 border-t border-dashed flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-600">+12% vs last month</span>
              <Link href="/financials" className="text-xs font-bold flex items-center gap-1 hover:underline">
                P&L Reports <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/sales/offers">
          <div className="group relative bg-white border border-border/50 rounded-[2.5rem] p-8 overflow-hidden hover:border-indigo-500/50 transition-all hover:shadow-2xl">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
              <Handshake className="h-32 w-32" />
            </div>
            <div className="relative z-10">
              <div className="h-14 w-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mb-6 shadow-lg shadow-indigo-200">
                <Handshake className="h-7 w-7" />
              </div>
              <h3 className="text-2xl font-black tracking-tight mb-2">Quotations & Offers</h3>
              <p className="text-muted-foreground mb-6 max-w-sm">
                Create, track and manage professional service quotations for your potential clients.
              </p>
              <div className="flex items-center text-indigo-600 font-bold gap-2">
                Open Quotations <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </Link>

        <Link href="/sales/orders">
          <div className="group relative bg-white border border-border/50 rounded-[2.5rem] p-8 overflow-hidden hover:border-purple-500/50 transition-all hover:shadow-2xl">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
              <ClipboardList className="h-32 w-32" />
            </div>
            <div className="relative z-10">
              <div className="h-14 w-14 rounded-2xl bg-purple-600 text-white flex items-center justify-center mb-6 shadow-lg shadow-purple-200">
                <ClipboardList className="h-7 w-7" />
              </div>
              <h3 className="text-2xl font-black tracking-tight mb-2">Sales Orders</h3>
              <p className="text-muted-foreground mb-6 max-w-sm">
                Track active orders, monitoring fulfillment status and delivery timelines.
              </p>
              <div className="flex items-center text-purple-600 font-bold gap-2">
                Manage Orders <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
