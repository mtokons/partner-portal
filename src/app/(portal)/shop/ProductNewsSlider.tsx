"use client";

import { useState, useEffect, useCallback } from "react";
import type { Promotion } from "@/types";
import { ChevronLeft, ChevronRight, Megaphone, Tag, Gift, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ProductNewsSliderProps {
  promotions: Promotion[];
}

const typeIcon: Record<string, React.ElementType> = {
  discount: Tag,
  bundle: Gift,
  promo: Zap,
  announcement: Megaphone,
};

const typeGradient: Record<string, string> = {
  discount: "from-rose-500 to-pink-600",
  bundle: "from-violet-500 to-purple-600",
  promo: "from-amber-400 to-orange-500",
  announcement: "from-blue-500 to-indigo-600",
};

export default function ProductNewsSlider({ promotions }: ProductNewsSliderProps) {
  const [current, setCurrent] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % promotions.length);
  }, [promotions.length]);

  const prev = () => {
    setCurrent((c) => (c - 1 + promotions.length) % promotions.length);
  };

  useEffect(() => {
    if (!isAutoPlaying || promotions.length <= 1) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [isAutoPlaying, next, promotions.length]);

  if (!promotions.length) return null;

  const promo = promotions[current];
  const Icon = typeIcon[promo.type] || Megaphone;
  const gradient = typeGradient[promo.type] || "from-blue-500 to-indigo-600";

  return (
    <div
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-r ${gradient} text-white shadow-2xl`}
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10" />
        <div className="absolute -left-8 -bottom-8 h-40 w-40 rounded-full bg-white/5" />
      </div>

      <div className="relative z-10 flex items-center gap-6 px-8 py-6">
        {/* Icon */}
        <div className="hidden md:flex h-16 w-16 rounded-2xl bg-white/20 items-center justify-center shrink-0 backdrop-blur-sm border border-white/30">
          <Icon className="h-8 w-8 text-white" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-white/20 text-white border-white/30 text-[10px] px-2 py-0.5 uppercase tracking-widest">
              {promo.type}
            </Badge>
            {promo.discountValue > 0 && (
              <Badge className="bg-white border-white/30 text-gray-900 font-black text-[10px] px-2 py-0.5">
                {promo.discountType === "percent" ? `${promo.discountValue}% OFF` : `BDT ${promo.discountValue} OFF`}
              </Badge>
            )}
          </div>
          <h2 className="text-xl md:text-2xl font-black leading-tight">{promo.title}</h2>
          {promo.description && (
            <p className="text-sm text-white/75 mt-1 truncate">{promo.description}</p>
          )}
          {promo.endDate && (
            <p className="text-xs text-white/50 mt-2">
              Ends {new Date(promo.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}
            </p>
          )}
        </div>

        {/* Navigation */}
        {promotions.length > 1 && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={prev}
              className="h-8 w-8 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={next}
              className="h-8 w-8 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Dot indicators */}
      {promotions.length > 1 && (
        <div className="flex justify-center gap-1.5 pb-3">
          {promotions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === current ? "w-6 bg-white" : "w-1.5 bg-white/40"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
