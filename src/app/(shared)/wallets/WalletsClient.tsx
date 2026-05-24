"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchWalletsForCurrentUser, fetchUserCardsAction, redeemGiftCardToCoinsAction } from "./actions";
import type { CoinWallet, SccgCard } from "@/types";
import SCCGCard from "@/components/ui/SCCGCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Wallet, Coins, ArrowUpRight, TrendingUp, History, CreditCard, Gift, KeyRound, Loader2, Sparkles, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function WalletsClient() {
  const [wallets, setWallets] = useState<CoinWallet[]>([]);
  const [cards, setCards] = useState<SccgCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemPin, setRedeemPin] = useState("");
  const [redeemSuccess, setRedeemSuccess] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [w, c] = await Promise.all([
        fetchWalletsForCurrentUser(),
        fetchUserCardsAction()
      ]);
      setWallets(w);
      setCards(c as SccgCard[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!redeemCode || !redeemPin) return;
    setRedeeming(true);
    setRedeemSuccess(null);
    try {
      const res = await redeemGiftCardToCoinsAction(redeemCode, redeemPin);
      if (res.success) {
        setRedeemSuccess(res.amount);
        setRedeemCode("");
        setRedeemPin("");
        loadData(); // Refresh balances
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Redemption failed");
    } finally {
      setRedeeming(false);
    }
  };

  const activeCard = cards[0];
  const wallet = wallets[0];

  if (loading) {
    return <div className="py-24 text-center text-muted-foreground animate-pulse font-medium">Synchronizing Cloud Wallets...</div>;
  }

  return (
    <div className="space-y-8 page-enter">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="h-6 w-1 rounded-full bg-gradient-to-b from-primary to-violet-500" />
          <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Asset Management</p>
        </div>
        <h1 className="text-3xl font-black text-foreground tracking-tight">SCCG Wallet & Identity</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Virtual Card & Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-0 shadow-2xl rounded-[2.5rem] bg-gradient-to-br from-card to-background p-2 overflow-hidden">
             <div className="p-8 pb-4">
                <div className="flex items-center justify-between mb-8">
                   <h2 className="text-xl font-black flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-primary" />
                      Digital SCCG Card
                   </h2>
                   <Badge variant="outline" className="rounded-full border-primary/20 text-primary uppercase text-[10px] font-black">
                      {activeCard ? activeCard.tier : "Virtual ID"}
                   </Badge>
                </div>

                <div className="flex justify-center">
                   <SCCGCard 
                     cardNumber={activeCard?.cardNumber}
                     cardholder={activeCard?.clientName || wallet?.userName || "USER"}
                     expiry={activeCard?.expiresAt ? new Date(activeCard.expiresAt).toLocaleDateString("en-GB", { month: "2-digit", year: "2-digit" }) : "IND-LIFE"}
                     tier={activeCard?.tier || "not-issued"}
                     balance={activeCard?.balance}
                     currency={activeCard?.currency}
                   />
                </div>
             </div>
             
             <div className="bg-muted/30 p-8 grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                <button className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-background hover:bg-primary/5 transition-colors border group shadow-sm">
                   <ArrowUpRight className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                   <span className="text-[10px] font-black uppercase tracking-widest">Transfer</span>
                </button>
                <button className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-background hover:bg-primary/5 transition-colors border group shadow-sm">
                   <TrendingUp className="h-5 w-5 text-emerald-500 group-hover:scale-110 transition-transform" />
                   <span className="text-[10px] font-black uppercase tracking-widest">Top Up</span>
                </button>
                <button className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-background hover:bg-primary/5 transition-colors border group shadow-sm">
                   <History className="h-5 w-5 text-violet-500 group-hover:scale-110 transition-transform" />
                   <span className="text-[10px] font-black uppercase tracking-widest">Log</span>
                </button>
                <button className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-background hover:bg-primary/5 transition-colors border group shadow-sm">
                   <Wallet className="h-5 w-5 text-amber-500 group-hover:scale-110 transition-transform" />
                   <span className="text-[10px] font-black uppercase tracking-widest">Settings</span>
                </button>
             </div>
          </Card>

          {/* Redeem Center (New) */}
          <Card className="border-0 shadow-xl rounded-[2.5rem] overflow-hidden bg-card border-primary/5">
             <CardHeader className="pb-2">
                <CardTitle className="text-lg font-black flex items-center gap-2">
                   <Gift className="h-5 w-5 text-primary" />
                   Redeem Center
                </CardTitle>
             </CardHeader>
             <CardContent className="space-y-6 py-6">
                <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4">
                   <p className="text-xs font-bold text-primary mb-1 flex items-center gap-2">
                      <Sparkles className="h-3 w-3" />
                      Instant Coin Conversion
                   </p>
                   <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Enter your SCCG Gift Card details below to instantly top up your wallet. 
                      Credits are converted at 1:1 ratio (৳1 = 1 SCCG Coin).
                   </p>
                </div>

                {redeemSuccess ? (
                   <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-8 text-center animate-in zoom-in duration-300">
                      <div className="h-16 w-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
                         <CheckCircle className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-xl font-black text-emerald-600 mb-1">Success!</h3>
                      <p className="text-sm font-medium text-muted-foreground mb-4">You&apos;ve correctly redeemed {redeemSuccess} SCCG Coins.</p>
                      <Button 
                        variant="outline" 
                        onClick={() => setRedeemSuccess(null)}
                        className="rounded-xl font-bold"
                      >
                         Redeem Another
                      </Button>
                   </div>
                ) : (
                   <form onSubmit={handleRedeem} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Card Number</label>
                         <div className="relative">
                            <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                               value={redeemCode}
                               onChange={(e) => setRedeemCode(e.target.value)}
                               placeholder="SCCG-GC-XXXX-XXXX" 
                               className="pl-12 py-6 rounded-2xl bg-muted/30 border-0 focus-visible:ring-primary/20 text-sm font-bold"
                               required
                            />
                         </div>
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Security PIN</label>
                         <div className="relative">
                            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                               type="password"
                               value={redeemPin}
                               onChange={(e) => setRedeemPin(e.target.value)}
                               placeholder="••••" 
                               className="pl-12 py-6 rounded-2xl bg-muted/30 border-0 focus-visible:ring-primary/20 text-sm font-bold"
                               maxLength={6}
                               required
                            />
                         </div>
                      </div>
                      <div className="md:col-span-2 pt-2">
                         <Button 
                            disabled={redeeming || !redeemCode || !redeemPin}
                            className="w-full py-8 rounded-2xl bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 transition-all active:scale-95 text-base font-black uppercase tracking-widest gap-3"
                         >
                            {redeeming ? (
                               <>
                                  <Loader2 className="h-5 w-5 animate-spin" />
                                  Verifying Card...
                               </>
                            ) : (
                               <>
                                  <Sparkles className="h-5 w-5" />
                                  Claim SCCG Coins
                               </>
                            )}
                         </Button>
                      </div>
                   </form>
                )}
             </CardContent>
          </Card>
        </div>

        {/* Right: Coin Balance */}
        <div className="space-y-6">
           <Card className="border-0 shadow-xl rounded-[2.5rem] overflow-hidden">
              <CardHeader className="bg-primary text-white pb-12">
                 <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-black flex items-center gap-2">
                       <Coins className="h-5 w-5" />
                       SCCG Coins
                    </CardTitle>
                    <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                       <TrendingUp className="h-4 w-4" />
                    </div>
                 </div>
              </CardHeader>
              <CardContent className="-mt-8 space-y-6">
                 <div className="bg-background rounded-3xl p-8 shadow-xl text-center border">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Available Balance</p>
                    <p className="text-5xl font-black tracking-tighter text-primary">
                       {wallet?.balance || 0}
                       <span className="text-xs font-medium text-muted-foreground ml-2">SCC</span>
                    </p>
                 </div>

                 <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-muted/40 rounded-2xl">
                       <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                             <ArrowUpRight className="h-4 w-4" />
                          </div>
                          <div>
                             <p className="text-xs font-bold">Total Earned</p>
                             <p className="text-[10px] text-muted-foreground">Lifetime History</p>
                          </div>
                       </div>
                       <p className="font-black text-emerald-600">+{wallet?.totalEarned || 0}</p>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-muted/40 rounded-2xl">
                       <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                             <ArrowDownRight className="h-4 w-4" rotate={90} /> 
                          </div>
                          <div>
                             <p className="text-xs font-bold">Total Spent</p>
                             <p className="text-[10px] text-muted-foreground">Store Purchases</p>
                          </div>
                       </div>
                       <p className="font-black text-amber-600">-{wallet?.totalSpent || 0}</p>
                    </div>
                 </div>
              </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}

function ArrowDownRight({ className, rotate = 0 }: { className?: string, rotate?: number }) {
  return (
    <ArrowUpRight className={className} style={{ transform: `rotate(${90 + rotate}deg)` }} />
  );
}
