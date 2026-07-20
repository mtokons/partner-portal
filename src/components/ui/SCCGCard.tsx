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
  /** Firebase UID — used to generate a unique deterministic digital pass ID */
  userId?: string;
  /** ISO date string — card valid from this month for 5 years */
  registrationDate?: string;
}

/** Deterministic 16-digit pass number derived from userId (FNV-1a inspired) */
function generateDigitalPassId(userId: string): string {
  let h1 = 2166136261 >>> 0;
  let h2 = 0x9e3779b9 >>> 0;
  for (let i = 0; i < userId.length; i++) {
    const c = userId.charCodeAt(i);
    h1 = (Math.imul(h1 ^ c, 16777619)) >>> 0;
    h2 = (Math.imul(h2 ^ c, 2654435761)) >>> 0;
  }
  const p1 = String(h1 % 10000).padStart(4, "0");
  const p2 = String((h1 >>> 4) % 10000).padStart(4, "0");
  const p3 = String(h2 % 10000).padStart(4, "0");
  const p4 = String((h2 >>> 4) % 10000).padStart(4, "0");
  return `${p1} ${p2} ${p3} ${p4}`;
}

/** 5-year expiry starting from registration month */
function getPassExpiry(registrationDate?: string): string {
  const base = registrationDate ? new Date(registrationDate) : new Date();
  const exp = new Date(base);
  exp.setFullYear(exp.getFullYear() + 5);
  return `${String(exp.getMonth() + 1).padStart(2, "0")}/${String(exp.getFullYear()).slice(-2)}`;
}

const tierStyles = {
  "not-issued": {
    gradient: "linear-gradient(135deg, #1a1a2e 0%, #0d1b2a 50%, #0a1628 100%)",
    textOpacity: "opacity-60",
    glow: "shadow-[0_0_20px_rgba(59,130,246,0.15)]",
    label: "Digital Pass",
    chip: "bg-slate-600/60",
    accent: "text-blue-300",
    accentBg: "rgba(59,130,246,0.2)",
  },
  standard: {
    gradient: "linear-gradient(135deg, #2d3436 0%, #636e72 100%)",
    textOpacity: "opacity-90",
    glow: "shadow-[0_0_30px_rgba(45,52,54,0.3)]",
    label: "Partner Card",
    chip: "bg-yellow-300/80",
    accent: "text-white",
    accentBg: "rgba(255,255,255,0.2)",
  },
  premium: {
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    textOpacity: "opacity-100",
    glow: "shadow-[0_0_40px_rgba(102,126,234,0.4)]",
    label: "Premium Tier",
    chip: "bg-amber-400/90",
    accent: "text-indigo-100",
    accentBg: "rgba(255,255,255,0.2)",
  },
  platinum: {
    gradient: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
    textOpacity: "opacity-100",
    glow: "shadow-[0_0_50px_rgba(15,52,96,0.5)]",
    label: "Platinum Elite",
    chip: "bg-slate-300",
    accent: "text-blue-200",
    accentBg: "rgba(255,255,255,0.15)",
  },
};

/** Animated hologram sticker — iridescent rainbow conic-gradient */
function HologramSticker() {
  return (
    <>
      <style>{`
        @keyframes sccg-holo-spin {
          0%   { filter: hue-rotate(0deg)   brightness(1.05) saturate(1.8); }
          25%  { filter: hue-rotate(90deg)  brightness(1.25) saturate(2.2); }
          50%  { filter: hue-rotate(180deg) brightness(1.05) saturate(1.8); }
          75%  { filter: hue-rotate(270deg) brightness(1.25) saturate(2.2); }
          100% { filter: hue-rotate(360deg) brightness(1.05) saturate(1.8); }
        }
        @keyframes sccg-holo-sweep {
          0%   { transform: translateX(-120%) rotate(35deg); opacity: 0; }
          30%  { opacity: 0.7; }
          70%  { opacity: 0.7; }
          100% { transform: translateX(220%) rotate(35deg); opacity: 0; }
        }
        @keyframes sccg-logo-pulse {
          0%, 100% { opacity: 0.9; transform: scale(1);    }
          50%       { opacity: 1;   transform: scale(1.08); }
        }
      `}</style>
      <div
        className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0"
        style={{
          background: "conic-gradient(from 0deg, #ff0080, #ff8c00, #ffe600, #40e0d0, #7b2fff, #ff0080)",
          animation: "sccg-holo-spin 3.5s linear infinite",
          boxShadow: "0 0 10px rgba(255,255,255,0.35), 0 0 3px rgba(0,0,0,0.5)",
        }}
      >
        {/* Sweep shimmer */}
        <div
          className="absolute inset-0 bg-white/50"
          style={{ animation: "sccg-holo-sweep 2s ease-in-out infinite" }}
        />
        {/* Center mark */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0">
          <span className="text-[5.5px] font-black text-white drop-shadow leading-none tracking-tight">SCCG</span>
          <span className="text-[6px] text-white/80 leading-none mt-0.5">✦</span>
        </div>
      </div>
    </>
  );
}

/**
 * SCCG brand icon — the four-figure pinwheel star.
 * Colours match the official logo: yellow, green, red, near-black.
 * Rendered on a transparent background so it blends on any card gradient.
 */
function SCCGLogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ animation: "sccg-logo-pulse 4s ease-in-out infinite", filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.45))" }}
    >
      {/*
        Four "leaf" wedges — each rotated 90° from the previous.
        Each leaf is a figure (head circle + body arc) on a coloured filled wedge.
        Wedge: path from centre, arc 90°, back to centre.
      */}

      {/* ── YELLOW leaf (top-left, 225°→315°) ── */}
      <path d="M50 50 L18 18 A45 45 0 0 1 50 5 Z" fill="#F5C518" opacity="0.95"/>
      {/* head */}
      <circle cx="33" cy="19" r="5" fill="white" opacity="0.95"/>
      {/* body arc */}
      <path d="M26 30 Q33 24 40 30" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round"/>

      {/* ── GREEN leaf (top-right, 315°→45°) ── */}
      <path d="M50 50 L82 18 A45 45 0 0 1 95 50 Z" fill="#2E7D32" opacity="0.95"/>
      {/* head */}
      <circle cx="82" cy="33" r="5" fill="white" opacity="0.95"/>
      {/* body arc */}
      <path d="M74 40 Q82 35 88 42" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round"/>

      {/* ── RED leaf (bottom-left, 135°→225°) ── */}
      <path d="M50 50 L18 82 A45 45 0 0 1 5 50 Z" fill="#C62828" opacity="0.95"/>
      {/* head */}
      <circle cx="18" cy="67" r="5" fill="white" opacity="0.95"/>
      {/* body arc */}
      <path d="M12 58 Q18 63 26 60" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round"/>

      {/* ── DARK leaf (bottom-right, 45°→135°) ── */}
      <path d="M50 50 L82 82 A45 45 0 0 1 50 95 Z" fill="#1A1A1A" opacity="0.92"/>
      {/* head */}
      <circle cx="67" cy="82" r="5" fill="white" opacity="0.95"/>
      {/* body arc */}
      <path d="M60 74 Q67 80 74 74" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round"/>

      {/* ── Centre white dot (overlapping junction) ── */}
      <circle cx="50" cy="50" r="7" fill="white" opacity="0.97"/>
      <circle cx="50" cy="50" r="3.5" fill="#C62828" opacity="0.85"/>
    </svg>
  );
}

export default function SCCGCard({
  bankName = "SCCG GLOBAL",
  cardNumber,
  cardholder = "CARDHOLDER NAME",
  expiry,
  tier = "standard",
  balance,
  currency = "EUR",
  className,
  userId,
  registrationDate,
}: SCCGCardProps) {
  const style = tierStyles[tier];
  const currencySymbol = currency === "EUR" ? "€" : "৳";

  // For digital pass tier, derive unique number + expiry from userId / registrationDate
  const isDigitalPass = tier === "not-issued";
  const displayNumber = cardNumber
    ? cardNumber.replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim()
    : isDigitalPass && userId
    ? generateDigitalPassId(userId)
    : "•••• •••• •••• ••••";
  const displayExpiry = expiry || (isDigitalPass ? getPassExpiry(registrationDate) : "MM/YY");

  return (
    <div
      className={cn(
        "w-full max-w-md aspect-[1.586/1] rounded-[1.75rem] overflow-hidden transition-all duration-500",
        style.glow,
        className
      )}
    >
      <div
        className="relative w-full h-full p-6 flex flex-col justify-between text-white"
        style={{ background: style.gradient }}
      >
        {/* Background orbs */}
        <div className="absolute -top-20 -right-20 w-56 h-56 bg-white/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full blur-3xl pointer-events-none"
          style={{ background: isDigitalPass ? "rgba(59,130,246,0.12)" : "rgba(99,102,241,0.12)" }} />

        {/* ── TOP ROW ── */}
        <div className="relative z-10 flex justify-between items-start">
          {/* Logo + name */}
          <div className="flex items-center gap-2">
            <SCCGLogoMark size={28} />
            <div className="space-y-0.5">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/80">{bankName}</p>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-[8px] font-bold text-emerald-400 uppercase tracking-widest">Verified</p>
              </div>
            </div>
          </div>

          {/* Tier + balance */}
          <div className="text-right space-y-1">
            {balance !== undefined && (
              <div>
                <p className="text-[8px] font-black uppercase tracking-widest text-white/50">Balance</p>
                <p className="text-lg font-black text-emerald-400 drop-shadow-md leading-tight">
                  {currencySymbol}{balance.toLocaleString()}
                </p>
              </div>
            )}
            <p
              className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg inline-block"
              style={{ background: style.accentBg, color: "white" }}
            >
              {style.label}
            </p>
          </div>
        </div>

        {/* ── EMV CHIP ── */}
        <div className="relative z-10 mt-3">
          <div className="relative h-9 w-12">
            <div className={cn("absolute inset-0 rounded-md shadow-inner", style.chip)} />
            <div className="absolute inset-0 overflow-hidden rounded-md">
              <div className="absolute top-1/2 left-0 w-full h-px bg-black/15" />
              <div className="absolute top-0 left-1/3 w-px h-full bg-black/15" />
              <div className="absolute top-0 left-2/3 w-px h-full bg-black/15" />
            </div>
          </div>
        </div>

        {/* ── BOTTOM SECTION ── */}
        <div className="relative z-10 flex flex-col gap-3">
          {/* Card / Pass number */}
          <div>
            {isDigitalPass && (
              <p className="text-[7px] font-black uppercase tracking-[0.25em] text-white/40 mb-0.5">
                Digital ID
              </p>
            )}
            <p className="text-[1.15rem] font-mono tracking-[0.18em] leading-none drop-shadow-md">
              {displayNumber}
            </p>
          </div>

          <div className="flex justify-between items-end">
            {/* Cardholder */}
            <div className="space-y-0.5 min-w-0">
              <p className="text-[7px] font-black uppercase tracking-widest text-white/45">
                {isDigitalPass ? "Pass Holder" : "Card Holder"}
              </p>
              <p className="text-xs font-bold tracking-tight uppercase truncate max-w-[140px]">
                {cardholder}
              </p>
            </div>

            {/* Expiry + hologram */}
            <div className="flex items-end gap-3 flex-shrink-0">
              <div className="space-y-0.5 text-center">
                <p className="text-[7px] font-black uppercase tracking-widest text-white/45">
                  {isDigitalPass ? "Valid Until" : "Expires"}
                </p>
                <p className="text-xs font-bold font-mono">{displayExpiry}</p>
              </div>
              <HologramSticker />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
