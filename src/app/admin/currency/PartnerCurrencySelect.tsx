"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updatePartnerCurrencyAction } from "./actions";

interface Props {
  partnerId: string;
  partnerName: string;
  currentCurrency: string;
  currencies: { code: string; name: string; symbol: string }[];
}

export default function PartnerCurrencySelect({ partnerId, partnerName, currentCurrency, currencies }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    if (val === currentCurrency) return;
    setSaving(true);
    await updatePartnerCurrencyAction(partnerId, val);
    setSaving(false);
    router.refresh();
  }

  return (
    <select
      value={currentCurrency}
      onChange={handleChange}
      disabled={saving}
      className="rounded-lg border bg-background px-2 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 min-w-[100px]"
      title={`Currency for ${partnerName}`}
    >
      {currencies.map((c) => (
        <option key={c.code} value={c.code}>
          {c.symbol} {c.code}
        </option>
      ))}
    </select>
  );
}
