"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Calculator, X, GripVertical, RefreshCw } from "lucide-react";

const CURRENCIES = [
  { code: "BDT", label: "BDT – Bangladeshi Taka", symbol: "৳" },
  { code: "USD", label: "USD – US Dollar", symbol: "$" },
  { code: "GBP", label: "GBP – British Pound", symbol: "£" },
  { code: "INR", label: "INR – Indian Rupee", symbol: "₹" },
  { code: "AED", label: "AED – UAE Dirham", symbol: "د.إ" },
  { code: "SAR", label: "SAR – Saudi Riyal", symbol: "﷼" },
  { code: "MYR", label: "MYR – Malaysian Ringgit", symbol: "RM" },
  { code: "PKR", label: "PKR – Pakistani Rupee", symbol: "₨" },
  { code: "TRY", label: "TRY – Turkish Lira", symbol: "₺" },
  { code: "LKR", label: "LKR – Sri Lankan Rupee", symbol: "Rs" },
  { code: "NPR", label: "NPR – Nepalese Rupee", symbol: "₨" },
];

interface RateData {
  rate: number;
  symbol: string;
  fetchedAt: string;
}

export default function CurrencyCalculator() {
  const [isOpen, setIsOpen] = useState(false);
  const [eurValue, setEurValue] = useState("");
  const [targetCurrency, setTargetCurrency] = useState("BDT");
  const [rateData, setRateData] = useState<RateData | null>(null);
  const [loading, setLoading] = useState(false);

  // Dragging state
  const [position, setPosition] = useState({ x: -1, y: -1 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);
  const initialized = useRef(false);

  // Initialize position to top-right
  useEffect(() => {
    if (!initialized.current) {
      setPosition({ x: window.innerWidth - 72, y: 80 });
      initialized.current = true;
    }
  }, []);

  // Fetch rate
  const fetchRate = useCallback(async (currency: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/currency?target=${currency}`);
      if (res.ok) {
        const data = await res.json();
        setRateData({
          rate: data.rate,
          symbol: data.symbol || currency,
          fetchedAt: data.fetchedAt,
        });
      }
    } catch {
      // Keep existing rate on error
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on currency change or open
  useEffect(() => {
    if (isOpen) fetchRate(targetCurrency);
  }, [isOpen, targetCurrency, fetchRate]);

  // Drag handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Allow drag from the collapsed button OR the expanded drag handle
    const el = e.target as HTMLElement;
    if (!el.closest("[data-drag-handle]") && !el.closest("[data-drag-button]")) return;
    setIsDragging(true);
    hasMoved.current = false;
    const rect = dragRef.current!.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    el.setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      hasMoved.current = true;
      const x = Math.max(0, Math.min(window.innerWidth - 56, e.clientX - dragOffset.current.x));
      const y = Math.max(0, Math.min(window.innerHeight - 56, e.clientY - dragOffset.current.y));
      setPosition({ x, y });
    },
    [isDragging]
  );

  const handlePointerUp = useCallback(() => {
    const wasDrag = hasMoved.current;
    setIsDragging(false);
    // Only open if it was a tap/click (no movement) on the collapsed button
    if (!wasDrag && !isOpen) {
      setIsOpen(true);
    }
  }, [isOpen]);

  const convertedValue =
    eurValue && rateData
      ? (parseFloat(eurValue) * rateData.rate).toLocaleString("en", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "";

  const selectedCur = CURRENCIES.find((c) => c.code === targetCurrency);

  if (position.x < 0) return null; // Not initialized yet

  return (
    <div
      ref={dragRef}
      className="fixed z-[9999]"
      style={{ left: position.x, top: position.y }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Collapsed: floating button (draggable, tap to open) */}
      {!isOpen && (
        <div
          data-drag-button
          className="group flex items-center justify-center w-12 h-12 rounded-full bg-primary text-white shadow-xl shadow-primary/30 hover:scale-110 hover:shadow-2xl transition-all duration-200 cursor-grab active:cursor-grabbing select-none touch-none"
          title="Currency Calculator – drag to move, tap to open"
        >
          <Calculator className="w-5 h-5 group-hover:rotate-12 transition-transform" />
        </div>
      )}

      {/* Expanded: calculator panel */}
      {isOpen && (
        <div
          className="w-72 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-90 fade-in duration-200"
          style={{
            position: "absolute",
            ...(position.x + 288 > window.innerWidth
              ? { right: 0 }
              : { left: 0 }),
            top: 0,
          }}
        >
          {/* Header - draggable */}
          <div
            data-drag-handle
            className="flex items-center justify-between px-4 py-3 bg-primary text-white cursor-grab active:cursor-grabbing select-none"
          >
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 opacity-60" />
              <Calculator className="w-4 h-4" />
              <span className="text-sm font-semibold">EUR Converter</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-white/20 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-3">
            {/* EUR input */}
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Amount in EUR
              </label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-primary">
                  €
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={eurValue}
                  onChange={(e) => setEurValue(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl border bg-background text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                  autoFocus
                />
              </div>
            </div>

            {/* Target currency dropdown */}
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Convert to
              </label>
              <select
                value={targetCurrency}
                onChange={(e) => setTargetCurrency(e.target.value)}
                className="w-full mt-1 px-3 py-2.5 rounded-xl border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Result */}
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-1">
                  <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Fetching rate...</span>
                </div>
              ) : rateData ? (
                <>
                  <p className="text-2xl font-bold text-foreground">
                    {selectedCur?.symbol}
                    {convertedValue || "0.00"}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    1 EUR = {selectedCur?.symbol}
                    {rateData.rate.toLocaleString("en", { maximumFractionDigits: 2 })}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Enter an amount</p>
              )}
            </div>

            {/* Refresh */}
            <button
              onClick={() => fetchRate(targetCurrency)}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
              Refresh rate
              {rateData?.fetchedAt && (
                <span className="opacity-60">
                  · {new Date(rateData.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
