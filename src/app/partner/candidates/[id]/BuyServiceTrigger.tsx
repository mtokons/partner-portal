"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import BuyServiceDrawer from "./BuyServiceDrawer";
import type { Product, PartnerMargin } from "@/types";

interface BuyServiceTriggerProps {
  candidateId: string;
  candidateName: string;
  candidateSccgId: string;
  candidateMargin: PartnerMargin;
  products: Product[];
  secondaryCurrency?: string;
  exchangeRate?: number;
}

export default function BuyServiceTrigger({
  candidateId,
  candidateName,
  candidateSccgId,
  candidateMargin,
  products,
  secondaryCurrency,
  exchangeRate,
}: BuyServiceTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md shadow-primary/15 hover:shadow-primary/25"
      >
        <Plus className="w-3.5 h-3.5" /> Buy Additional Service
      </button>

      <BuyServiceDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        candidateId={candidateId}
        candidateName={candidateName}
        candidateSccgId={candidateSccgId}
        candidateMargin={candidateMargin}
        products={products}
        secondaryCurrency={secondaryCurrency}
        exchangeRate={exchangeRate}
      />
    </>
  );
}
