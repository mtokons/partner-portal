"use client";

import React, { useEffect, useState } from "react";

type Props = {
  /** Amount in BDT */
  bdt: number;
  /** Pre-computed EUR value (takes priority over rate) */
  eur?: number | null;
  /** Optional: stored conversion rate (used when eur is not available) */
  storedRate?: number | null;
  decimals?: number;
  className?: string;
};

/**
 * Client-side dual-currency display.
 * Fetches the live BDT→EUR rate from /api/currency if neither `eur` nor `storedRate` is available.
 * E.g.: "BDT 15,000.00 (≈ €125.40)"
 */
export default function CurrencyDisplay({ bdt, eur, storedRate, decimals = 2, className = "" }: Props) {
  const [liveRate, setLiveRate] = useState<number | null>(storedRate ?? null);

  useEffect(() => {
    if (eur != null || storedRate != null) return; // already have EUR info
    fetch("/api/currency")
      .then((r) => r.json())
      .then((d) => { if (d.rate) setLiveRate(Number(d.rate)); })
      .catch(() => {});
  }, [eur, storedRate]);

  const bd = new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(bdt);

  let eurStr: string | null = null;
  if (eur != null) {
    eurStr = (eur as number).toFixed(decimals);
  } else if (liveRate) {
    eurStr = (Math.round((bdt * liveRate + Number.EPSILON) * Math.pow(10, decimals)) / Math.pow(10, decimals)).toFixed(decimals);
  }

  return (
    <span className={className}>
      BDT {bd}{eurStr ? ` (≈ €${eurStr})` : ""}
    </span>
  );
}
