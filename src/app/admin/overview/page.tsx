import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import { getPartners, getOrders, getClients, getFinancials, getExpenses, getInstallments } from "@/lib/sharepoint";
import { getAdminFirestore } from "@/lib/firebase-admin";
import AdminOverviewClient, { type OverviewView } from "./AdminOverviewClient";

export const metadata = { title: "Admin Overview" };

export default async function AdminOverviewPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  if (user.role !== "admin") redirect("/dashboard");

  const [partners, orders, clients, financials, expenses, installments] = await Promise.all([
    getPartners(), getOrders(), getClients(), getFinancials(), getExpenses(), getInstallments(),
  ]);

  // Test-data flag: partners whose owner email is flagged in Firestore
  const testEmails = new Set<string>();
  try {
    const db = getAdminFirestore();
    const snap = await db.collection("users").where("isTestData", "==", true).get();
    snap.docs.forEach((d) => {
      const e = d.data().email;
      if (e) testEmails.add(String(e).toLowerCase());
    });
  } catch (err) {
    console.error("load test-data flags failed:", (err as Error).message);
  }

  const partnerList = partners.filter((p) => p.role === "partner");
  const testPartnerIds = new Set(
    partnerList.filter((p) => testEmails.has((p.email || "").toLowerCase())).map((p) => p.id)
  );
  const testPartnerCount = testPartnerIds.size;

  // Currency formatting (BDT base → EUR)
  let rate: number | null = null;
  try {
    const { getBdtToEurRate } = await import("@/lib/currency");
    rate = await getBdtToEurRate();
  } catch {
    rate = null;
  }

  type Pred = (partnerId: string) => boolean;

  function buildView(pred: Pred, includeExpenses: boolean): OverviewView {
    const fPartners = partnerList.filter((p) => pred(p.id));
    const fOrders = orders.filter((o) => pred(o.partnerId));
    const fFin = financials.filter((f) => pred(f.partnerId));
    const fClients = clients.filter((c) => pred(c.partnerId));
    const fInstall = installments.filter((i) => pred(i.partnerId));

    const totalRevenue = fFin.reduce((s, f) => s + f.revenue, 0);
    const totalExpenses = includeExpenses ? expenses.reduce((s, e) => s + e.amount, 0) : 0;

    // P&L by period
    const plMap = new Map<string, { income: number; expenses: number }>();
    fFin.forEach((f) => {
      const e = plMap.get(f.period) || { income: 0, expenses: 0 };
      e.income += f.revenue;
      plMap.set(f.period, e);
    });
    if (includeExpenses) {
      expenses.forEach((exp) => {
        const period = (exp.date || "").slice(0, 7);
        if (!period) return;
        const e = plMap.get(period) || { income: 0, expenses: 0 };
        e.expenses += exp.amount;
        plMap.set(period, e);
      });
    }
    const pl = Array.from(plMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, d]) => ({ period, income: d.income, expenses: d.expenses, profit: d.income - d.expenses }));

    // Cashflow: revenue vs collected (paid)
    const cfMap = new Map<string, { revenue: number; paid: number }>();
    fFin.forEach((f) => {
      const e = cfMap.get(f.period) || { revenue: 0, paid: 0 };
      e.revenue += f.revenue;
      e.paid += f.paid;
      cfMap.set(f.period, e);
    });
    const cashflow = Array.from(cfMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, d]) => ({ period, revenue: d.revenue, paid: d.paid }));

    // Orders by status
    const statusMap = new Map<string, number>();
    fOrders.forEach((o) => statusMap.set(o.status, (statusMap.get(o.status) || 0) + 1));
    const orderStatus = Array.from(statusMap.entries()).map(([name, value]) => ({ name, value }));

    // Partners by tier
    const tierMap = new Map<string, number>();
    fPartners.forEach((p) => {
      const t = p.tierStatus || "Silver";
      tierMap.set(t, (tierMap.get(t) || 0) + 1);
    });
    const tierOrder = ["Silver", "Gold", "Diamond", "Platinum"];
    const tiers = Array.from(tierMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => tierOrder.indexOf(a.name) - tierOrder.indexOf(b.name));

    // Top partners by revenue
    const revMap = new Map<string, { name: string; company: string; revenue: number }>();
    fPartners.forEach((p) => revMap.set(p.id, { name: p.name, company: p.company, revenue: 0 }));
    fFin.forEach((f) => {
      const pr = revMap.get(f.partnerId);
      if (pr) pr.revenue += f.revenue;
    });
    const topPartners = Array.from(revMap.values())
      .filter((p) => p.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      kpis: {
        activePartners: fPartners.filter((p) => p.status === "active").length,
        pendingPartners: fPartners.filter((p) => p.status === "pending").length,
        totalOrders: fOrders.length,
        totalClients: fClients.length,
        totalRevenue,
        netProfit: totalRevenue - totalExpenses,
        overdueInstallments: fInstall.filter((i) => i.status === "overdue").length,
      },
      pl,
      cashflow,
      orderStatus,
      tiers,
      topPartners,
    };
  }

  const all = buildView(() => true, true);
  const real = buildView((id) => !testPartnerIds.has(id), true);
  const test = buildView((id) => testPartnerIds.has(id), false);

  return (
    <AdminOverviewClient
      all={all}
      real={real}
      test={test}
      rate={rate}
      testPartnerCount={testPartnerCount}
    />
  );
}
