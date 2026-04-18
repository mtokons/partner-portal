"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { 
  CheckCircle2, Package, FileText, ArrowRight, 
  ShoppingBag, Mail, Share2, Download 
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const orderNumber = searchParams.get("orderNumber");
  const verification = searchParams.get("verification");
  const isPendingVerification = verification === "pending";

  if (!orderId) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-12 page-enter py-12">
      {/* Success Header */}
      <div className="text-center space-y-6">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full scale-150" />
          <div className="relative h-24 w-24 rounded-full bg-emerald-100 flex items-center justify-center mx-auto ring-8 ring-emerald-50 scale-110">
            <CheckCircle2 className="h-12 w-12 text-emerald-600 animate-in zoom-in spin-in duration-700" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-5xl font-black tracking-tight text-foreground">
            {isPendingVerification ? "Payment Submitted!" : "Payment Confirmed!"}
          </h1>
          <p className="text-xl text-muted-foreground font-medium">
            Order <span className="text-primary font-black">#{orderNumber}</span>{" "}
            {isPendingVerification
              ? "is awaiting admin payment verification."
              : "has been successfully processed."}
          </p>
        </div>
      </div>

      {/* Main Confirmation Card */}
      <Card className="rounded-[3rem] border-primary/10 shadow-3xl shadow-primary/10 overflow-hidden">
        <CardHeader className="bg-primary pt-10 pb-20 text-center text-white relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/10 to-transparent" />
          <CardTitle className="text-2xl font-black">
            {isPendingVerification ? "Awaiting Verification" : "Enrollment Activated"}
          </CardTitle>
          <p className="text-primary-foreground/80 font-semibold px-12">
            {isPendingVerification
              ? "Your payment reference has been submitted. Services activate after admin verification."
              : "Your service packages are now active and linked to your account."}
          </p>
        </CardHeader>
        
        <CardContent className="-mt-12 space-y-6 px-8 relative">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href={`/sales/orders/${orderId}`} className="group">
              <div className="p-6 bg-card border rounded-[2rem] hover:border-primary transition-all hover:shadow-xl hover:-translate-y-1">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-white transition-colors">
                  <Package className="h-6 w-6" />
                </div>
                <h3 className="font-black text-lg">View Order</h3>
                <p className="text-sm text-muted-foreground">Track fulfillment and service status.</p>
              </div>
            </Link>
            
            <Link href={isPendingVerification ? `/sales/orders/${orderId}` : "/financials/invoices"} className="group">
              <div className="p-6 bg-card border rounded-[2rem] hover:border-primary transition-all hover:shadow-xl hover:-translate-y-1">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-white transition-colors">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="font-black text-lg">{isPendingVerification ? "Track Verification" : "Download Invoice"}</h3>
                <p className="text-sm text-muted-foreground">
                  {isPendingVerification
                    ? "Admin will verify your payment and confirm service."
                    : "A paid invoice has been generated."}
                </p>
              </div>
            </Link>
          </div>

          <div className="p-6 bg-muted/40 rounded-[2rem] border border-dashed flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-background rounded-full flex items-center justify-center shadow-sm">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-bold text-sm">Check your inbox</p>
                <p className="text-xs text-muted-foreground">We have sent a confirmation email to you.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="rounded-xl border-primary/20 hover:bg-primary/5 hover:text-primary">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" className="rounded-xl border-primary/20 hover:bg-primary/5 hover:text-primary">
                <Download className="h-4 w-4 mr-2" />
                Receipt
              </Button>
            </div>
          </div>
        </CardContent>

        <CardFooter className="bg-muted/10 p-10 flex flex-col md:flex-row items-center justify-center gap-6 border-t">
          <Link href="/marketplace">
            <Button variant="ghost" className="font-black text-primary hover:bg-primary/5 p-6 rounded-2xl text-lg group">
              <ShoppingBag className="h-5 w-5 mr-3 group-hover:rotate-12 transition-transform" />
              Continue Shopping
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button className="font-black bg-primary text-white p-6 rounded-2xl text-lg shadow-2xl shadow-primary/30 group">
              Go to Dashboard
              <ArrowRight className="h-5 w-5 ml-3 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </CardFooter>
      </Card>

      <div className="text-center">
        <p className="text-xs text-muted-foreground font-black uppercase tracking-tighter mb-4">You are in good hands</p>
        <div className="flex items-center justify-center gap-8 opacity-40 grayscale contrast-125">
           <span className="font-black text-xl italic tracking-tighter">SCCG GLOBAL</span>
           <span className="font-black text-xl italic tracking-tighter">SECURE+</span>
           <span className="font-black text-xl italic tracking-tighter">PARTNERED</span>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="py-24 text-center">Loading confirmation...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
