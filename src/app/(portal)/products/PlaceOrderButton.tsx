"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { placeOrderAction } from "./actions";

interface PlaceOrderButtonProps {
  productId: string;
  productName: string;
  price: number;
  partnerId: string;
}

export default function PlaceOrderButton({ productId, productName, price, partnerId }: PlaceOrderButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [clientId, setClientId] = useState("");
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [eurRate, setEurRate] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/currency")
      .then((r) => r.json())
      .then((d) => { if (d.rate) setEurRate(d.rate); })
      .catch(() => {});
  }, []);

  async function loadClients() {
    const res = await fetch(`/api/clients?partnerId=${partnerId}`);
    const data = await res.json();
    setClients(data);
  }

  async function handleOrder() {
    if (!clientId) return;
    setLoading(true);
    await placeOrderAction({
      partnerId,
      clientId,
      productId,
      productName,
      quantity,
      unitPrice: price,
    });
    setLoading(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) loadClients(); }}>
      <DialogTrigger>
        <span className={cn(buttonVariants({ variant: "default", size: "default" }), "w-full inline-flex items-center justify-center") }>
          Place Order
        </span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Order: {productName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Client</Label>
            <Select value={clientId} onValueChange={(v) => setClientId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Quantity</Label>
            <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
          </div>
          <div className="text-lg font-semibold">
            Total: BDT {(price * quantity).toFixed(2)}
            {eurRate ? ` (≈ €${((price * quantity) * eurRate).toFixed(2)})` : ""}
          </div>
          <Button onClick={handleOrder} disabled={loading || !clientId} className="w-full">
            {loading ? "Placing..." : "Confirm Order"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
