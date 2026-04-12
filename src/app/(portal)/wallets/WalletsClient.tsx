"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchWalletsForCurrentUser } from "./actions";
import type { CoinWallet, SccgCard } from "@/types";
import { getGiftCards } from "@/lib/sharepoint"; // We use wait, wait... I need a client-side friendly way. I'll pass it from page or use an action.
import { fetchUserCardsAction } from "./actions"; // I'll create this action
import SCCGCard from "@/components/ui/SCCGCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Wallet, Coins, ArrowUpRight, TrendingUp, History, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function WalletsClient() {
  const [wallets, setWallets] = useState<CoinWallet[]>([]);
  const [cards, setCards] = useState<SccgCard[]>([]);
  const [loading, setLoading] = useState(true);

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
