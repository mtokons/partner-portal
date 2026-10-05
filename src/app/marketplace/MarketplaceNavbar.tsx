"use client";

import Link from "next/link";
import Image from "next/image";
import type { SessionUser } from "@/types";
import {
  LogIn,
  UserPlus,
  LayoutDashboard,
  ShoppingBag,
  Store,
  Shield,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

import { useState, useEffect } from "react";

interface Props {
  user?: SessionUser | null;
}

export default function MarketplaceNavbar({ user }: Props) {
  const isAuth = !!user?.email;
  const [selectedCountry, setSelectedCountry] = useState<string>("Germany");
  const [liveRate, setLiveRate] = useState<number | null>(null);
  const [cartCount, setCartCount] = useState<number>(0);

  // Sync cart counter in real-time across the navbar
  useEffect(() => {
    const updateCartCount = () => {
      try {
        const stored = localStorage.getItem("marketplace_cart");
        if (stored) {
          const items = JSON.parse(stored);
          if (Array.isArray(items)) {
            const count = items.reduce((s: number, i: any) => s + (i.quantity || 1), 0);
            setCartCount(count);
            return;
          }
        }
        setCartCount(0);
      } catch {
        setCartCount(0);
      }
    };

    updateCartCount();
    window.addEventListener("sccg_cart_updated", updateCartCount);
    window.addEventListener("storage", updateCartCount);
    return () => {
      window.removeEventListener("sccg_cart_updated", updateCartCount);
      window.removeEventListener("storage", updateCartCount);
    };
  }, []);

  useEffect(() => {
    // 1. Initial country check from localStorage or access location
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sccg_checkout_country");
      if (saved) {
        setSelectedCountry(saved);
      } else {
        let detected = "Germany";
        try {
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
          if (tz === "Asia/Dhaka") detected = "Bangladesh";
          else if (tz.includes("Berlin") || tz.includes("Busingen")) detected = "Germany";
          else if (tz.includes("London") || tz.includes("Belfast")) detected = "United Kingdom";
          else if (tz.startsWith("America/")) detected = "United States";
          else if (tz.startsWith("Europe/")) detected = "Germany";
        } catch {}
        setSelectedCountry(detected);

        fetch("/api/geo")
          .then((r) => r.json())
          .then((d) => {
            if (d?.country && !localStorage.getItem("sccg_checkout_country")) {
              setSelectedCountry(d.country);
            }
          })
          .catch(() => {});
      }
    }

    // 2. Fetch live rate
    fetch("/api/currency?target=BDT")
      .then((r) => r.json())
      .then((d) => {
        if (d?.rate) setLiveRate(Number(d.rate));
      })
      .catch(() => {});

    // 3. Listen to country change events across marketplace & checkout
    const handleCountryChange = (e: Event) => {
      const customEvt = e as CustomEvent<string>;
      const newCountry = customEvt.detail || localStorage.getItem("sccg_checkout_country");
      if (newCountry) {
        setSelectedCountry(newCountry);
      }
    };

    window.addEventListener("sccg_country_changed", handleCountryChange);
    window.addEventListener("storage", handleCountryChange);

    return () => {
      window.removeEventListener("sccg_country_changed", handleCountryChange);
      window.removeEventListener("storage", handleCountryChange);
    };
  }, []);

  const isBangladesh = selectedCountry.trim().toLowerCase() === "bangladesh";

  function handleSelectCountry(newCountry: string) {
    setSelectedCountry(newCountry);
    if (typeof window !== "undefined") {
      localStorage.setItem("sccg_checkout_country", newCountry);
      window.dispatchEvent(new CustomEvent("sccg_country_changed", { detail: newCountry }));
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-xl border-b border-slate-200/90 shadow-xs transition-all">
      {/* ── German Flag & SCCG 4-Color Accent Top Stripe ─────────────────────── */}
      <div className="h-[3px] w-full bg-gradient-to-r from-[#111827] via-[#0F4C81] via-[#DC2626] to-[#F59E0B]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <Link href="/marketplace" className="flex items-center gap-3 group">
            <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-white border border-slate-200 flex items-center justify-center p-1 group-hover:border-[#0F4C81] transition-colors shadow-sm">
              <Image
                src="/assets/sccg-logo.png"
                alt="SCCG Logo"
                width={36}
                height={36}
                className="object-contain"
                priority
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-900 text-base tracking-tight group-hover:text-[#0F4C81] transition-colors">
                  SCCG
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0F4C81] font-bold border border-blue-200">
                  Marketplace
                </span>
                {/* German Flag Mini Tag */}
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#111827]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                  GERMANY
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium hidden sm:block">
                Direct Service Catalog &amp; E-Commerce
              </p>
            </div>
          </Link>
        </div>

        {/* Center Quick Navigation */}
        <nav className="hidden md:flex items-center gap-2 text-xs font-semibold text-slate-600">
          <Link
            href="/marketplace"
            className="px-3 py-1.5 rounded-lg text-[#0F4C81] bg-blue-50/80 border border-blue-100 flex items-center gap-1.5 shadow-2xs font-bold"
          >
            <Store className="w-3.5 h-3.5 text-[#0F4C81]" />
            All Products
          </Link>
          <Link
            href="/partner/marketplace"
            className="px-3 py-1.5 rounded-lg hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
          >
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            Partner Portal
          </Link>

          {/* Country Selector in Navbar */}
          <div className="relative inline-flex items-center ml-1">
            <select
              value={selectedCountry}
              onChange={(e) => handleSelectCountry(e.target.value)}
              className="h-8 pl-2.5 pr-6 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs focus:outline-none focus:ring-1 focus:ring-[#0F4C81] transition-all cursor-pointer appearance-none"
              title="Select Your Country"
            >
              <option value="Germany">🇩🇪 Germany</option>
              <option value="Bangladesh">🇧🇩 Bangladesh</option>
              <option value="United Kingdom">🇬🇧 United Kingdom</option>
              <option value="United States">🇺🇸 United States</option>
              <option value="Canada">🇨🇦 Canada</option>
              <option value="Australia">🇦🇺 Australia</option>
              <option value="United Arab Emirates">🇦🇪 UAE</option>
              <option value="Saudi Arabia">🇸🇦 Saudi Arabia</option>
              <option value="India">🇮🇳 India</option>
              <option value="Pakistan">🇵🇰 Pakistan</option>
              <option value="Other">🌍 Other</option>
            </select>
            <span className="pointer-events-none absolute right-2 text-[9px] text-slate-400">▼</span>
          </div>

          {/* Live EUR to BDT Rate Pill with 2.5% Govt Remittance Bonus — ONLY visible when Bangladesh is selected */}
          {isBangladesh && liveRate && (
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-300 text-xs font-bold text-emerald-950 shadow-2xs ml-1 transition-all animate-in fade-in zoom-in-95 duration-200"
              title={`Live Rate Breakdown: Base ECB ৳${liveRate.toFixed(2)} + 2.5% Bangladesh Govt Remittance Bonus (৳${(liveRate * 0.025).toFixed(2)}) = ৳${(liveRate * 1.025).toFixed(2)} / EUR`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-mono">
                1 EUR ≈ <strong>৳{(liveRate * 1.025).toFixed(2)} BDT</strong>
              </span>
              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                +2.5% Bonus
              </span>
            </div>
          )}
        </nav>

        {/* Right Corner: Auth Options & Cart */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Mobile Country Selector */}
          <div className="md:hidden relative inline-flex items-center">
            <select
              value={selectedCountry}
              onChange={(e) => handleSelectCountry(e.target.value)}
              className="h-8 pl-2 pr-5 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700 shadow-2xs focus:outline-none focus:ring-1 focus:ring-[#0F4C81] transition-all cursor-pointer appearance-none"
              title="Select Country"
            >
              <option value="Germany">🇩🇪 DE</option>
              <option value="Bangladesh">🇧🇩 BD</option>
              <option value="United Kingdom">🇬🇧 UK</option>
              <option value="United States">🇺🇸 US</option>
              <option value="Other">🌍 Other</option>
            </select>
            <span className="pointer-events-none absolute right-1.5 text-[8px] text-slate-400">▼</span>
          </div>

          {/* Cart Shortcut */}
          <Link
            href="/marketplace/checkout"
            className="relative flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-800 transition-all shadow-2xs group"
            title="View Cart & Checkout"
          >
            <ShoppingBag className="w-4 h-4 text-[#0F4C81] group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">Cart</span>
            {cartCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#0F4C81] text-white text-[10px] font-black min-w-[18px] text-center shadow-xs animate-in zoom-in-75 duration-200">
                {cartCount}
              </span>
            )}
          </Link>

          {/* Conditional: Guest vs Authenticated User */}
          {isAuth ? (
            <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-slate-200">
              <div className="hidden lg:flex flex-col text-right">
                <span className="text-xs font-bold text-slate-900 leading-tight">
                  {user.name || user.email?.split("@")[0]}
                </span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono font-semibold">
                  {user.role}
                </span>
              </div>

              <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center font-black text-xs text-[#0F4C81] shadow-2xs">
                {user.email ? user.email.charAt(0).toUpperCase() : "U"}
              </div>

              <Link
                href="/dashboard"
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#0F4C81] hover:bg-[#0C3E6B] rounded-xl shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">My Console</span>
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-slate-200">
              {/* Login Button */}
              <Link
                href="/login?callbackUrl=/marketplace"
                className="px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-xl border border-slate-300 transition-all flex items-center gap-1.5 active:scale-95 shadow-2xs"
              >
                <LogIn className="w-3.5 h-3.5 text-[#0F4C81]" />
                <span>Log In</span>
              </Link>

              {/* Register Button (with German Flag Gold / SCCG Blue accent) */}
              <Link
                href="/register"
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-[#0F4C81] to-[#1D4ED8] hover:from-[#0C3E6B] hover:to-[#1E40AF] rounded-xl shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Register</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Bangladesh Live BDT Remittance Banner (Mobile only, conditional on Bangladesh) */}
      {isBangladesh && liveRate && (
        <div className="md:hidden bg-emerald-50 border-t border-b border-emerald-200 px-4 py-1.5 flex items-center justify-between text-[11px] font-bold text-emerald-950 animate-in fade-in duration-200">
          <div className="flex items-center gap-1.5 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>1 EUR ≈ ৳{(liveRate * 1.025).toFixed(2)} BDT</span>
          </div>
          <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
            +2.5% Bonus
          </span>
        </div>
      )}
    </header>
  );
}
