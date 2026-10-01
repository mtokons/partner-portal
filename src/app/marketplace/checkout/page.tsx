"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { CartItem, SessionUser, CoinWallet } from "@/types";
import { createDirectOrderAction, getNextOrderNumberAction, checkCustomerEmailAction } from "../actions";
import { fetchWalletsForCurrentUser } from "@/app/(shared)/wallets/actions";
import { 
  ArrowLeft, CreditCard, ShieldCheck, Truck, 
  CheckCircle2, Loader2, AlertCircle, ShoppingBag, 
  Tag as TagIcon, ChevronRight, Copy, Check, Building2,
  Smartphone, Calendar, Info, Clock, Mail, Landmark, Globe
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const user = session?.user as SessionUser;

  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [paymentStep, setPaymentStep] = useState<"idle" | "processing" | "verifying" | "success">("idle");
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [country, setCountry] = useState<string>("Germany");
  const [detectedFromAccess, setDetectedFromAccess] = useState(false);
  const [reference, setReference] = useState("");

  // Payment plan & methods state
  const [paymentPlan, setPaymentPlan] = useState<"full" | "installment">("full");
  const [paymentTiming, setPaymentTiming] = useState<"now" | "later">("now");
  const [paymentMethod, setPaymentMethod] = useState<"bangladesh-transfer" | "paypal" | "coin">("paypal");
  const [bdTransferType, setBdTransferType] = useState<"bkash" | "bank">("bkash");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [wallet, setWallet] = useState<CoinWallet | null>(null);
  const [nextOrderNumber, setNextOrderNumber] = useState("SCCG-XXXXX");
  const [liveBdtRate, setLiveBdtRate] = useState<number>(140.2);

  // Login & Register state for guest users
  const [authMode, setAuthMode] = useState<"register" | "login">("register");
  const [newPassword, setNewPassword] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Duplicate email detection state
  const [emailChecking, setEmailChecking] = useState(false);
  const [existingAccountInfo, setExistingAccountInfo] = useState<{ exists: boolean; name?: string; role?: string } | null>(null);
  const [allowExistingAccount, setAllowExistingAccount] = useState(false);

  const checkEmail = async (emailToTest: string) => {
    const trimmed = (emailToTest || "").trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@") || trimmed.length < 5) {
      setExistingAccountInfo(null);
      return;
    }
    setEmailChecking(true);
    try {
      const res = await checkCustomerEmailAction(trimmed);
      setExistingAccountInfo(res);
      if (!res.exists) {
        setAllowExistingAccount(false);
      }
    } catch (e) {
      console.warn("Failed checking email:", e);
    } finally {
      setEmailChecking(false);
    }
  };

  // Debounced auto-check when typing customer email
  useEffect(() => {
    if (user) return;
    const trimmed = (customerEmail || "").trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@") || trimmed.length < 5) {
      setExistingAccountInfo(null);
      return;
    }
    const timer = setTimeout(() => {
      checkEmail(trimmed);
    }, 450);
    return () => clearTimeout(timer);
  }, [customerEmail, user]);

  // Auto-detect visitor country based on client access location (Timezone + Geo IP)
  useEffect(() => {
    // 1. If user previously selected a country, respect their saved choice
    const saved = localStorage.getItem("sccg_checkout_country");
    if (saved) {
      setCountry(saved);
      if (saved.toLowerCase() === "bangladesh") {
        setPaymentMethod("bangladesh-transfer");
      }
      return;
    }

    // 2. Immediate client-side timezone detection
    let detectedCountry = "Germany";
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      if (tz === "Asia/Dhaka") detectedCountry = "Bangladesh";
      else if (tz.includes("Berlin") || tz.includes("Busingen")) detectedCountry = "Germany";
      else if (tz.includes("London") || tz.includes("Belfast")) detectedCountry = "United Kingdom";
      else if (tz.includes("Vienna")) detectedCountry = "Austria";
      else if (tz.includes("Zurich")) detectedCountry = "Switzerland";
      else if (tz.includes("Paris")) detectedCountry = "France";
      else if (tz.includes("Rome")) detectedCountry = "Italy";
      else if (tz.includes("Madrid")) detectedCountry = "Spain";
      else if (tz.includes("Amsterdam")) detectedCountry = "Netherlands";
      else if (tz.includes("Stockholm")) detectedCountry = "Sweden";
      else if (tz.includes("Warsaw")) detectedCountry = "Poland";
      else if (tz.includes("Brussels")) detectedCountry = "Belgium";
      else if (tz.includes("Dublin")) detectedCountry = "Ireland";
      else if (tz.includes("Copenhagen")) detectedCountry = "Denmark";
      else if (tz.includes("Oslo")) detectedCountry = "Norway";
      else if (tz.includes("Kolkata") || tz.includes("Calcutta")) detectedCountry = "India";
      else if (tz.includes("Karachi")) detectedCountry = "Pakistan";
      else if (tz.includes("Kathmandu")) detectedCountry = "Nepal";
      else if (tz.includes("Dubai")) detectedCountry = "United Arab Emirates";
      else if (tz.includes("Riyadh")) detectedCountry = "Saudi Arabia";
      else if (tz.includes("Sydney") || tz.includes("Melbourne")) detectedCountry = "Australia";
      else if (tz.startsWith("America/Toronto") || tz.startsWith("America/Vancouver")) detectedCountry = "Canada";
      else if (tz.startsWith("America/")) detectedCountry = "United States";
      else if (tz.startsWith("Europe/")) detectedCountry = "Germany";
    } catch {
      detectedCountry = "Germany";
    }

    setCountry(detectedCountry);
    setDetectedFromAccess(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("sccg_checkout_country", detectedCountry);
      window.dispatchEvent(new CustomEvent("sccg_country_changed", { detail: detectedCountry }));
    }
    if (detectedCountry.toLowerCase() === "bangladesh") {
      setPaymentMethod("bangladesh-transfer");
    }

    // 3. Complementary server geo IP verification (non-blocking)
    fetch("/api/geo")
      .then((r) => r.json())
      .then((d) => {
        if (d?.country && !localStorage.getItem("sccg_checkout_country")) {
          setCountry(d.country);
          localStorage.setItem("sccg_checkout_country", d.country);
          window.dispatchEvent(new CustomEvent("sccg_country_changed", { detail: d.country }));
          if (d.country.toLowerCase() === "bangladesh") {
            setPaymentMethod("bangladesh-transfer");
          }
        }
      })
      .catch(() => {});
  }, []);

  // Derived location checks
  const isBangladesh = country.trim().toLowerCase() === "bangladesh";

  // Sync country when changed externally (e.g. from MarketplaceNavbar country selector)
  useEffect(() => {
    const handleSync = (e: Event) => {
      const customEvt = e as CustomEvent<string>;
      const val = customEvt.detail || localStorage.getItem("sccg_checkout_country");
      if (val && val !== country) {
        setCountry(val);
        if (val.trim().toLowerCase() !== "bangladesh" && paymentMethod === "bangladesh-transfer") {
          setPaymentMethod("paypal");
        } else if (val.trim().toLowerCase() === "bangladesh") {
          setPaymentMethod("bangladesh-transfer");
        }
      }
    };
    window.addEventListener("sccg_country_changed", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("sccg_country_changed", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [country, paymentMethod]);

  // Load and listen to cart updates in real time
  useEffect(() => {
    const loadStoredCart = () => {
      try {
        const storedCart = localStorage.getItem("marketplace_cart");
        if (storedCart) {
          const parsed = JSON.parse(storedCart);
          if (Array.isArray(parsed)) {
            setCart(parsed);
            return;
          }
        }
        setCart([]);
      } catch (e) {
        console.error("Error reading cart in checkout:", e);
      }
    };

    loadStoredCart();

    const handleCartSync = (e: Event) => {
      const customEvt = e as CustomEvent<CartItem[]>;
      if (customEvt.detail && Array.isArray(customEvt.detail)) {
        setCart(customEvt.detail);
      } else {
        loadStoredCart();
      }
    };

    window.addEventListener("sccg_cart_updated", handleCartSync);
    window.addEventListener("storage", handleCartSync);

    // Fetch next order number for reference display for both guests & members
    getNextOrderNumberAction().then(setNextOrderNumber).catch(() => {});

    // Fetch live EUR to BDT exchange rate
    fetch("/api/currency?target=BDT")
      .then((r) => r.json())
      .then((d) => {
        if (d?.rate && Number(d.rate) > 0) setLiveBdtRate(Number(d.rate));
      })
      .catch(() => {});

    return () => {
      window.removeEventListener("sccg_cart_updated", handleCartSync);
      window.removeEventListener("storage", handleCartSync);
    };
  }, []);

  function handleRemoveItem(productId: string) {
    const updated = cart.filter((i) => i.product.id !== productId);
    setCart(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("marketplace_cart", JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("sccg_cart_updated", { detail: updated }));
    }
  }

  function handleUpdateQuantity(productId: string, newQty: number) {
    if (newQty <= 0) {
      handleRemoveItem(productId);
      return;
    }
    const updated = cart.map((i) => (i.product.id === productId ? { ...i, quantity: newQty } : i));
    setCart(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("marketplace_cart", JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("sccg_cart_updated", { detail: updated }));
    }
  }

  useEffect(() => {
    if (user) {
      setCustomerName(user.name || "");
      setCustomerEmail(user.email || "");
      
      // Fetch wallet balance
      fetchWalletsForCurrentUser().then(wallets => {
        if (wallets && wallets.length > 0) setWallet(wallets[0]);
      });
    }
  }, [user]);

  function copyToClipboard(text: string, key: string) {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  }

  async function handleInlineLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setAuthError("Please enter your email and password.");
      return;
    }
    setAuthSubmitting(true);
    setAuthError(null);
    try {
      const { loginAction } = await import("@/lib/actions");
      const res = await loginAction(loginEmail, loginPassword);
      if (res.success) {
        router.refresh();
      } else {
        setAuthError(res.error || "Invalid email or password.");
      }
    } catch (err) {
      setAuthError("Sign in failed. Please try again.");
    } finally {
      setAuthSubmitting(false);
    }
  }

  // ── Financial Calculations with 2.5% Bangladesh Govt Bonus ────────────────
  const effectiveBdtRate = Number(((liveBdtRate || 140.2) * 1.025).toFixed(2));
  const cartTotalEur = cart.reduce((s, i) => s + (i.product.retailPriceEur || i.effectivePrice || 0) * i.quantity, 0);
  const cartTotalBdt = Math.round(cartTotalEur * effectiveBdtRate);

  // Check if product allows installment (SharePoint 'Instalment' column === true)
  const hasInstallmentOption = cart.length > 0 && cart.every(i => Boolean(i.product.hasInstallment));

  // Installment count from SharePoint 'InstalmentQty' column (fallback 4 or 3)
  const installmentCount = cart.length > 0
    ? (cart.find(i => i.product.installmentQty && i.product.installmentQty > 0)?.product.installmentQty || 4)
    : 4;

  // Initial deposit calculation:
  // Detects whether initialPayment in SharePoint is a fixed EUR amount (> 100, e.g. €580) or a percentage (<= 100, e.g. 35)
  const itemWithDeposit = cart.find(i => (i.product.initialPayment || 0) > 0);
  const rawDeposit = itemWithDeposit?.product.initialPayment;

  let downPaymentEur = 0;
  let depositPercent = 35;

  if (rawDeposit !== undefined && rawDeposit !== null && rawDeposit > 0) {
    if (rawDeposit > 100) {
      // Fixed EUR deposit amount (e.g. €580 on a €1390 package)
      downPaymentEur = Math.min(Math.round(rawDeposit), cartTotalEur);
      depositPercent = cartTotalEur > 0 ? Math.round((downPaymentEur / cartTotalEur) * 100) : 35;
    } else {
      // Percentage deposit (e.g. 35% or 40%)
      depositPercent = Math.min(100, Math.round(rawDeposit));
      downPaymentEur = Math.round(cartTotalEur * (depositPercent / 100));
    }
  } else {
    // Default 35%
    depositPercent = 35;
    downPaymentEur = Math.round(cartTotalEur * 0.35);
  }

  // Safety boundaries: deposit cannot be negative or exceed total
  if (downPaymentEur > cartTotalEur) downPaymentEur = cartTotalEur;
  if (downPaymentEur < 0) downPaymentEur = 0;

  const remainingEur = Math.max(0, cartTotalEur - downPaymentEur);
  const downPaymentBdt = Math.round(downPaymentEur * effectiveBdtRate);
  const remainingBdt = Math.max(0, cartTotalBdt - downPaymentBdt);

  // Exact milestone division distributing remainder single euros evenly
  const milestoneAmountsEur = Array.from({ length: installmentCount }).map((_, idx) => {
    if (installmentCount <= 0) return 0;
    const base = Math.floor(remainingEur / installmentCount);
    const rem = remainingEur % installmentCount;
    return idx < rem ? base + 1 : base;
  });

  const milestoneAmountsBdt = milestoneAmountsEur.map(amt => Math.round(amt * effectiveBdtRate));

  const perInstallmentEur = milestoneAmountsEur[0] || (installmentCount > 0 ? Math.round(remainingEur / installmentCount) : 0);
  const perInstallmentBdt = milestoneAmountsBdt[0] || (installmentCount > 0 ? Math.round(remainingBdt / installmentCount) : 0);

  // Dynamic payable now according to selected plan
  const payableNowEur = paymentPlan === "full" ? cartTotalEur : downPaymentEur;
  const payableNowBdt = paymentPlan === "full" ? cartTotalBdt : downPaymentBdt;

  // If installment is not supported for cart products, revert plan to full
  useEffect(() => {
    if (!hasInstallmentOption && paymentPlan === "installment") {
      setPaymentPlan("full");
    }
  }, [hasInstallmentOption, paymentPlan]);

  async function handleCompletePurchase() {
    if (cart.length === 0) {
      setError("Your cart is currently empty. Please select a service package or course to proceed.");
      return;
    }
    if (!customerName.trim() || !customerEmail.trim()) {
      setError("Please fill in your name and email address.");
      return;
    }
    if (!country.trim()) {
      setError("Please select your country of residence (mandatory).");
      return;
    }

    // Check for existing account if not logged in and not acknowledged
    if (!user) {
      try {
        const emailCheck = await checkCustomerEmailAction(customerEmail.trim());
        setExistingAccountInfo(emailCheck);
        if (emailCheck.exists && !allowExistingAccount) {
          setError(
            `An SCCG account is already registered for ${customerEmail}. Please switch to 'Existing User Login' to sign in with your password, or tick 'Continue order with this existing profile' to proceed.`
          );
          document.getElementById("customer-info-section")?.scrollIntoView({ behavior: "smooth" });
          return;
        }
      } catch (checkErr) {
        console.warn("Could not verify email before submit:", checkErr);
      }
    }

    setLoading(true);
    setError(null);
    setPaymentStep("processing");

    await new Promise((resolve) => setTimeout(resolve, 800));
    setPaymentStep("verifying");
    await new Promise((resolve) => setTimeout(resolve, 600));

    try {
      const items = cart.map(i => ({
        productId: i.product.id,
        productName: i.product.name,
        quantity: i.quantity,
        unitPrice: i.effectivePrice
      }));

      const effectiveMethod = paymentTiming === "later" ? "pay-later" : paymentMethod;
      const result = await createDirectOrderAction({
        items,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim() || undefined,
        country: country.trim(),
        reference: paymentTiming === "later" ? "PAY-LATER-REQUEST" : reference.trim(),
        paymentTiming,
        paymentMethod: effectiveMethod,
        bdTransferType: paymentTiming === "now" && paymentMethod === "bangladesh-transfer" ? bdTransferType : undefined,
        paymentPlan,
        downPaymentEur,
        downPaymentBdt: isBangladesh ? downPaymentBdt : undefined,
        remainingEur,
        remainingBdt: isBangladesh ? remainingBdt : undefined,
        depositPercent,
        installmentCount,
        liveRate: effectiveBdtRate,
        clientPassword: newPassword.trim() || undefined,
        allowExistingAccount,
        notes: `Marketplace Booking | Country: ${country.trim()} | Contact: ${customerPhone || "N/A"}${paymentTiming === "later" ? " | Payment Option: Pay Later (Client will be contacted by representative)" : " | Payment Option: Pay Now"}`,
      });

      if (result.success) {
        setPaymentStep("success");
        localStorage.removeItem("marketplace_cart");
        setTimeout(() => {
          router.push(
            `/marketplace/success?orderId=${result.orderId}&orderNumber=${result.orderNumber}&verification=pending&method=${effectiveMethod}&plan=${paymentPlan}&timing=${paymentTiming}`
          );
        }, 900);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment submission failed. Please try again.");
      setPaymentStep("idle");
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-10 w-10 text-[#0F4C81] animate-spin" />
        <p className="text-muted-foreground font-medium animate-pulse">Loading checkout...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 page-enter pb-24 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Navigation Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <Link 
          href="/marketplace"
          className="inline-flex items-center text-sm font-bold text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" />
          Back to Marketplace
        </Link>
        <div className="flex items-center gap-2">
          <Badge className="bg-[#0F4C81] text-white border-0 font-bold px-3 py-1 text-xs">
            Direct Enrollment Checkout
          </Badge>
        </div>
      </div>
 
      {/* Empty Cart Notice */}
      {cart.length === 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-amber-900 shadow-2xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-amber-600 shrink-0" />
            <span>
              <strong>Your cart is currently empty.</strong> Please choose a service package or course from the catalog to complete your direct booking.
            </span>
          </div>
          <Link
            href="/marketplace"
            className="shrink-0 px-4 py-2 rounded-xl bg-[#0F4C81] text-white font-bold hover:bg-[#0C3E6B] transition-all shadow-xs"
          >
            ← Browse Catalog
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Customer Information, Payment Plan & Payment Method */}
        <div className="lg:col-span-2 space-y-6">
          {/* ── 1. Customer Identification Card ── */}
          <Card id="customer-info-section" className="rounded-3xl border-slate-200/90 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/80 border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-extrabold flex items-center gap-2 text-slate-900">
                  <span className="w-6 h-6 rounded-full bg-[#0F4C81] text-white text-xs font-black flex items-center justify-center">1</span>
                  Your Information &amp; Account
                </CardTitle>
                {user ? (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-xs">
                    ✓ Logged In ({user.role})
                  </Badge>
                ) : (
                  <div className="flex gap-1.5 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setAuthMode("register")}
                      className={cn(
                        "px-3 py-1 rounded-lg transition-all",
                        authMode === "register" ? "bg-[#0F4C81] text-white" : "bg-white text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      New Guest
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode("login")}
                      className={cn(
                        "px-3 py-1 rounded-lg transition-all",
                        authMode === "login" ? "bg-[#0F4C81] text-white" : "bg-white text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      Existing User Login
                    </button>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-4">
              {!user && authMode === "login" ? (
                <form onSubmit={handleInlineLogin} className="space-y-4 bg-blue-50/40 p-5 rounded-2xl border border-blue-100">
                  <p className="text-xs font-bold text-[#0F4C81]">
                    Sign in to apply member discounts and automatically link booking to your student portal.
                  </p>
                  {authError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                      {authError}
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Email Address</label>
                      <Input
                        type="email"
                        placeholder="your.email@example.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="rounded-xl bg-white"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Password</label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="rounded-xl bg-white"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <button
                      type="button"
                      onClick={() => setAuthMode("register")}
                      className="text-xs text-[#0F4C81] hover:underline font-bold"
                    >
                      ← Checkout as guest instead
                    </button>
                    <Button type="submit" disabled={authSubmitting} className="rounded-xl bg-[#0F4C81] text-white font-bold text-xs px-5">
                      {authSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : "Sign In & Continue"}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <Input 
                        placeholder="e.g. Mohammad Hasnain" 
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="rounded-xl bg-white"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                        <span>Email Address (Booking confirmation sent here) <span className="text-rose-500">*</span></span>
                        {emailChecking && <span className="text-[10px] text-slate-400 font-normal">Checking...</span>}
                      </label>
                      <Input 
                        type="email" 
                        placeholder="hasnain@example.com" 
                        value={customerEmail}
                        onChange={(e) => {
                          setCustomerEmail(e.target.value);
                          if (existingAccountInfo) setExistingAccountInfo(null);
                        }}
                        onBlur={() => checkEmail(customerEmail)}
                        className={cn(
                          "rounded-xl bg-white",
                          existingAccountInfo?.exists && "border-amber-400 focus:ring-amber-500"
                        )}
                        required
                      />
                      {/* Duplicate email alert banner */}
                      {existingAccountInfo?.exists && (
                        <div className="p-3 mt-1.5 rounded-xl bg-amber-50 border border-amber-300 text-xs space-y-2 animate-in fade-in duration-200">
                          <div className="flex items-center gap-2 text-amber-900 font-bold">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>Registered Account Found for {customerEmail}</span>
                          </div>
                          <p className="text-amber-800 text-[11px] leading-relaxed">
                            An SCCG account is already registered with this email ({existingAccountInfo.name ? `${existingAccountInfo.name}` : "Client Profile"}). Sign in to view member benefits, or check the box below to link this purchase to your profile.
                          </p>
                          <div className="flex flex-wrap items-center gap-3 pt-1">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                setAuthMode("login");
                                setLoginEmail(customerEmail);
                              }}
                              className="bg-[#0F4C81] text-white font-bold text-xs h-7 rounded-lg px-3"
                            >
                              Sign In With Password
                            </Button>
                            <label className="flex items-center gap-1.5 text-[11px] text-slate-700 font-medium cursor-pointer">
                              <input
                                type="checkbox"
                                checked={allowExistingAccount}
                                onChange={(e) => setAllowExistingAccount(e.target.checked)}
                                className="rounded text-[#0F4C81] focus:ring-[#0F4C81]"
                              />
                              <span>Continue order with this existing profile</span>
                            </label>
                          </div>
                        </div>
                      )}
                      {customerEmail.includes("@") && existingAccountInfo && !existingAccountInfo.exists && (
                        <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
                          <Check className="w-3.5 h-3.5" /> New client: An account will be automatically set up for you.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Mandatory Country Selection */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-[#0F4C81]" />
                          Country / Region <span className="text-rose-500">*</span>
                        </span>
                        {isBangladesh ? (
                          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            BDT Sub-currency &amp; bKash Active
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#0F4C81] font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                            Euro (€) Only
                          </span>
                        )}
                      </label>
                      <select 
                        value={country}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCountry(val);
                          if (typeof window !== "undefined" && val) {
                            localStorage.setItem("sccg_checkout_country", val);
                            window.dispatchEvent(new CustomEvent("sccg_country_changed", { detail: val }));
                          }
                          if (val.trim().toLowerCase() !== "bangladesh" && paymentMethod === "bangladesh-transfer") {
                            setPaymentMethod("paypal");
                          } else if (val.trim().toLowerCase() === "bangladesh") {
                            setPaymentMethod("bangladesh-transfer");
                          }
                        }}
                        className="w-full h-10 px-3 rounded-xl border border-input bg-white text-xs font-bold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#0F4C81] transition-all cursor-pointer"
                        required
                      >
                        <option value="">-- Select Country (Mandatory) * --</option>
                        <optgroup label="Popular Regions">
                          <option value="Bangladesh">🇧🇩 Bangladesh</option>
                          <option value="Germany">🇩🇪 Germany</option>
                          <option value="United Kingdom">🇬🇧 United Kingdom</option>
                          <option value="United States">🇺🇸 United States</option>
                          <option value="Canada">🇨🇦 Canada</option>
                        </optgroup>
                        <optgroup label="Europe / Schengen">
                          <option value="Austria">🇦🇹 Austria</option>
                          <option value="Switzerland">🇨🇭 Switzerland</option>
                          <option value="France">🇫🇷 France</option>
                          <option value="Italy">🇮🇹 Italy</option>
                          <option value="Spain">🇪🇸 Spain</option>
                          <option value="Netherlands">🇳🇱 Netherlands</option>
                          <option value="Sweden">🇸🇪 Sweden</option>
                          <option value="Poland">🇵🇱 Poland</option>
                          <option value="Belgium">🇧🇪 Belgium</option>
                          <option value="Ireland">🇮🇪 Ireland</option>
                          <option value="Denmark">🇩🇰 Denmark</option>
                          <option value="Norway">🇳🇴 Norway</option>
                        </optgroup>
                        <optgroup label="Asia &amp; Other">
                          <option value="India">🇮🇳 India</option>
                          <option value="Pakistan">🇵🇰 Pakistan</option>
                          <option value="Nepal">🇳🇵 Nepal</option>
                          <option value="United Arab Emirates">🇦🇪 United Arab Emirates</option>
                          <option value="Saudi Arabia">🇸🇦 Saudi Arabia</option>
                          <option value="Australia">🇦🇺 Australia</option>
                          <option value="Other">🌍 Other International</option>
                        </optgroup>
                      </select>
                      <p className="text-[10px] text-slate-500">
                        {isBangladesh 
                          ? "Auto-detected Bangladesh: bKash/Bank and BDT sub-currency are available. You can change this anytime."
                          : `Auto-detected ${country}: European Euro (€) currency is active. You can change this anytime.`}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Phone / WhatsApp (for service updates)
                      </label>
                      <Input 
                        placeholder="+8801... or +49..." 
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="rounded-xl bg-white"
                      />
                    </div>
                  </div>

                  {!user && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 flex justify-between">
                          <span>Set Portal Password</span>
                          <span className="text-[10px] text-slate-500 font-normal">Optional</span>
                        </label>
                        <Input 
                          type="password" 
                          placeholder="Min. 6 characters" 
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="rounded-xl bg-white"
                        />
                      </div>
                      <div className="flex items-center text-[11px] text-slate-500 pt-5">
                        Creating a password will automatically link this purchase to your student dashboard.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── 2. Payment Plan: Full Payment vs Installment Payment ─────────── */}
          <Card className="rounded-3xl border-slate-200/90 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/80 border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-extrabold flex items-center gap-2 text-slate-900">
                  <span className="w-6 h-6 rounded-full bg-[#0F4C81] text-white text-xs font-black flex items-center justify-center">2</span>
                  {hasInstallmentOption ? "Choose Payment Option (Full or Installment)" : "Payment Option (Full Payment Only)"}
                </CardTitle>
                {hasInstallmentOption ? (
                  <Badge variant="outline" className="text-xs font-bold text-[#0F4C81] border-[#0F4C81]/30 bg-blue-50">
                    Package Deposit: €{downPaymentEur.toLocaleString()} ({depositPercent}%) &middot; {installmentCount} Installments
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs font-bold text-slate-600 border-slate-200 bg-slate-100">
                    Single Milestone Package
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-4">
              <div className={cn("grid gap-4", hasInstallmentOption ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
                {/* Full Payment Card */}
                <div
                  onClick={() => setPaymentPlan("full")}
                  className={cn(
                    "p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between space-y-3",
                    paymentPlan === "full"
                      ? "border-[#0F4C81] bg-blue-50/30 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                        {hasInstallmentOption ? "Option A" : "Standard"}
                      </span>
                      <h4 className="font-black text-slate-900 text-base leading-tight mt-0.5">
                        Full Payment (100%)
                      </h4>
                      <p className="text-xs text-slate-600 mt-1">
                        Pay full amount upfront for instant digital invoice &amp; zero pending milestones.
                      </p>
                    </div>
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5",
                      paymentPlan === "full" ? "border-[#0F4C81] bg-[#0F4C81]" : "border-slate-300 bg-white"
                    )}>
                      {paymentPlan === "full" && <Check className="w-3 h-3 text-white stroke-[3]" />}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-baseline justify-between">
                    <span className="text-xs text-slate-500 font-bold">Payable Today:</span>
                    <div className="text-right">
                      <span className="text-lg font-black text-[#0F4C81]">€{cartTotalEur.toLocaleString()}</span>
                      {isBangladesh && (
                        <span className="block text-[11px] font-bold text-slate-700">
                          ≈ ৳{cartTotalBdt.toLocaleString()} BDT
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Installment Plan Card — Shown ONLY if hasInstallment is true in SharePoint */}
                {hasInstallmentOption && (
                  <div
                    onClick={() => setPaymentPlan("installment")}
                    className={cn(
                      "p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between space-y-3",
                      paymentPlan === "installment"
                        ? "border-[#0F4C81] bg-amber-50/20 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-amber-600">Option B</span>
                        <h4 className="font-black text-slate-900 text-base leading-tight mt-0.5">
                          Installment Payment Plan
                        </h4>
                        <p className="text-xs text-slate-600 mt-1">
                          Pay minimum deposit today. Rest amount divided into <strong>{installmentCount} equal installments</strong>.
                        </p>
                      </div>
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5",
                        paymentPlan === "installment" ? "border-[#0F4C81] bg-[#0F4C81]" : "border-slate-300 bg-white"
                      )}>
                        {paymentPlan === "installment" && <Check className="w-3 h-3 text-white stroke-[3]" />}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-baseline justify-between">
                      <span className="text-xs text-amber-800 font-bold">Min. Deposit Today:</span>
                      <div className="text-right">
                        <span className="text-lg font-black text-amber-700">€{downPaymentEur.toLocaleString()}</span>
                        {isBangladesh && (
                          <span className="block text-[11px] font-bold text-slate-700">
                            ≈ ৳{downPaymentBdt.toLocaleString()} BDT
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {!hasInstallmentOption && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                  <Info className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Installment payments are only available for packages configured with installments in the catalog. Full payment is required for this package.</span>
                </div>
              )}

              {/* Installment Schedule Breakdown Preview (Dynamic Milestones divided by installmentCount) */}
              {hasInstallmentOption && paymentPlan === "installment" && (
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 text-xs space-y-3 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between font-bold text-amber-900">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-amber-700" />
                      <span>Estimated {installmentCount + 1}-Milestone Schedule Breakdown:</span>
                    </div>
                    <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-bold text-[10px]">
                      {installmentCount} Post-Deposit Installments
                    </Badge>
                  </div>

                  <div className={cn(
                    "grid gap-2",
                    installmentCount <= 2 ? "grid-cols-1 sm:grid-cols-3" :
                    installmentCount === 3 ? "grid-cols-2 sm:grid-cols-4" :
                    "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
                  )}>
                    {/* Milestone 1: Due Today */}
                    <div className="p-2.5 rounded-xl bg-white border border-amber-300 text-center space-y-0.5 shadow-2xs">
                      <span className="text-[10px] font-black text-amber-800 uppercase block">1. Due Today</span>
                      <span className="font-extrabold text-slate-900 text-sm block">€{downPaymentEur.toLocaleString()}</span>
                      {isBangladesh && (
                        <span className="text-[10px] text-slate-600 font-bold block">≈ ৳{downPaymentBdt.toLocaleString()}</span>
                      )}
                      <Badge className="bg-amber-100 text-amber-900 text-[9px] font-bold px-1.5 py-0 border-0 mt-0.5">Deposit ({depositPercent}%)</Badge>
                    </div>

                    {/* Subsequent Installment Milestones divided by installmentCount */}
                    {Array.from({ length: installmentCount }).map((_, idx) => {
                      const days = (idx + 1) * 30;
                      const isLast = idx === installmentCount - 1;
                      const installmentEur = milestoneAmountsEur[idx] ?? perInstallmentEur;
                      const installmentBdt = milestoneAmountsBdt[idx] ?? perInstallmentBdt;
                      return (
                        <div key={idx} className="p-2.5 rounded-xl bg-white border border-amber-200 text-center space-y-0.5">
                          <span className="text-[10px] font-black text-slate-500 uppercase block">{idx + 2}. In {days} Days</span>
                          <span className="font-extrabold text-slate-800 text-sm block">€{installmentEur.toLocaleString()}</span>
                          {isBangladesh && (
                            <span className="text-[10px] text-slate-500 font-bold block">≈ ৳{installmentBdt.toLocaleString()}</span>
                          )}
                          <span className="text-[9px] text-slate-400 block mt-0.5">
                            {isLast ? "Final Installment" : `Milestone ${idx + 2}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                    * The remaining balance of €{remainingEur.toLocaleString()}{isBangladesh ? ` (≈ ৳${remainingBdt.toLocaleString()} BDT)` : ""} is divided into <strong>{installmentCount} equal monthly installments</strong> based on product terms in SharePoint. SCCG Admissions &amp; Finance Admin will verify your exact milestone schedule upon receiving deposit.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── 3. Payment Method: Pay Now vs Pay Later ──── */}
          <Card className="rounded-3xl border-slate-200/90 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/80 border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-extrabold flex items-center gap-2 text-slate-900">
                  <span className="w-6 h-6 rounded-full bg-[#0F4C81] text-white text-xs font-black flex items-center justify-center">3</span>
                  Payment Method &amp; Preference
                </CardTitle>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <span>{paymentTiming === "later" ? "Due Today:" : "Payable Now:"}</span>
                  <span className={cn(
                    "font-black font-mono",
                    paymentTiming === "later" ? "text-emerald-700" : "text-[#0F4C81]"
                  )}>
                    {paymentTiming === "later" ? "€0 (Pay Later)" : `€${payableNowEur.toLocaleString()}`}
                    {paymentTiming === "now" && isBangladesh && ` (≈ ৳${payableNowBdt.toLocaleString()} BDT)`}
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-4">
              {/* ── 2 Option Toggle: Pay Now vs Pay Later ──────────────────────── */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
                  Select Payment Option:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option 1: Pay Now */}
                  <div
                    onClick={() => setPaymentTiming("now")}
                    className={cn(
                      "p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between space-y-2.5",
                      paymentTiming === "now"
                        ? "border-[#0F4C81] bg-blue-50/40 shadow-sm ring-2 ring-[#0F4C81]/15"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0",
                          paymentTiming === "now" ? "bg-[#0F4C81] text-white shadow-xs" : "bg-slate-100 text-slate-600"
                        )}>
                          <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-extrabold text-slate-900 text-sm">Pay Now</h4>
                            <Badge className="bg-blue-100 text-[#0F4C81] border-0 text-[10px] font-black py-0">Fast Track</Badge>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Make payment via PayPal, Euro Transfer, or local bank.
                          </p>
                        </div>
                      </div>
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5",
                        paymentTiming === "now" ? "border-[#0F4C81] bg-[#0F4C81]" : "border-slate-300 bg-white"
                      )}>
                        {paymentTiming === "now" && <Check className="w-3 h-3 text-white stroke-[3]" />}
                      </div>
                    </div>
                  </div>

                  {/* Option 2: Pay Later */}
                  <div
                    onClick={() => setPaymentTiming("later")}
                    className={cn(
                      "p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between space-y-2.5",
                      paymentTiming === "later"
                        ? "border-emerald-600 bg-emerald-50/40 shadow-sm ring-2 ring-emerald-600/15"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0",
                          paymentTiming === "later" ? "bg-emerald-600 text-white shadow-xs" : "bg-slate-100 text-slate-600"
                        )}>
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-extrabold text-slate-900 text-sm">Pay Later</h4>
                            <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[10px] font-black py-0">No Upfront Pay</Badge>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Reserve service now. A representative will contact you soon.
                          </p>
                        </div>
                      </div>
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5",
                        paymentTiming === "later" ? "border-emerald-600 bg-emerald-600" : "border-slate-300 bg-white"
                      )}>
                        {paymentTiming === "later" && <Check className="w-3 h-3 text-white stroke-[3]" />}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Condition A: When Pay Now is selected ─────────────────────── */}
              {paymentTiming === "now" && (
                <div className="space-y-4 pt-1 animate-in fade-in duration-200">
                  {/* Representative Contact Notice for Pay Now */}
                  <div className="p-3.5 rounded-xl bg-blue-50/90 border border-blue-200 text-xs text-blue-950 flex items-start gap-2.5 shadow-2xs">
                    <ShieldCheck className="w-4 h-4 text-[#0F4C81] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-[#0F4C81]">Representative Contact:</span>{" "}
                      <span>After submitting your payment request, one representative will contact you soon to verify your transaction and confirm your onboarding schedule.</span>
                    </div>
                  </div>

                  {/* Payment Method Primary Selection: Bangladesh vs PayPal */}
                  <div className={cn("grid gap-4", isBangladesh ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
                    {/* 1. Bangladesh Transfer Button — ONLY visible if Country is Bangladesh */}
                    {isBangladesh && (
                      <div
                        onClick={() => setPaymentMethod("bangladesh-transfer")}
                        className={cn(
                          "p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between space-y-3",
                          paymentMethod === "bangladesh-transfer"
                            ? "border-[#0F4C81] bg-blue-50/20 shadow-sm"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-pink-100/80 text-pink-700 flex items-center justify-center font-black text-sm">
                              ৳
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 text-sm">Bangladesh Transfer</h4>
                              <p className="text-xs text-slate-500">bKash or Bank Transfer (BDT)</p>
                            </div>
                          </div>
                          {paymentMethod === "bangladesh-transfer" && (
                            <Badge className="bg-[#0F4C81] text-white text-[10px] font-black">SELECTED</Badge>
                          )}
                        </div>
                        <div className="text-right pt-2 border-t border-slate-100">
                          <span className="text-xs font-bold text-slate-500">Payable: </span>
                          <span className="text-sm font-black text-[#0F4C81]">৳{payableNowBdt.toLocaleString()} BDT</span>
                        </div>
                      </div>
                    )}

                    {/* 2. PayPal (Euro Transfer) Button */}
                    <div
                      onClick={() => setPaymentMethod("paypal")}
                      className={cn(
                        "p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between space-y-3",
                        paymentMethod === "paypal"
                          ? "border-[#0070BA] bg-sky-50/20 shadow-sm"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-sky-100 text-[#0070BA] flex items-center justify-center font-black text-sm">
                            P
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">PayPal (Euro Transfer)</h4>
                            <p className="text-xs text-slate-500">
                              {isBangladesh ? "Worldwide European Payments" : "Secure Global Euro Checkout"}
                            </p>
                          </div>
                        </div>
                        {paymentMethod === "paypal" && (
                          <Badge className="bg-[#0070BA] text-white text-[10px] font-black">SELECTED</Badge>
                        )}
                      </div>
                      <div className="text-right pt-2 border-t border-slate-100">
                        <span className="text-xs font-bold text-slate-500">Payable: </span>
                        <span className="text-sm font-black text-[#0070BA]">€{payableNowEur.toLocaleString()} EUR</span>
                      </div>
                    </div>
                  </div>

                  {/* ── Sub-Details: When Bangladesh Transfer Selected (Only when isBangladesh) ────────────── */}
                  {isBangladesh && paymentMethod === "bangladesh-transfer" && (
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 animate-in fade-in duration-200">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                        <span className="text-xs font-bold text-slate-700">
                          Select Bangladesh Transfer Channel:
                        </span>
                        <div className="inline-flex rounded-xl bg-white p-1 border border-slate-200 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => setBdTransferType("bkash")}
                            className={cn(
                              "px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                              bdTransferType === "bkash"
                                ? "bg-[#D12053] text-white shadow-xs"
                                : "text-slate-600 hover:text-slate-900"
                            )}
                          >
                            <Smartphone className="w-3.5 h-3.5" />
                            <span>bKash Personal</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setBdTransferType("bank")}
                            className={cn(
                              "px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                              bdTransferType === "bank"
                                ? "bg-[#0F4C81] text-white shadow-xs"
                                : "text-slate-600 hover:text-slate-900"
                            )}
                          >
                            <Landmark className="w-3.5 h-3.5" />
                            <span>Bank Transfer</span>
                          </button>
                        </div>
                      </div>

                      {/* If bKash Selected: Show bKash Details */}
                      {bdTransferType === "bkash" && (
                        <div className="p-4 rounded-xl bg-white border border-pink-200 space-y-3 text-xs shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="font-black text-[#D12053] text-sm flex items-center gap-2">
                              <Smartphone className="w-4 h-4 text-[#D12053]" />
                              bKash Send Money Details
                            </span>
                            <Badge className="bg-pink-50 text-[#D12053] border-pink-200 font-bold">Personal Account</Badge>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div className="p-3 rounded-lg bg-pink-50/50 border border-pink-100 flex items-center justify-between">
                              <div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase block">bKash Number:</span>
                                <span className="text-base font-black font-mono text-slate-900">01835898287</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => copyToClipboard("01835898287", "bkash")}
                                className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1 shadow-2xs"
                              >
                                {copiedKey === "bkash" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>{copiedKey === "bkash" ? "Copied" : "Copy"}</span>
                              </button>
                            </div>

                            <div className="p-3 rounded-lg bg-pink-50/50 border border-pink-100 flex items-center justify-between">
                              <div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase block">Account Holder:</span>
                                <span className="text-sm font-extrabold text-slate-900">Rabiul H Chawdhury</span>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] font-bold text-slate-500 uppercase block">Send Amount:</span>
                                <span className="text-sm font-black text-[#D12053]">৳{payableNowBdt.toLocaleString()} BDT</span>
                              </div>
                            </div>
                          </div>

                          <p className="text-[11px] text-slate-600 leading-relaxed pt-1">
                            <strong>Instructions:</strong> Open your bKash App &gt; Select <strong>Send Money</strong> &gt; Enter <strong>01835898287</strong> &gt; Send <strong>৳{payableNowBdt.toLocaleString()} BDT</strong>. After sending, enter your 10-character <strong>bKash TrxID</strong> in the box below.
                          </p>
                        </div>
                      )}

                      {/* If Bank Selected: Show Bank Details */}
                      {bdTransferType === "bank" && (
                        <div className="p-4 rounded-xl bg-white border border-blue-200 space-y-3 text-xs shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="font-black text-[#0F4C81] text-sm flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-[#0F4C81]" />
                              The City Bank Transfer Details
                            </span>
                            <Badge className="bg-blue-50 text-[#0F4C81] border-blue-200 font-bold">Official Bank A/C</Badge>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                              <div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase block">Account Number (A/C):</span>
                                <span className="text-base font-black font-mono text-[#0F4C81]">2303620513001</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => copyToClipboard("2303620513001", "bank-ac")}
                                className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1 shadow-2xs"
                              >
                                {copiedKey === "bank-ac" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>{copiedKey === "bank-ac" ? "Copied" : "Copy"}</span>
                              </button>
                            </div>

                            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                              <span className="text-[10px] font-bold text-slate-500 uppercase block">Account Name:</span>
                              <span className="text-sm font-extrabold text-slate-900">Md Hasnain</span>
                            </div>

                            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                              <span className="text-[10px] font-bold text-slate-500 uppercase block">Bank &amp; Branch:</span>
                              <span className="text-xs font-bold text-slate-800">The City Bank Ltd. (Hajigonj Branch)</span>
                            </div>

                            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                              <span className="text-[10px] font-bold text-slate-500 uppercase block">Routing Number:</span>
                              <span className="text-xs font-bold font-mono text-slate-800">225130834</span>
                            </div>
                          </div>

                          <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-100 flex items-center justify-between">
                            <span className="font-bold text-slate-700">Reference Note in Bank Wire:</span>
                            <code className="font-black text-[#0F4C81] bg-white px-2 py-0.5 rounded border border-blue-200">{nextOrderNumber}</code>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Sub-Details: When PayPal Selected ─────────────────────────── */}
                  {paymentMethod === "paypal" && (
                    <div className="p-5 rounded-2xl bg-sky-50/40 border border-sky-200 space-y-3 text-xs shadow-2xs animate-in fade-in duration-200">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-[#0070BA] text-sm flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-[#0070BA]" />
                          PayPal Euro Transfer Details
                        </span>
                        <Badge className="bg-sky-50 text-[#0070BA] border-sky-200 font-bold">Euro Only (€)</Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div className="p-3 rounded-lg bg-white border border-sky-200 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase block">PayPal Email:</span>
                            <span className="text-sm font-black font-mono text-[#0070BA]">mhasnainn@hotmail.com</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard("mhasnainn@hotmail.com", "paypal")}
                            className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1 shadow-2xs"
                          >
                            {copiedKey === "paypal" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedKey === "paypal" ? "Copied" : "Copy"}</span>
                          </button>
                        </div>

                        <div className="p-3 rounded-lg bg-white border border-sky-200 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase block">Recipient:</span>
                            <span className="text-sm font-extrabold text-slate-900">Md Hasnain (SCCG Germany)</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-bold text-slate-500 uppercase block">Amount in Euro:</span>
                            <span className="text-sm font-black text-[#0070BA]">€{payableNowEur.toLocaleString("en-DE", { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-600 leading-relaxed pt-1">
                        <strong>Instructions:</strong> Log in to PayPal &gt; Send Payment to <strong>mhasnainn@hotmail.com</strong> &gt; Enter <strong>€{payableNowEur.toLocaleString("en-DE", { minimumFractionDigits: 2 })}</strong> with note: <strong>{nextOrderNumber}</strong>. Enter your PayPal Transaction ID below.
                      </p>
                    </div>
                  )}

                  {/* ── Payment Reference Input Field (Optional) ────────────────────────────── */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                        <TagIcon className="h-3.5 w-3.5 text-[#0F4C81]" />
                        <span>Payment Reference / TrxID</span>
                      </label>
                      <span className="text-[11px] text-slate-400 font-semibold bg-slate-100 px-2 py-0.5 rounded-md">
                        Optional
                      </span>
                    </div>
                    <Input 
                      placeholder={
                        paymentMethod === "paypal" 
                          ? "e.g. Sender PayPal email or Transaction ID (optional)..." 
                          : bdTransferType === "bkash" 
                          ? "e.g. Sender bKash number (018...) or 10-char TrxID (optional)..." 
                          : "e.g. Sender bank name, account holder name or deposit slip number (optional)..."
                      }
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      className="rounded-xl border-slate-200 bg-white focus:bg-white text-slate-900 font-semibold transition-all"
                    />
                    <p className="text-[11px] text-slate-500">
                      {paymentMethod === "paypal"
                        ? "Hints: Mention your sender PayPal email or Transaction ID from where you sent the money (optional)."
                        : bdTransferType === "bkash"
                        ? "Hints: Mention your sender bKash number (018...) or 10-character TrxID from where you sent the payment (optional)."
                        : "Hints: Mention your sender bank name, branch, account name, or deposit slip note (optional)."}
                    </p>
                  </div>
                </div>
              )}

              {/* ── Condition B: When Pay Later is selected ─────────────────────── */}
              {paymentTiming === "later" && (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/80 via-white to-blue-50/50 border-2 border-emerald-300/80 space-y-3.5 shadow-xs animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 text-sm">Service Reservation (Pay Later)</h4>
                        <p className="text-[11px] text-slate-500">Zero due today &middot; Pay upon consultation</p>
                      </div>
                    </div>
                    <Badge className="bg-emerald-600 text-white font-extrabold text-[10px]">Zero Due Today</Badge>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-emerald-100 text-xs text-slate-700 space-y-2.5 shadow-2xs">
                    <p className="leading-relaxed font-medium">
                      Submit your service reservation today without paying upfront or entering financial credentials.
                    </p>
                    <div className="flex items-start gap-2.5 text-emerald-900 font-semibold bg-emerald-50/80 p-3 rounded-lg border border-emerald-200/80">
                      <Clock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">
                        After submitting your request, one of our representatives will contact you soon (via Email or WhatsApp/Phone) to review your service schedule, answer any questions, and provide your official payment invoice.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 px-1">
                    <span className="text-slate-500 font-semibold">Total Package Value:</span>
                    <span className="font-extrabold text-[#0F4C81] text-sm">
                      €{cartTotalEur.toLocaleString()} EUR
                      {isBangladesh && ` (≈ ৳${cartTotalBdt.toLocaleString()} BDT)`}
                    </span>
                  </div>
                </div>
              )}

              {/* ── Client Email & Admin Confirmation Reassurance Notice ────────── */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 via-slate-50 to-emerald-50 border border-blue-200/80 text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-[#0F4C81]">
                  <Mail className="w-4 h-4 text-[#0F4C81]" />
                  <span>
                    {paymentTiming === "later" 
                      ? "Automated Reservation Email & Representative Follow-Up:" 
                      : "Automated Booking Email & Admin Payment Verification:"}
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  {paymentTiming === "later" 
                    ? "After submitting your request, you will immediately receive an email confirming your booking reservation. An SCCG representative will contact you soon to assist you with payment and confirm your enrollment."
                    : "After submitting your order, you will immediately receive an email detailing your complete service booking and payment instructions. SCCG Admissions & Finance Admin will verify your payment in our accounting system and issue your official enrollment credentials."}
                </p>
              </div>

              {/* Status & Processing Loaders */}
              {paymentStep !== "idle" && (
                <div className="p-6 text-center bg-slate-50 rounded-2xl animate-in fade-in duration-300">
                  {paymentStep === "processing" && (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-8 w-8 text-[#0F4C81] animate-spin" />
                      <p className="font-bold text-sm text-slate-800">
                        {paymentTiming === "later" 
                          ? "Recording service reservation request..." 
                          : "Recording booking details & generating reference..."}
                      </p>
                    </div>
                  )}
                  {paymentStep === "verifying" && (
                    <div className="flex flex-col items-center gap-3">
                      <ShieldCheck className="h-8 w-8 text-emerald-600 animate-bounce" />
                      <p className="font-bold text-sm text-slate-800">
                        {paymentTiming === "later"
                          ? "Notifying SCCG representative & dispatching confirmation email..."
                          : "Dispatching confirmation email & alerting SCCG Admin..."}
                      </p>
                    </div>
                  )}
                  {paymentStep === "success" && (
                    <div className="flex flex-col items-center gap-3 text-emerald-600">
                      <CheckCircle2 className="h-10 w-10 text-emerald-600 animate-in zoom-in" />
                      <p className="font-black text-base">
                        {paymentTiming === "later" ? "Reservation Request Received!" : "Booking Received Successfully!"}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-3 text-xs font-bold">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}
            </CardContent>

            <CardFooter className="bg-slate-50/60 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
              <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Verified SCCG Germany Channel &middot; 256-bit Secure</span>
              </div>
              <Button 
                onClick={handleCompletePurchase}
                disabled={loading || paymentStep !== "idle" || cart.length === 0}
                className="w-full sm:w-auto px-8 py-6 rounded-2xl bg-[#0F4C81] hover:bg-[#0C3E6B] text-white font-extrabold text-sm sm:text-base shadow-lg shadow-blue-900/15 group transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {paymentTiming === "later" ? "Submitting Request..." : "Submitting Booking..."}
                  </>
                ) : cart.length === 0 ? (
                  <span>Cart is Empty (Select a Service)</span>
                ) : paymentTiming === "later" ? (
                  <>
                    <span>Submit Request (Pay Later)</span>
                    <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                ) : (
                  <>
                    <span>Confirm Booking &amp; Submit Payment</span>
                    <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Right Column: Order Summary & Milestone Details */}
        <div className="space-y-6">
          <Card className="rounded-3xl border-slate-200/90 shadow-sm sticky top-6 overflow-hidden">
            <CardHeader className="bg-slate-50/80 border-b border-slate-100 pb-4">
              <CardTitle className="text-base font-extrabold flex items-center gap-2 text-slate-900">
                <ShoppingBag className="h-5 w-5 text-[#0F4C81]" />
                Booking Summary
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4 pt-5">
              <div className="max-h-[320px] overflow-y-auto pr-1 space-y-3 no-scrollbar">
                {cart.length === 0 ? (
                  <div className="py-8 px-4 text-center bg-slate-50/80 rounded-2xl border border-dashed border-slate-200">
                    <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700">No items selected</p>
                    <p className="text-[11px] text-slate-500 mt-1 mb-3">
                      Select any course or program from the catalog to start your enrollment.
                    </p>
                    <Link
                      href="/marketplace"
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0F4C81] text-white text-xs font-bold shadow-sm hover:bg-[#0C3E6B] transition-all"
                    >
                      Browse Marketplace
                    </Link>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.product.id} className="flex gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0 items-start">
                      <div className="h-12 w-12 bg-blue-50 rounded-xl flex items-center justify-center font-black text-sm text-[#0F4C81] border border-blue-100 shrink-0">
                        {item.product.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 line-clamp-1">{item.product.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="inline-flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200 text-[11px] font-bold text-slate-700">
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(item.product.id, item.quantity - 1)}
                              className="text-slate-500 hover:text-slate-900 px-1 font-bold"
                              title="Decrease quantity"
                            >
                              -
                            </button>
                            <span className="w-3 text-center">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(item.product.id, item.quantity + 1)}
                              className="text-slate-500 hover:text-slate-900 px-1 font-bold"
                              title="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                          <span className="text-[11px] text-slate-500">&times; €{item.effectivePrice.toLocaleString()}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.product.id)}
                            className="text-[10px] text-rose-500 hover:text-rose-700 font-bold ml-auto hover:underline"
                            title="Remove item"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-black text-slate-900">
                          €{(item.quantity * item.effectivePrice).toLocaleString()}
                        </p>
                        {isBangladesh && (
                          <p className="text-[10px] text-slate-500 font-mono">
                            ≈ ৳{Math.round(item.quantity * item.effectivePrice * effectiveBdtRate).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Price Calculations */}
              <div className="border-t border-slate-200/80 pt-4 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Order Total Value:</span>
                  <span className="font-extrabold text-slate-900">€{cartTotalEur.toLocaleString()} EUR</span>
                </div>
                {isBangladesh && (
                  <div className="flex justify-between text-slate-600">
                    <span>Equivalent BDT (live):</span>
                    <span className="font-bold text-slate-800">≈ ৳{cartTotalBdt.toLocaleString()} BDT</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Selected Plan:</span>
                  <Badge variant="outline" className="text-[10px] font-bold uppercase bg-slate-50">
                    {paymentPlan === "full" ? "Full Payment" : `Installment Plan (${installmentCount}x)`}
                  </Badge>
                </div>

                {/* Highlighted Payable Now Box */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-50 to-slate-50 border border-blue-200/80 mt-3 space-y-1">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-black text-[#0F4C81] uppercase tracking-wider">
                      Payable Today:
                    </span>
                    <span className="text-2xl font-black text-[#0F4C81]">
                      €{payableNowEur.toLocaleString()}
                    </span>
                  </div>
                  {isBangladesh ? (
                    <div className="flex justify-between text-[11px] text-slate-700 font-bold">
                      <span>In Bangladesh Taka:</span>
                      <span className="font-mono text-emerald-700">≈ ৳{payableNowBdt.toLocaleString()} BDT</span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                      <span>Official Settlement:</span>
                      <span className="font-bold text-[#0F4C81]">European Euro (€)</span>
                    </div>
                  )}
                  {hasInstallmentOption && paymentPlan === "installment" && (
                    <p className="text-[10px] text-amber-800 font-semibold pt-1 border-t border-blue-100">
                      Rest €{remainingEur.toLocaleString()}{isBangladesh ? ` (≈ ৳${remainingBdt.toLocaleString()} BDT)` : ""} scheduled in {installmentCount} monthly installments.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>

            <CardFooter className="bg-slate-50/60 p-4 border-t border-slate-100 flex flex-col gap-2 text-center">
              <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-600">
                <Truck className="h-3.5 w-3.5 text-[#0F4C81]" />
                <span>Immediate Enrollment Activation Upon Payment Confirmation</span>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
