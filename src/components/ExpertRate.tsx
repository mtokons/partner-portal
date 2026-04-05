"use client";

import { useEffect, useState } from "react";

export default function ExpertRate({ rateEur }: { rateEur: number }) {
  const [rate, setRate] = useState<number | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/currency");
        if (!res.ok) return;
        const data = await res.json();
        const r = Number(data?.rate);
        if (r && !Number.isNaN(r)) setRate(r);
      } catch (err) {
        // ignore
      }
    })();
  }, []);

  if (rate == null) return <span className="text-gray-500">BDT —/session (loading…)</span>;
  const bdt = Math.round((rateEur / rate + Number.EPSILON) * 100) / 100;
  return <span className="text-gray-500">BDT {bdt} (≈ €{rateEur})/session</span>;
}
