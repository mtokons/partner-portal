"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { CartItem, SessionUser } from "@/types";
import { createDirectOrderAction } from "../actions";
import { 
  ArrowLeft, CreditCard, ShieldCheck, Truck, 
  CheckCircle2, Loader2, AlertCircle, ShoppingBag, 
  Tag as TagIcon, ChevronRight
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user as SessionUser;

  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [paymentStep, setPaymentStep] = useState<"idle" | "processing" | "verifying" | "success">("idle");
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [reference, setReference] = useState("");

  useEffect(() => {
    const storedCart = localStorage.getItem("marketplace_cart");
    if (storedCart) {
      setCart(JSON.parse(storedCart));
    } else {
      router.push("/marketplace");
    }
  }, [router]);

  useEffect(() => {
    if (user) {
      setCustomerName(user.name || "");
      setCustomerEmail(user.email || "");
    }
  }, [user]);

  const cartTotal = cart.reduce((s, i) => s + i.effectivePrice * i.quantity, 0);

  async function handleCompletePurchase() {
    if (!customerName || !customerEmail) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    setError(null);
    setPaymentStep("processing");

    // Simulate payment delay
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setPaymentStep("verifying");
    await new Promise((resolve) => setTimeout(resolve, 1500));

    try {
      const items = cart.map(i => ({
        productId: i.product.id,
        productName: i.product.name,
        quantity: i.quantity,
        unitPrice: i.effectivePrice
      }));

      const result = await createDirectOrderAction({
        items,
        customerName,
        customerEmail,
        reference,
        notes: "Checkout from SCCG Marketplace"
      });

      if (result.success) {
        setPaymentStep("success");
        localStorage.removeItem("marketplace_cart");
        setTimeout(() => {
          router.push(`/marketplace/success?orderId=${result.orderId}&orderNumber=${result.orderNumber}`);
        }, 1000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed. Please try again.");
      setPaymentStep("idle");
    } finally {
      setLoading(false);
    }
  }

  if (cart.length === 0) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-8 page-enter pb-20">
      <div className="flex items-center gap-4">
        <Link 
          href="/marketplace" 
          className="p-2.5 rounded-2xl bg-muted hover:bg-muted/80 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-black tracking-tight">Confirm & Pay</h1>
          <p className="text-sm text-muted-foreground">Secure checkout powered by SCCG Commerce Engine</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Form & Payment */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-[2rem] border-primary/10 shadow-xl shadow-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Full Name</label>
                  <Input 
                    placeholder="e.g. John Doe" 
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="rounded-xl border-muted bg-muted/30 focus:bg-background transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Email Address</label>
                  <Input 
                    type="email" 
                    placeholder="john@example.com" 
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="rounded-xl border-muted bg-muted/30 focus:bg-background transition-colors"
                  />
                </div>
              </div>
              <div className="space-y-2 pt-2">
                <label className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <TagIcon className="h-3 w-3" />
                  Reference / Referral Code (Optional)
                </label>
                <Input 
                  placeholder="Enter reference for tracking..." 
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="rounded-xl border-primary/20 bg-primary/5 focus:bg-background transition-colors font-bold uppercase"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-primary/10 shadow-xl shadow-primary/5 overlow-hidden">
            <CardHeader className="bg-primary/5">
              <CardTitle className="flex items-center gap-2 text-primary">
                <CreditCard className="h-5 w-5" />
                Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="p-6 border-2 border-primary rounded-[1.5rem] bg-primary/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary text-white flex items-center justify-center font-black">
                    $
                  </div>
                  <div>
                    <p className="font-bold">Digital Direct Payment</p>
                    <p className="text-xs text-muted-foreground">Instant activation after verification</p>
                  </div>
                </div>
                <Badge className="bg-primary text-white font-black">ACTIVE</Badge>
              </div>

              {paymentStep !== "idle" && (
                <div className="p-8 text-center bg-muted/30 rounded-[1.5rem] animate-in fade-in zoom-in duration-500">
                  {paymentStep === "processing" && (
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="h-10 w-10 text-primary animate-spin" />
                      <p className="font-black text-lg animate-pulse">Contacting Bank Gateway...</p>
                    </div>
                  )}
                  {paymentStep === "verifying" && (
                    <div className="flex flex-col items-center gap-4">
                      <ShieldCheck className="h-10 w-10 text-primary animate-bounce" />
                      <p className="font-black text-lg">Verifying Secure Token...</p>
                    </div>
                  )}
                  {paymentStep === "success" && (
                    <div className="flex flex-col items-center gap-4 text-emerald-600">
                      <CheckCircle2 className="h-12 w-12 text-emerald-500 scale-125 transition-transform" />
                      <p className="font-black text-xl">Payment Successful!</p>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl flex items-center gap-3">
                  <AlertCircle className="h-5 w-5" />
                  <p className="text-sm font-bold">{error}</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="bg-muted/10 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                256-bit SSL Encrypted Transaction
              </div>
              <Button 
                onClick={handleCompletePurchase}
                disabled={loading || paymentStep !== "idle"}
                className="w-full sm:w-auto px-12 py-6 rounded-2xl bg-primary text-white font-black hover:opacity-90 shadow-2xl shadow-primary/30 text-lg group"
              >
                {loading ? "Processing..." : "Authorize Payment"}
                <ChevronRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Right: Summary */}
        <div className="space-y-6">
          <Card className="rounded-[2rem] border-primary/10 shadow-xl shadow-primary/5 sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-h-[300px] overflow-y-auto pr-2 space-y-4 no-scrollbar">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex gap-3">
                    <div className="h-16 w-16 bg-muted rounded-xl flex items-center justify-center font-bold text-muted-foreground border shrink-0">
                      {item.product.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold line-clamp-1">{item.product.name}</p>
                      <p className="text-xs text-muted-foreground">{item.quantity} x BDT {item.effectivePrice.toLocaleString()}</p>
                    </div>
                    <p className="text-sm font-black whitespace-nowrap">
                      BDT {(item.quantity * item.effectivePrice).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-bold">BDT {cartTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax (Included)</span>
                  <span className="font-bold">BDT 0</span>
                </div>
                <div className="flex justify-between text-lg pt-2 border-t mt-2">
                  <span className="font-black">Total</span>
                  <span className="font-black text-primary">BDT {cartTotal.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 text-center">
              <div className="flex items-center justify-center gap-1.5 p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl w-full">
                <Truck className="h-4 w-4 text-indigo-600 focus:text-indigo-400" />
                <p className="text-[10px] font-black uppercase text-indigo-700 dark:text-indigo-400">
                  Immediate Enrollment Delivery
                </p>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
