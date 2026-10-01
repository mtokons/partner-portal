import { redirect } from "next/navigation";
import { getEffectiveSession } from "@/lib/effective-user";
import type { SessionUser } from "@/types";
import { getSalesOrderById, getSalesOrderItems, getExperts } from "@/lib/sharepoint";
import { isAdministrativeUser } from "@/lib/permissions";
import EditOrderForm from "./EditOrderForm";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getEffectiveSession();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  const { id } = await params;

  const [order, items, experts] = await Promise.all([
    getSalesOrderById(id),
    getSalesOrderItems(id),
    getExperts(),
  ]);

  if (!order) {
    return (
      <div className="space-y-6 page-enter max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <Link href="/sales/orders">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Orders
            </Button>
          </Link>
        </div>
        <Card className="rounded-2xl border-amber-500/20 bg-amber-50/50">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <AlertCircle className="h-12 w-12 text-amber-500" />
            <h2 className="text-xl font-black text-foreground">Order Not Found</h2>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              The order with ID <span className="font-mono font-bold text-foreground">#{id}</span> could not be loaded.
            </p>
            <Link href="/sales/orders">
              <Button variant="outline">View All Orders</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAdminOrStaff = isAdministrativeUser(user);
  if (!isAdminOrStaff && order.createdBy !== user.id && order.partnerId !== user.partnerId && order.clientId !== user.id) {
    redirect("/sales/orders");
  }

  return <EditOrderForm order={order} items={items} experts={experts} />;
}
