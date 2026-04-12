"use client";
import { useEffect, useState } from "react";
import { CoinWallet } from "@/types";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { fetchWalletsForCurrentUser } from "./actions";
import SCCGCard from "@/components/ui/SCCGCard";

export default function WalletsClient() {
  const [wallets, setWallets] = useState<CoinWallet[]>([]);

  useEffect(() => {
    fetchWalletsForCurrentUser().then(setWallets);
  }, []);

  return (
    <div>
      <div className="mb-6">
        <SCCGCard cardNumber={wallets[0]?.id ? "3489 8753 0974 5389" : undefined} cardholder={wallets[0]?.userName || "CARDHOLDER NAME"} expiry={"00/00"} />
      </div>
      <h2 className="text-xl font-bold mb-4">My Coin Wallets</h2>
      <Separator className="mb-4" />
      <div className="grid gap-4">
        {wallets.map((wallet) => (
          <Card key={wallet.id} className="p-4">
            <div className="font-semibold">SCCG Coin Wallet</div>
            <div>Owner: {wallet.userName}</div>
            <div>Balance: {wallet.balance}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
