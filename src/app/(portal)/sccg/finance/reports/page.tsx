import { requirePermission } from "@/lib/permissions";
import { getCandidates, getExpenses, getPartners, getSalesOrders } from "@/lib/sharepoint";
import FinanceReportsClient from "./FinanceReportsClient";

export const dynamic = "force-dynamic";

export default async function FinanceReportsPage() {
  await requirePermission("report.financial");
  
  const [candidates, expenses, partners, orders] = await Promise.all([
    getCandidates(),
    getExpenses(),
    getPartners(),
    getSalesOrders()
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight">Finance Reports</h1>
      <p className="text-muted-foreground">
        Analyze daily, monthly, yearly, and custom income & expense data.
      </p>
      
      <FinanceReportsClient 
        candidates={candidates} 
        expenses={expenses} 
        partners={partners}
        orders={orders}
      />
    </div>
  );
}