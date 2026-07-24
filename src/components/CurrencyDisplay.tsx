"use client";

import React, { useEffect, useState } from "react";

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€", BDT: "৳", INR: "₹", USD: "$", GBP: "£",
  AED: "د.إ", SAR: "﷼", MYR: "RM", PKR: "₨", LKR: "Rs",
  NPR: "₨", TRY: "₺",
};

type Props = {
  /** Amount in EUR (primary/home currency) */
  amount: number;
  /** Secondary currency code (e.g. "BDT"). If "EUR" or empty, only EUR shown */
  secondaryCurrency?: string;
  /** Pre-fetched EUR→secondary rate (avoids client fetch) */
  rate?: number | null;
  /** Number of decimal places */
  decimals?: number;
  /** Show compact format: €100 (৳11,900) vs €100 · ৳11,900 */
  compact?: boolean;
  /** Additional CSS class */
  className?: string;
  /** Only show EUR (ignore secondary) */
  eurOnly?: boolean;
  /** Legacy: amount in BDT (backward compat) */
  bdt?: number;
  /** Legacy: pre-computed EUR value */
  eur?: number | null;
  /** Legacy: stored BDT→EUR rate */
  storedRate?: number | null;
};

/**
 * Dual-currency display component.
 * Primary: EUR. Secondary only shown when explicitly requested.
 * Fetches live rate from /api/currency?target=X if not provided.
 */
export default function CurrencyDisplay({
  amount, secondaryCurrency, rate, decimals = 0, compact = false,
  className = "", eurOnly = true,
  // Legacy props
  bdt, eur, storedRate,
}: Props) {
  const [liveRate, setLiveRate] = useState<number | null>(rate ?? null);

  // Resolve legacy usage: if `bdt` is provided but not `amount`
  const eurAmount = amount ?? (eur != null ? eur : bdt && storedRate ? bdt * storedRate : 0);
  const secCurrency = secondaryCurrency || (bdt != null ? "BDT" : "EUR");

  useEffect(() => {
    if (eurOnly || secCurrency === "EUR" || rate != null) return;
    fetch(`/api/currency?target=${secCurrency}`)
      .then((r) => r.json())
      .then((d) => { if (d.rate) setLiveRate(Number(d.rate)); })
      .catch(() => {});
  }, [eurOnly, secCurrency, rate]);

  const eurFmt = eurAmount.toLocaleString("en", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  if (eurOnly || secCurrency === "EUR") {
    return <span className={className}>€{eurFmt}</span>;
  }

  const effectiveRate = liveRate ?? rate ?? null;
  if (!effectiveRate || effectiveRate <= 0) {
    return <span className={className}>€{eurFmt}</span>;
  }

  const secAmount = Math.round((eurAmount * effectiveRate + Number.EPSILON) * 100) / 100;
  const sym = CURRENCY_SYMBOLS[secCurrency] || secCurrency + " ";
  const secFmt = secAmount.toLocaleString("en", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span className={className}>
      €{eurFmt}
      <span className="text-muted-foreground opacity-70 ml-1 text-[0.85em]">
        {compact ? `(${sym}${secFmt})` : `· ${sym}${secFmt}`}
      </span>
    </span>
  );
}
