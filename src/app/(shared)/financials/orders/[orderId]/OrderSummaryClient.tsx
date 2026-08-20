"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, CheckCircle2, CreditCard, Clock } from "lucide-react";
import type { SalesOrder, SalesOrderItem } from "@/types";
import { paySalesOrderAction } from "./actions";

interface Props {
  order: SalesOrder;
  items: SalesOrderItem[];
  userEmail: string;
}

export default function OrderSummaryClient({ order, items, userEmail }: Props) {
  const router = useRouter();
  const [method, setMethod] = useState<"card" | "bank" | "bkash" | "due">("card");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPaid = order.status === "completed" || order.status === "in-progress";

  async function handlePayment() {
    if (method === "due") {
      router.push("/partner/finance");
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const res = await paySalesOrderAction(order.id, method);
      if (res.success) {
        setSuccess(true);
      } else {
        setError(res.error || "Payment failed");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    }
    setLoading(false);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
      {/* Order Details */}
      <div className="bg-card border rounded-3xl p-6 shadow-sm">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-muted-foreground" />
          Items in this Order
        </h2>
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between items-center py-2 border-b last:border-0">
              <div>
                <p className="font-medium text-foreground">{item.productName}</p>
                <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
              </div>
              <p className="font-semibold text-foreground">
                €{(item.unitPrice * item.quantity).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-6 pt-4 border-t flex justify-between items-center">
          <p className="font-bold text-lg">Total Amount</p>
          <p className="font-black text-2xl text-primary">€{order.totalAmount?.toFixed(2)}</p>
        </div>
      </div>

      {/* Payment Section */}
      <div className="bg-card border rounded-3xl p-6 shadow-sm flex flex-col justify-center">
        {success || isPaid ? (
          <div className="text-center space-y-4 py-8">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-emerald-600">Payment Successful</h2>
            <p className="text-muted-foreground">This order has been fully paid.</p>
            <button
              onClick={() => router.push("/partner/finance")}
              className="mt-4 px-6 py-2 bg-muted text-foreground rounded-full font-medium hover:bg-muted/80 transition"
            >
              Back to Finance
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-muted-foreground" />
              Complete Payment
            </h2>
            
            <div className="space-y-3">
              <label className="text-sm font-medium">Select Payment Method</label>
              <div className="grid grid-cols-2 gap-3">
                {(["card", "bank", "bkash", "due"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    className={`p-3 rounded-xl border text-center font-medium capitalize transition-all ${
                      method === m
                        ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                        : "bg-muted/30 hover:bg-muted"
                    }`}
                  >
                    {m === "card" ? "Credit Card" : m === "due" ? "Pay Later (Due)" : m}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 text-red-600 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            <button
              onClick={handlePayment}
              disabled={loading}
              className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 ${
                method === "due" 
                  ? "bg-muted hover:bg-muted/80 text-foreground" 
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {loading ? (
                <Clock className="w-5 h-5 animate-spin" />
              ) : method === "due" ? null : (
                <CheckCircle2 className="w-5 h-5" />
              )}
              {loading 
                ? "Processing..." 
                : method === "due" 
                  ? "Mark as Due & Return" 
                  : `Pay €${order.totalAmount?.toFixed(2)}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
