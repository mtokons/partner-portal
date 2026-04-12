"use client";
import React from "react";
import { cn } from "@/lib/utils";

interface SCCGCardProps {
  bankName?: string;
  cardNumber?: string;
  cardholder?: string;
  expiry?: string;
  tier?: "standard" | "premium" | "platinum" | "not-issued";
  balance?: number;
  currency?: "BDT" | "EUR";
  className?: string;
}

const tierStyles = {
  "not-issued": {
    gradient: "linear-gradient(135deg, #1f2937 0%, #111827 100%)",
    textOpacity: "opacity-40",
    glow: "",
    overlay: "bg-black/40",
    label: "Digital Pass",
    chip: "bg-slate-700/50",
    accent: "text-slate-500"
  },
  standard: {
    gradient: "linear-gradient(135deg, #2d3436 0%, #636e72 100%)",
    textOpacity: "opacity-90",
    glow: "shadow-[0_0_30px_rgba(45,52,54,0.3)]",
    overlay: "",
    label: "Partner Card",
    chip: "bg-yellow-300/80",
    accent: "text-white"
  },
  premium: {
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    textOpacity: "opacity-100",
    glow: "shadow-[0_0_40px_rgba(102,126,234,0.4)]",
    overlay: "bg-white/5",
    label: "Premium Tier",
    chip: "bg-amber-400/90",
    accent: "text-indigo-100"
  },
  platinum: {
    gradient: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
    textOpacity: "opacity-100",
    glow: "shadow-[0_0_50px_rgba(15,52,96,0.5)]",
    overlay: "bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20",
    label: "Platinum Elite",
    chip: "bg-slate-300",
    accent: "text-blue-200"
  }
};

export default function SCCGCard({ 
  bankName = "SCCG GLOBAL", 
  cardNumber = "•••• •••• •••• ••••", 
  cardholder = "CARDHOLDER NAME", 
  expiry = "MM/YY",
  tier = "standard",
  balance,
  currency = "BDT",
  className
}: SCCGCardProps) {
  const style = tierStyles[tier];
  const currencySymbol = currency === "EUR" ? "€" : "৳";

  return (
    <div className={cn("w-full max-w-md aspect-[1.58/1] rounded-[2rem] overflow-hidden transition-all duration-500 perspective-1000 group", style.glow, className)}>
      <div className="relative w-full h-full p-8 flex flex-col justify-between text-white" style={{ background: style.gradient }}>
        
        {/* Decorative Overlay */}
        <div className={cn("absolute inset-0 pointer-events-none", style.overlay)} />
        
        {/* Background Light Effects */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className={cn("text-[10px] font-black uppercase tracking-[0.2em]", style.textOpacity)}>{bankName}</p>
              <div className="flex items-center gap-2">
                 <div className={cn("h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse")} />
                 <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">Active System</p>
              </div>
            </div>
            <div className="text-right">
               <p className={cn("text-xs font-black uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-lg", style.accent)}>{style.label}</p>
            </div>
          </div>

          {/* Electronic Chip */}
          <div className="mt-8 relative h-10 w-14">
            <div className={cn("absolute inset-0 rounded-lg shadow-inner", style.chip)} />
            <div className="absolute inset-0 overflow-hidden rounded-lg">
               <div className="absolute top-1/2 left-0 w-full h-px bg-black/10" />
               <div className="absolute top-0 left-1/3 w-px h-full bg-black/10" />
               <div className="absolute top-0 left-2/3 w-px h-full bg-black/10" />
            </div>
          </div>
        </div>

        <div className="relative z-10 flex flex-col gap-6">
          {/* Card Number */}
          <div className="flex flex-col gap-1">
            <p className="text-2xl font-mono tracking-[0.2em] leading-none drop-shadow-md">
              {cardNumber.replace(/(.{4})/g, "$1 ").trim() || "•••• •••• •••• ••••"}
            </p>
          </div>

          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <p className={cn("text-[8px] font-black uppercase tracking-widest", style.textOpacity)}>Card Holder</p>
              <p className="text-sm font-bold tracking-tight uppercase truncate max-w-[150px]">{cardholder}</p>
            </div>

            <div className="flex items-center gap-6">
               <div className="space-y-1 text-center">
                  <p className={cn("text-[8px] font-black uppercase tracking-widest", style.textOpacity)}>Expires</p>
                  <p className="text-sm font-bold font-mono">{expiry}</p>
               </div>
               
               {/* Mastercard-style mark */}
               <div className="relative flex -space-x-4 h-10 items-center justify-center">
                  <div className="h-10 w-10 rounded-full bg-rose-500/90 mix-blend-screen" />
                  <div className="h-10 w-10 rounded-full bg-amber-500/90 mix-blend-screen" />
               </div>
            </div>
          </div>
        </div>

        {/* Conditional Balance (if admin or authorized) */}
        {balance !== undefined && (
          <div className="absolute top-32 right-8 text-right z-10">
             <p className={cn("text-[8px] font-black uppercase tracking-widest", style.textOpacity)}>Account Balance</p>
             <p className="text-2xl font-black">{currencySymbol}{balance.toLocaleString()}</p>
          </div>
        )}
      </div>
    </div>
  );
}
