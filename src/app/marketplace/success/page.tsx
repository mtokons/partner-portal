"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { 
  CheckCircle2, Package, FileText, ArrowRight, 
  ShoppingBag, Mail, Share2, Printer, 
  Clock, ShieldCheck, Check, Building2, User, Globe, Phone, ExternalLink, RefreshCw
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getPublicOrderDetailsAction } from "../actions";

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const orderNumber = searchParams.get("orderNumber") || "SCCG-ORDER";
  const verification = searchParams.get("verification");
  const method = searchParams.get("method") || "paypal";
  const plan = searchParams.get("plan") || "full";
  const timing = searchParams.get("timing");
  const isPendingVerification = verification === "pending";

  const [orderData, setOrderData] = useState<{ order: any; items: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"summary" | "tracking" | "receipt">("summary");

  const isPayLater = method === "pay-later" || timing === "later" || orderData?.order?.notes?.includes("Payment Option: Pay Later");

  useEffect(() => {
    if (orderId) {
      getPublicOrderDetailsAction(orderId, orderNumber)
        .then((res) => {
          if (res) setOrderData(res);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [orderId, orderNumber]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `SCCG Order #${orderNumber}`,
          text: `My order #${orderNumber} has been received by SCCG Germany!`,
          url: window.location.href,
        });
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Order link copied to clipboard!");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const totalAmount = orderData?.order?.totalAmount || 0;
  const clientName = orderData?.order?.clientName || "Direct Client";
  const clientEmail = orderData?.order?.clientEmail || "";
  const createdAtFormatted = orderData?.order?.createdAt 
    ? new Date(orderData.order.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  if (!orderId) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-10 page-enter py-10 px-4 sm:px-6">
      {/* ── Screen View Content ────────────────────────────────────────── */}
      <div className="screen-only space-y-8">
        {/* Success Header */}
        <div className="text-center space-y-4">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full scale-150" />
            <div className="relative h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto ring-8 ring-emerald-50">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 animate-in zoom-in spin-in duration-700" />
            </div>
          </div>
          
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
              {isPayLater 
                ? "Service Reservation Received!" 
                : isPendingVerification 
                ? "Booking & Payment Submitted!" 
                : "Enrollment Confirmed!"}
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground font-medium">
              Order <span className="text-[#0F4C81] font-black">#{orderNumber}</span>{" "}
              {isPayLater
                ? "has been registered. One of our representatives will contact you soon."
                : isPendingVerification
                ? "has been recorded. One of our representatives will contact you soon."
                : "has been successfully confirmed."}
            </p>
          </div>
        </div>

        {/* Main Interactive Confirmation Card */}
        <Card className="rounded-[2.5rem] border-slate-200 shadow-xl overflow-hidden">
          <CardHeader className="bg-[#0F4C81] text-white pt-8 pb-10 px-6 sm:px-10 text-center relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/10 to-transparent" />
            <Badge className="bg-amber-400 text-slate-900 border-0 font-extrabold mx-auto mb-3 px-3 py-1">
              {isPayLater 
                ? "Status: Representative Contact Pending" 
                : isPendingVerification 
                ? "Status: Verification in Queue" 
                : "Status: Active"}
            </Badge>
            <CardTitle className="text-2xl font-black">
              {isPayLater 
                ? "Reservation Registered (Pay Later)" 
                : isPendingVerification 
                ? "Payment Submitted — Representative Contacting Soon" 
                : "Enrollment Dossier Activated"}
            </CardTitle>
            <p className="text-blue-100 font-medium text-xs sm:text-sm mt-1 max-w-xl mx-auto leading-relaxed">
              {isPayLater
                ? "Thank you for reserving your service with SCCG. One of our representatives will review your booking and contact you soon via email or phone/WhatsApp with your invoice and consultation details."
                : isPendingVerification
                ? "Your payment request has been received. One of our representatives will verify your transaction with our banking system and contact you soon to finalize your service schedule."
                : "Your services are confirmed and ready in your client portal."}
            </p>
          </CardHeader>
          
          <CardContent className="p-6 sm:p-8 space-y-6">
            {/* Action Cards (In-Page Navigation - No Broken External Redirects) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setActiveView("summary");
                  document.getElementById("order-details-section")?.scrollIntoView({ behavior: "smooth" });
                }}
                className={`p-5 rounded-2xl border-2 text-left transition-all flex items-start gap-4 ${
                  activeView === "summary"
                    ? "border-[#0F4C81] bg-blue-50/50 shadow-md ring-2 ring-blue-100"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow"
                }`}
              >
                <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0 text-[#0F4C81]">
                  <Package className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">View Order Summary</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Inspect ordered packages, amounts, and payment breakdown below.</p>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setActiveView("tracking");
                  document.getElementById("tracking-section")?.scrollIntoView({ behavior: "smooth" });
                }}
                className={`p-5 rounded-2xl border-2 text-left transition-all flex items-start gap-4 ${
                  activeView === "tracking"
                    ? "border-[#0F4C81] bg-blue-50/50 shadow-md ring-2 ring-blue-100"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow"
                }`}
              >
                <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 text-amber-700">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Track Verification</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Real-time milestone progress from submission to activation.</p>
                </div>
              </button>
            </div>

            {/* Quick Actions (Email notice + Share + Print Receipt) */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-xs shrink-0 border border-slate-200">
                  <Mail className="h-5 w-5 text-[#0F4C81]" />
                </div>
                <div>
                  <p className="font-bold text-xs sm:text-sm text-slate-800">Check Your Email ({clientEmail || "Recipient"})</p>
                  <p className="text-[11px] text-slate-500">A detailed confirmation copy has also been dispatched to our service desk (service@mysccg.de).</p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleShare}
                  className="rounded-xl border-slate-300 text-xs font-bold hover:bg-slate-100 flex-1 sm:flex-initial"
                >
                  <Share2 className="h-3.5 w-3.5 mr-1.5" />
                  Share
                </Button>
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={handlePrint}
                  className="rounded-xl bg-[#0F4C81] hover:bg-[#0c3e6b] text-white text-xs font-bold shadow-sm flex-1 sm:flex-initial"
                >
                  <Printer className="h-3.5 w-3.5 mr-1.5" />
                  Print / Save Receipt
                </Button>
              </div>
            </div>

            {/* ── View 1: Real-time Milestone Tracking Section ────────── */}
            <div id="tracking-section" className="pt-4 border-t border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#0F4C81]" />
                  Order Fulfillment &amp; Verification Pipeline
                </h4>
                <Badge variant="outline" className="text-[10px] font-bold text-amber-700 bg-amber-50 border-amber-200">
                  Step 3 of 4 Active
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {/* Step 1 */}
                <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60 space-y-1">
                  <div className="flex items-center justify-between text-emerald-800 font-extrabold text-xs">
                    <span>1. Order Placed</span>
                    <Check className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-[11px] text-emerald-700">Order #{orderNumber} submitted.</p>
                </div>

                {/* Step 2 */}
                <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60 space-y-1">
                  <div className="flex items-center justify-between text-emerald-800 font-extrabold text-xs">
                    <span>2. Reference Logged</span>
                    <Check className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-[11px] text-emerald-700">Channel: {method.toUpperCase()}</p>
                </div>

                {/* Step 3 */}
                <div className="p-3.5 rounded-xl border-2 border-amber-400 bg-amber-50 space-y-1 shadow-xs animate-pulse">
                  <div className="flex items-center justify-between text-amber-900 font-extrabold text-xs">
                    <span>3. Payment Verification</span>
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                  <p className="text-[11px] text-amber-800 font-medium">Matching with bank &amp; PayPal records.</p>
                </div>

                {/* Step 4 */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1 opacity-70">
                  <div className="flex items-center justify-between text-slate-500 font-extrabold text-xs">
                    <span>4. Portal Activation</span>
                    <span className="text-[10px] text-slate-400">Upcoming</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Credentials &amp; Course Dossier.</p>
                </div>
              </div>
            </div>

            {/* ── View 2: Detailed Order Summary Section ────────── */}
            <div id="order-details-section" className="pt-4 border-t border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#0F4C81]" />
                  Order Summary &amp; Bill of Services
                </h4>
                <span className="text-xs font-bold text-slate-500">{createdAtFormatted}</span>
              </div>

              {/* Order Meta details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Customer</span>
                  <span className="font-bold text-slate-800 truncate block">{clientName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Email</span>
                  <span className="font-bold text-slate-800 truncate block">{clientEmail || "On File"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Payment Plan</span>
                  <span className="font-bold text-[#0F4C81] block capitalize">{plan === "installment" ? "Installment Plan" : "Full Payment"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Channel</span>
                  <span className="font-bold text-slate-800 block capitalize">{method.replace("-", " ")}</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-600 font-extrabold uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="p-3 pl-4">Service / Package Description</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3 text-right">Unit Price</th>
                      <th className="p-3 pr-4 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orderData?.items && orderData.items.length > 0 ? (
                      orderData.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-3 pl-4 font-bold text-slate-800">{item.productName}</td>
                          <td className="p-3 text-center text-slate-600">{item.quantity}</td>
                          <td className="p-3 text-right text-slate-600">€{item.unitPrice.toLocaleString()}</td>
                          <td className="p-3 pr-4 text-right font-extrabold text-[#0F4C81]">€{(item.quantity * item.unitPrice).toLocaleString()}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-slate-400">
                          {loading ? "Loading order items..." : "Standard Package Enrollment"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 font-black text-xs border-t border-slate-200">
                    <tr>
                      <td colSpan={3} className="p-3 pl-4 text-right text-slate-600 uppercase tracking-wider text-[11px]">Total Order Amount:</td>
                      <td className="p-3 pr-4 text-right text-base text-[#0F4C81]">€{totalAmount ? totalAmount.toLocaleString() : "—"}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Client Portal Access Reassurance */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-0.5">
                <p className="font-extrabold text-emerald-900 text-sm">Need to access your study portal?</p>
                <p className="text-emerald-700 text-[11px]">
                  Sign in to the official SCCG Student &amp; Client Portal to access courses, timeline, and receipts.
                </p>
              </div>
              <Link href="/customer-login">
                <Button size="sm" className="bg-[#0F4C81] hover:bg-[#0c3e6b] text-white font-bold text-xs rounded-xl px-4 shrink-0">
                  Client Portal Sign In
                  <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </Link>
            </div>
          </CardContent>

          <CardFooter className="bg-slate-50 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200">
            <Link href="/marketplace">
              <Button variant="ghost" className="font-bold text-[#0F4C81] hover:bg-blue-50 text-xs rounded-xl">
                <ShoppingBag className="h-4 w-4 mr-2" />
                Continue Shopping
              </Button>
            </Link>
            <Button 
              onClick={handlePrint}
              className="bg-[#0F4C81] hover:bg-[#0c3e6b] text-white font-bold text-xs rounded-xl px-5"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Official Receipt
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* ── Official Printable Receipt (Clean White-and-Black Layout for window.print()) ── */}
      <div id="printable-receipt" className="hidden print:block bg-white text-slate-900 p-8 font-sans">
        {/* Printable Header with Official Logo & Company Name */}
        <div className="border-b-2 border-slate-900 pb-5 mb-6 flex justify-between items-start gap-4">
          <div className="flex items-start gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/assets/sccg-logo.png" 
              alt="SCCG Career Lab UG" 
              className="h-16 w-auto object-contain shrink-0" 
            />
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 leading-none mb-1">
                SCCG Career Lab UG
              </h1>
              <p className="text-xs text-slate-700 font-bold uppercase tracking-wider">
                SCCG Career Lab UG (haftungsbeschränkt) &middot; Admissions &amp; Partner Service Portal
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Julius-Ludowieg-Straße 46 &middot; 21073 Hamburg, Germany &middot; service@mysccg.de &middot; portal.mysccg.de
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="inline-block border-2 border-slate-900 px-3 py-1 font-black text-xs uppercase tracking-widest bg-slate-50">
              OFFICIAL RECEIPT
            </span>
            <p className="text-sm font-black text-slate-900 mt-2">Order #{orderNumber}</p>
            <p className="text-[11px] text-slate-600">Date: {createdAtFormatted}</p>
          </div>
        </div>

        {/* Customer & Payment Meta Grid */}
        <div className="grid grid-cols-2 gap-6 p-4 border border-slate-300 rounded-lg mb-6 text-xs bg-slate-50/50">
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Billed To (Client)</p>
            <p className="font-extrabold text-sm text-slate-900">{clientName}</p>
            <p className="text-slate-700">{clientEmail || "Email on File"}</p>
            <p className="text-slate-700">{orderData?.order?.notes?.split("\n").find((l: string) => l.includes("Customer Country")) || ""}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Payment &amp; Verification Details</p>
            <p className="text-slate-700"><strong>Channel:</strong> {method.toUpperCase()} ({plan.toUpperCase()} PLAN)</p>
            <p className="text-slate-700"><strong>Status:</strong> {isPendingVerification ? "Submitted — Pending Admin Verification" : "Confirmed & Verified"}</p>
            <p className="text-slate-700"><strong>Order Reference:</strong> #{orderNumber}</p>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full text-xs text-left border-collapse border border-slate-300 mb-6">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-extrabold uppercase text-[10px]">
              <th className="p-2 border-r border-slate-300">#</th>
              <th className="p-2 border-r border-slate-300">Description of Service / Product</th>
              <th className="p-2 text-center border-r border-slate-300">Qty</th>
              <th className="p-2 text-right border-r border-slate-300">Unit Price (€)</th>
              <th className="p-2 text-right">Subtotal (€)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {orderData?.items && orderData.items.length > 0 ? (
              orderData.items.map((it, idx) => (
                <tr key={idx}>
                  <td className="p-2 border-r border-slate-300 text-slate-500">{idx + 1}</td>
                  <td className="p-2 border-r border-slate-300 font-bold text-slate-900">{it.productName}</td>
                  <td className="p-2 border-r border-slate-300 text-center">{it.quantity}</td>
                  <td className="p-2 border-r border-slate-300 text-right">€{it.unitPrice.toLocaleString()}</td>
                  <td className="p-2 text-right font-extrabold text-slate-900">€{(it.quantity * it.unitPrice).toLocaleString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="p-2 border-r border-slate-300">1</td>
                <td className="p-2 border-r border-slate-300 font-bold">SCCG Educational Package Enrollment</td>
                <td className="p-2 border-r border-slate-300 text-center">1</td>
                <td className="p-2 border-r border-slate-300 text-right">€{totalAmount.toLocaleString()}</td>
                <td className="p-2 text-right font-extrabold">€{totalAmount.toLocaleString()}</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-900 font-extrabold bg-slate-50 text-slate-900">
              <td colSpan={4} className="p-2.5 text-right border-r border-slate-300 uppercase">Total Amount:</td>
              <td className="p-2.5 text-right text-sm font-black">€{totalAmount.toLocaleString()} EUR</td>
            </tr>
          </tfoot>
        </table>

        {/* Security / Verification Disclaimer */}
        <div className="border border-slate-200 rounded p-4 text-[11px] text-slate-600 space-y-1 mb-8">
          <p className="font-bold text-slate-800">Verification &amp; Enrollment Terms:</p>
          <p>
            This official receipt confirms receipt of order submission with SCCG Career Lab UG (haftungsbeschränkt), Hamburg, Germany. Official course enrollments, study materials, and student portal credentials are confirmed upon financial verification by our admissions desk.
          </p>
          <p className="text-[10px] text-slate-500 pt-1">
            For questions or verification support, contact SCCG Admissions &amp; Finance Desk at <strong>service@mysccg.de</strong> quoting order <strong>#{orderNumber}</strong>.
          </p>
        </div>

        {/* Signatures */}
        <div className="flex justify-between items-end pt-4 border-t border-slate-300 text-xs">
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-bold">Authorized Signatory</p>
            <p className="font-extrabold text-slate-800 mt-3">SCCG Career Lab UG (haftungsbeschränkt)</p>
            <p className="text-[10px] text-slate-500">Admissions &amp; Accounts Desk &middot; Hamburg, Germany</p>
          </div>
          <div className="text-right text-[10px] text-slate-400">
            <p>Computer Generated Official Acknowledgement</p>
            <p>Verification URL: portal.mysccg.de</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="py-24 text-center font-bold text-slate-600">Loading order confirmation...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
