"use client";
import { useEffect, useState } from "react";
import { CoinWallet } from "@/types";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { fetchWalletsForCurrentUser } from "./actions";

export default function WalletsClient() {
  const [wallets, setWallets] = useState<CoinWallet[]>([]);

  useEffect(() => {
    fetchWalletsForCurrentUser().then(setWallets);
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">My Coin Wallets</h2>
      <Separator className="mb-4" />
      <div className="grid gap-4">
        {wallets.map((wallet) => (
          <Card key={wallet.id} className="p-4">
            <div className="font-semibold">SCCG Coin Wallet</div>
            <div>Balance: {wallet.balance}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
