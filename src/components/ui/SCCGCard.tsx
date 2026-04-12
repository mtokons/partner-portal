"use client";
import React from "react";

interface SCCGCardProps {
  bankName?: string;
  cardNumber?: string;
  cardholder?: string;
  expiry?: string;
}

export default function SCCGCard({ bankName = "BANK NAME", cardNumber = "3489 8753 0974 5389", cardholder = "CARDHOLDER NAME", expiry = "00/00" }: SCCGCardProps) {
  return (
    <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl" style={{ transform: "scale(1)", backfaceVisibility: "hidden" }}>
      <div className="relative bg-[#0b0b0b] text-white p-6" style={{
        backgroundImage: `linear-gradient(135deg, rgba(6,10,22,0.9) 0%, rgba(18,24,48,0.95) 40%), radial-gradient( circle at 10% 10%, rgba(59,130,246,0.08), transparent 20%), url('/card-texture.png')`,
        backgroundSize: 'cover',
      }}>
        <div className="absolute right-4 top-3 text-xs opacity-80">{bankName}</div>

        {/* chip */}
        <div className="w-12 h-10 rounded-md bg-yellow-300/90 shadow-md"></div>

        {/* card number */}
        <div className="mt-6 text-2xl font-mono tracking-widest">{cardNumber}</div>

        <div className="flex items-center justify-between mt-4">
          <div>
            <div className="text-xs opacity-80">MONTH/YEAR</div>
            <div className="font-semibold">EXP {expiry}</div>
          </div>

          <div className="flex flex-col items-end">
            <div className="text-xs opacity-80"> </div>
            <div className="text-sm font-medium"> </div>
          </div>
        </div>

        <div className="absolute left-6 bottom-6 text-xs opacity-90">{cardholder}</div>

        {/* Mastercard mark (simple SVG) */}
        <div className="absolute right-4 bottom-4">
          <svg width="56" height="36" viewBox="0 0 56 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="18" r="12" fill="#EB001B" />
            <circle cx="36" cy="18" r="12" fill="#F79E1B" />
            <path d="M28 18a12 12 0 0 0-12-12 12 12 0 0 1 0 24 12 12 0 0 0 12-12z" fill="#FF5F00" opacity="0.95"/>
          </svg>
        </div>
      </div>
    </div>
  );
}
