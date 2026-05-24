"use client";

import { useState, useEffect } from "react";
import { Loader2, ShieldCheck, Lock, Smartphone, Landmark, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PaymentGatewayProps {
  amount: number;
  currency: string;
  onSuccess: (reference: string) => void;
  onClose: () => void;
}

export default function PaymentGateway({ amount, currency, onSuccess, onClose }: PaymentGatewayProps) {
  const [step, setStep] = useState<"method" | "input" | "processing" | "otp" | "success">("method");
  const [selectedMethod, setSelectedMethod] = useState<"bkash" | "nagad" | "citybank" | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [otp, setOtp] = useState("");

  const methods = [
    { id: "bkash", name: "bKash", color: "bg-[#D12053]", logo: "bK" },
    { id: "nagad", name: "Nagad", color: "bg-[#F7941D]", logo: "Ng" },
    { id: "citybank", name: "City Bank", color: "bg-[#005CAB]", logo: "CB" },
  ] as const;

  function handleNext() {
    if (step === "method" && selectedMethod) setStep("input");
    else if (step === "input") setStep("processing");
    else if (step === "otp") setStep("processing");
  }

  useEffect(() => {
    if (step === "processing") {
      const timer = setTimeout(() => {
        if (selectedMethod === "citybank") {
           // City bank usually doesn't have an extra OTP step in this sim
           onSuccess(`CITY-${Math.random().toString(36).substring(7).toUpperCase()}`);
        } else {
           setStep("otp");
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [step, selectedMethod, onSuccess]);

  function handleVerify() {
    setStep("processing");
    setTimeout(() => {
      onSuccess(`${selectedMethod?.toUpperCase()}-${Math.random().toString(36).substring(7).toUpperCase()}`);
    }, 2000);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="bg-slate-900 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-primary/80">Secure Checkout</p>
              <p className="text-sm font-bold">SCCG Payment Gateway</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Amount bar */}
        <div className="bg-primary p-4 text-white flex justify-between items-center">
          <p className="text-xs font-bold opacity-80">Payable Amount</p>
          <p className="text-xl font-black">{currency} {amount.toLocaleString()}</p>
        </div>

        <div className="p-8">
          {step === "method" && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-black text-slate-900">Select Payment Method</h3>
                <p className="text-xs text-muted-foreground mt-1">Choose your preferred Bangladesh payment channel</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {methods.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMethod(m.id)}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-2xl border-2 transition-all",
                      selectedMethod === m.id ? "border-primary bg-primary/5 scale-[1.02]" : "border-slate-100 hover:border-primary/20"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center text-white font-black", m.color)}>
                        {m.logo}
                      </div>
                      <span className="font-bold text-slate-800">{m.name}</span>
                    </div>
                    {selectedMethod === m.id && <div className="h-2 w-2 rounded-full bg-primary animate-ping" />}
                  </button>
                ))}
              </div>
              <Button 
                onClick={handleNext} 
                disabled={!selectedMethod}
                className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black text-sm shadow-xl shadow-slate-200"
              >
                Continue to Payment
              </Button>
            </div>
          )}

          {step === "input" && (
            <div className="space-y-6">
              <div className="text-center">
                <div className={cn(
                  "h-16 w-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white text-xl font-black",
                  methods.find(m => m.id === selectedMethod)?.color
                )}>
                  {methods.find(m => m.id === selectedMethod)?.logo}
                </div>
                <h3 className="text-lg font-black text-slate-900">Enter Details</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedMethod === "citybank" ? "Enter your City Bank Account/Card Number" : `Enter your ${selectedMethod} Mobile Number`}
                </p>
              </div>
              <div className="relative">
                {selectedMethod === "citybank" ? (
                  <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                ) : (
                  <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                )}
                <input
                  autoFocus
                  placeholder={selectedMethod === "citybank" ? "0000 0000 0000 0000" : "01XXXXXXXXX"}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="w-full pl-12 pr-4 h-14 bg-slate-50 border-0 rounded-2xl text-lg font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <Button 
                onClick={handleNext} 
                disabled={!inputValue}
                className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black text-sm"
              >
                Proceed
              </Button>
            </div>
          )}

          {step === "processing" && (
            <div className="py-12 flex flex-col items-center justify-center space-y-6">
              <div className="relative">
                <div className="h-20 w-20 rounded-full border-4 border-slate-100 border-t-primary animate-spin" />
                <Lock className="absolute inset-0 m-auto h-6 w-6 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-black text-slate-900">Processing Securely</p>
                <p className="text-xs text-muted-foreground mt-1">Please do not refresh or close this window</p>
              </div>
            </div>
          )}

          {step === "otp" && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-black text-slate-900">Verification Required</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  We've sent a 6-digit OTP to your {selectedMethod} number
                </p>
              </div>
              <input
                autoFocus
                maxLength={6}
                placeholder="------"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full text-center h-16 bg-slate-50 border-0 rounded-2xl text-3xl font-black tracking-[0.5em] focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <Button 
                onClick={handleVerify} 
                disabled={otp.length < 6}
                className={cn(
                  "w-full h-14 rounded-2xl font-black text-sm transition-all",
                  methods.find(m => m.id === selectedMethod)?.color,
                  "text-white shadow-xl shadow-rose-100"
                )}
              >
                Verify & Pay
              </Button>
              <p className="text-center text-[10px] text-muted-foreground">
                Didn't receive code? <button className="text-primary font-bold hover:underline">Resend OTP</button>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 flex items-center justify-center gap-4 border-t border-slate-100">
          <div className="flex items-center gap-1 opacity-40 grayscale">
             <div className="h-6 w-8 bg-slate-400 rounded-sm" />
             <div className="h-6 w-8 bg-slate-400 rounded-sm" />
             <div className="h-6 w-8 bg-slate-400 rounded-sm" />
          </div>
          <p className="text-[9px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-tighter">
            <Lock className="h-2.5 w-2.5" /> PCI DSS Compliant
          </p>
        </div>
      </div>
    </div>
  );
}
