import { getEffectiveSession } from "@/lib/effective-user";
import { redirect } from "next/navigation";
import { getSalesOrders, getPartners } from "@/lib/sharepoint";
import SalesReportsClient from "./SalesReportsClient";
import { requirePermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function SalesReportsPage() {
  const session = await getEffectiveSession();
  if (!session?.user) redirect("/login");
  
  // Requires admin or sales reporting permission
  await requirePermission("report.sales");

  const [orders, partners] = await Promise.all([
    getSalesOrders(),
    getPartners()
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight">Sales Reports</h1>
      <p className="text-muted-foreground">
        Analyze daily, monthly, yearly, and custom sales data.
      </p>
      
      <SalesReportsClient 
        orders={orders} 
        partners={partners} 
      />
    </div>
  );
}
