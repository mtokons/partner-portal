import { redirect } from "next/navigation";
import { getEffectiveSession } from "@/lib/effective-user";
import type { SessionUser } from "@/types";
import { getSalesOrderById, getSalesOrderItems } from "@/lib/sharepoint";
import { ShoppingBag, ChevronLeft } from "lucide-react";
import Link from "next/link";
import OrderSummaryClient from "./OrderSummaryClient";

export default async function OrderSummaryPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const session = await getEffectiveSession();
  if (!session?.user) redirect("/login");

  const order = await getSalesOrderById(orderId);
  if (!order) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Order not found
      </div>
    );
  }

  const items = await getSalesOrderItems(order.id);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/partner/finance/invoices"
          className="p-2 hover:bg-muted rounded-full transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-primary" />
            Order {order.orderNumber}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Order summary and payment details
          </p>
        </div>
      </div>

      <OrderSummaryClient order={order} items={items} userEmail={session.user.email!} />
    </div>
  );
}
