"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  X,
  ShoppingBag,
  UserCheck,
  CreditCard,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Building2,
  FileCheck2,
  Zap,
  GraduationCap,
  Euro,
  Lock,
} from "lucide-react";

interface MarketplaceOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MarketplaceOnboardingModal({
  isOpen,
  onClose,
}: MarketplaceOnboardingModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(1);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleDismiss();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Gentle auto-highlight loop between steps to give a dynamic feel
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev >= 4 ? 1 : prev + 1));
    }, 4500);
    return () => clearInterval(interval);
  }, [isOpen]);

  const handleDismiss = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sccg_marketplace_guide_seen", "true");
      if (dontShowAgain) {
        localStorage.setItem("sccg_marketplace_guide_permanent_hide", "true");
      }
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto">
      {/* Click outside backdrop */}
      <div className="fixed inset-0" onClick={handleDismiss} />

      {/* Embedded CSS for animations */}
      <style jsx>{`
        @keyframes pulseGlow {
          0%, 100% {
            box-shadow: 0 0 15px -3px rgba(15, 76, 129, 0.2), 0 0 6px -2px rgba(15, 76, 129, 0.1);
          }
          50% {
            box-shadow: 0 0 25px 2px rgba(15, 76, 129, 0.4), 0 0 12px 1px rgba(59, 130, 246, 0.3);
          }
        }
        @keyframes beamFlow {
          0% {
            transform: translateX(-100%);
            opacity: 0;
          }
          30% {
            opacity: 1;
          }
          70% {
            opacity: 1;
          }
          100% {
            transform: translateX(200%);
            opacity: 0;
          }
        }
        @keyframes subtleFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        .animate-beam {
          animation: beamFlow 2.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .animate-float {
          animation: subtleFloat 3.5s ease-in-out infinite;
        }
      `}</style>

      {/* Modal Dialog Container */}
      <div className="relative z-10 w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden my-auto animate-in zoom-in-95 duration-300">
        
        {/* ── German Quality Flag Stripe ───────────────────────────────────── */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#111827] via-[#0F4C81] via-[#DC2626] to-[#F59E0B]" />

        {/* ── Modal Header ─────────────────────────────────────────────────── */}
        <div className="relative px-6 sm:px-8 pt-6 pb-4 bg-gradient-to-b from-slate-50 dark:from-slate-900/90 to-white dark:to-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4">
          <div className="space-y-1.5 pr-14">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#0F4C81] dark:text-blue-400 border border-blue-200/80 dark:border-blue-800 text-xs font-bold tracking-tight shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-[#0F4C81] dark:text-blue-400 animate-spin-slow" />
                Easy 4-Step Booking Diagram
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold">
                <Euro className="w-3 h-3" />
                Euro (€) Guaranteed Pricing
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              How to Book Your Service on SCCG
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl font-normal leading-relaxed">
              Book professional language courses, Ausbildung preparation, and German visa advisory with full transparency in <strong className="text-slate-900 dark:text-white font-semibold">Euro (€)</strong>.
            </p>
          </div>

          {/* ── Big Close Button ────────────────────────────────────────────── */}
          <button
            onClick={handleDismiss}
            className="group absolute top-5 right-5 sm:top-6 sm:right-6 w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 border-2 border-slate-200 dark:border-slate-700 hover:border-rose-400 flex items-center justify-center text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-all shadow-sm active:scale-90"
            title="Close Guide (Esc)"
            aria-label="Close Guide"
          >
            <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-200 stroke-[2.5]" />
          </button>
        </div>

        {/* ── Modal Body: Interactive Visual Block Diagram ────────────────── */}
        <div className="p-5 sm:p-8 space-y-6 max-h-[72vh] overflow-y-auto">
          
          {/* Step Selector Pills (Clickable Nav) */}
          <div className="flex items-center justify-center gap-2 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-2xl max-w-xl mx-auto border border-slate-200/80 dark:border-slate-800">
            {[
              { num: 1, label: "1. Select Service" },
              { num: 2, label: "2. Quick Access" },
              { num: 3, label: "3. Pay in € (Euro)" },
              { num: 4, label: "4. Activation" },
            ].map((step) => {
              const isActive = activeStep === step.num;
              return (
                <button
                  key={step.num}
                  type="button"
                  onClick={() => setActiveStep(step.num)}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all text-center ${
                    isActive
                      ? "bg-white dark:bg-slate-900 text-[#0F4C81] dark:text-blue-400 shadow-sm border border-slate-200 dark:border-slate-700 scale-102"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <span className="hidden sm:inline">{step.label}</span>
                  <span className="sm:hidden font-black">Step {step.num}</span>
                </button>
              );
            })}
          </div>

          {/* ── 4-BLOCK FLOWCHART PIPELINE ─────────────────────────────────── */}
          <div className="relative">
            {/* Desktop Connecting Animated Line behind cards */}
            <div className="hidden lg:block absolute top-[45%] left-10 right-10 h-1 bg-slate-100 dark:bg-slate-800 -translate-y-1/2 z-0 overflow-hidden rounded-full">
              <div className="h-full w-40 bg-gradient-to-r from-transparent via-[#0F4C81] to-transparent animate-beam" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
              
              {/* ── STEP 1: Select Service ─────────────────────────────────── */}
              <div
                onClick={() => setActiveStep(1)}
                className={`relative cursor-pointer rounded-2xl p-4 sm:p-5 transition-all duration-300 border flex flex-col justify-between group ${
                  activeStep === 1
                    ? "bg-gradient-to-b from-blue-50/90 to-white dark:from-blue-950/40 dark:to-slate-900 border-[#0F4C81] dark:border-blue-500 shadow-lg ring-2 ring-blue-500/20 scale-[1.02]"
                    : "bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 hover:border-blue-300 hover:shadow-md"
                }`}
              >
                <div>
                  {/* Top Badge & Icon */}
                  <div className="flex items-center justify-between pb-3">
                    <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#0F4C81] text-white shadow-xs">
                      Step 01
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-[#0F4C81] dark:text-blue-300 font-bold group-hover:scale-110 transition-transform">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Header Title */}
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base leading-tight">
                    Choose Service
                  </h3>
                  <p className="text-xs text-blue-700 dark:text-blue-400 font-semibold mt-0.5">
                    100% In Euro (€)
                  </p>

                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                    Select your German language course, Ausbildung placement, or visa counseling package.
                  </p>
                </div>

                {/* Visual Block Diagram Element */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-slate-800/80 border border-blue-200/70 dark:border-slate-700 flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-2 truncate">
                      <GraduationCap className="w-4 h-4 text-[#0F4C81] dark:text-blue-400 shrink-0" />
                      <div className="truncate">
                        <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                          telc German B2
                        </p>
                        <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                          €450.00
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold bg-[#0F4C81] text-white px-2 py-1 rounded-lg shrink-0 group-hover:bg-blue-600 transition-colors">
                      + Add
                    </span>
                  </div>
                </div>
              </div>

              {/* ── STEP 2: Instant Booking Access ─────────────────────────── */}
              <div
                onClick={() => setActiveStep(2)}
                className={`relative cursor-pointer rounded-2xl p-4 sm:p-5 transition-all duration-300 border flex flex-col justify-between group ${
                  activeStep === 2
                    ? "bg-gradient-to-b from-amber-50/90 to-white dark:from-amber-950/40 dark:to-slate-900 border-amber-500 dark:border-amber-500 shadow-lg ring-2 ring-amber-500/20 scale-[1.02]"
                    : "bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 hover:border-amber-300 hover:shadow-md"
                }`}
              >
                <div>
                  {/* Top Badge & Icon */}
                  <div className="flex items-center justify-between pb-3">
                    <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 shadow-xs">
                      Step 02
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-800 dark:text-amber-300 font-bold group-hover:scale-110 transition-transform">
                      <Zap className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Header Title */}
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base leading-tight">
                    Quick Booking
                  </h3>
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold mt-0.5">
                    Zero Account Hassle
                  </p>

                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                    Check out in seconds as a guest with just your email, or log in to redeem student &amp; partner discounts.
                  </p>
                </div>

                {/* Visual Block Diagram Element */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="grid grid-cols-2 gap-1.5 text-[10px] font-bold">
                    <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-center flex items-center justify-center gap-1">
                      <UserCheck className="w-3 h-3" />
                      Guest Fast
                    </div>
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#0F4C81] dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-center flex items-center justify-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Discounts
                    </div>
                  </div>
                </div>
              </div>

              {/* ── STEP 3: Secure Euro (€) Payment ────────────────────────── */}
              <div
                onClick={() => setActiveStep(3)}
                className={`relative cursor-pointer rounded-2xl p-4 sm:p-5 transition-all duration-300 border flex flex-col justify-between group ${
                  activeStep === 3
                    ? "bg-gradient-to-b from-emerald-50/90 to-white dark:from-emerald-950/40 dark:to-slate-900 border-emerald-500 dark:border-emerald-500 shadow-lg ring-2 ring-emerald-500/20 scale-[1.02]"
                    : "bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 hover:border-emerald-300 hover:shadow-md"
                }`}
              >
                <div>
                  {/* Top Badge & Icon */}
                  <div className="flex items-center justify-between pb-3">
                    <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs">
                      Step 03
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-bold group-hover:scale-110 transition-transform">
                      <CreditCard className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Header Title */}
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base leading-tight">
                    Pay in Euro (€)
                  </h3>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">
                    Cards • SEPA • PayPal
                  </p>

                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                    Pay safely in Euros with Visa, MasterCard, direct German SEPA bank wire, or PayPal with 100% encryption.
                  </p>
                </div>

                {/* Visual Block Diagram Element */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="p-2 rounded-xl bg-emerald-50/70 dark:bg-slate-800/80 border border-emerald-200/70 dark:border-slate-700 flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300 shadow-2xs">
                    <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                      <Lock className="w-3.5 h-3.5" />
                      100% Encrypted
                    </span>
                    <span className="bg-emerald-600 text-white px-2 py-0.5 rounded text-[10px]">
                      € EURO
                    </span>
                  </div>
                </div>
              </div>

              {/* ── STEP 4: Instant Activation ─────────────────────────────── */}
              <div
                onClick={() => setActiveStep(4)}
                className={`relative cursor-pointer rounded-2xl p-4 sm:p-5 transition-all duration-300 border flex flex-col justify-between group ${
                  activeStep === 4
                    ? "bg-gradient-to-b from-indigo-50/90 to-white dark:from-indigo-950/40 dark:to-slate-900 border-indigo-500 dark:border-indigo-500 shadow-lg ring-2 ring-indigo-500/20 scale-[1.02]"
                    : "bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 hover:border-indigo-300 hover:shadow-md"
                }`}
              >
                <div>
                  {/* Top Badge & Icon */}
                  <div className="flex items-center justify-between pb-3">
                    <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-600 text-white shadow-xs">
                      Step 04
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold group-hover:scale-110 transition-transform">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Header Title */}
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base leading-tight">
                    Instant Delivery
                  </h3>
                  <p className="text-xs text-indigo-700 dark:text-indigo-400 font-semibold mt-0.5">
                    Invoice &amp; Expert Assigned
                  </p>

                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                    Receive your official German PDF tax invoice immediately and get paired with your assigned expert consultant.
                  </p>
                </div>

                {/* Visual Block Diagram Element */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="p-2 rounded-xl bg-indigo-50/80 dark:bg-slate-800/80 border border-indigo-200/70 dark:border-slate-700 flex items-center justify-between text-[10px] font-bold text-indigo-950 dark:text-indigo-200 shadow-2xs">
                    <span className="flex items-center gap-1.5">
                      <FileCheck2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      PDF Invoice
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      ● Active
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* ── Partner Pro-Tip Mini Banner (Sleek, Not Overwhelming) ───────── */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-[#0F4C81] to-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md border border-slate-700/60">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-white">
                  Consulting Agencies &amp; Education Partners
                </h4>
                <p className="text-[11px] sm:text-xs text-slate-200">
                  Register as an official SCCG Partner to book services for candidates in Euro with wholesale margins.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <Link
                href="/login?callbackUrl=/marketplace"
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-colors"
                onClick={handleDismiss}
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="px-3.5 py-1.5 rounded-xl bg-[#F59E0B] hover:bg-[#d98206] text-slate-950 font-black text-xs shadow-xs transition-colors"
                onClick={handleDismiss}
              >
                Partner Register
              </Link>
            </div>
          </div>
        </div>

        {/* ── Modal Footer with Checkbox & Primary Action ──────────────────── */}
        <div className="px-6 sm:px-8 py-4 sm:py-5 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-[#0F4C81] focus:ring-[#0F4C81]"
            />
            <span>Don&apos;t show this guide on my next visit</span>
          </label>

          {/* ── Primary Action Button ──────────────────────────────────────── */}
          <button
            onClick={handleDismiss}
            className="w-full sm:w-auto px-7 py-3 bg-gradient-to-r from-[#0F4C81] via-[#0C3E6B] to-[#1D4ED8] hover:from-[#0C3E6B] hover:to-[#1E40AF] text-white rounded-2xl font-black text-sm sm:text-base shadow-lg shadow-blue-900/25 flex items-center justify-center gap-2.5 transition-all active:scale-95 group"
          >
            <span>Explore Services in € (Euro)</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
          </button>
        </div>

      </div>
    </div>
  );
}
