"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, ArrowLeft, Save } from "lucide-react";
import type { SalesOffer, SalesOfferItem, Client, Product } from "@/types";
import { loadCreateOfferData } from "../../../actions";
import { updateSalesOfferAction } from "./actions";

interface EditOfferFormProps {
  offer: SalesOffer;
  initialItems: SalesOfferItem[];
}

export default function EditOfferForm({ offer, initialItems }: EditOfferFormProps) {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [clientId, setClientId] = useState(offer.clientId || "");
  const [items, setItems] = useState(
    initialItems.map(i => ({
      productId: i.productId,
      productName: i.productName,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
    }))
  );
  
  if (items.length === 0) {
    items.push({ productId: "", productName: "", quantity: 1, unitPrice: 0 });
  }

  const [discount, setDiscount] = useState(offer.discount || 0);
  const [discountType, setDiscountType] = useState<"fixed" | "percent">(offer.discountType || "fixed");
  const [validUntil, setValidUntil] = useState(offer.validUntil ? offer.validUntil.slice(0, 10) : "");
  const [notes, setNotes] = useState(offer.notes || "");
  const [saleType, setSaleType] = useState(offer.saleType || "direct");

  useEffect(() => {
    loadCreateOfferData().then((data) => {
      setClients(data.clients);
      setProducts(data.products);
      setLoading(false);
    });
  }, []);

  const selectedClient = clients.find((c) => c.id === clientId) || { name: offer.clientName, email: offer.clientEmail, company: "" };
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const discountAmount = discountType === "percent" ? subtotal * (discount / 100) : discount;
  const total = Math.max(0, subtotal - discountAmount);

  function addItem() {
    setItems([...items, { productId: "", productName: "", quantity: 1, unitPrice: 0 }]);
  }

  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx));
  }

  function selectProduct(idx: number, productId: string) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setItems(items.map((item, i) =>
      i === idx ? { ...item, productId: product.id, productName: product.name, unitPrice: product.price } : item
    ));
  }

  async function handleSubmit() {
    if (!clientId || items.length === 0 || items.some((i) => !i.productId)) return;
    setSaving(true);
    try {
      const result = await updateSalesOfferAction(offer.id, {
        clientId: clientId || offer.clientId,
        clientName: selectedClient.name || "",
        clientEmail: selectedClient.email || "",
        items,
        discount,
        discountType,
        validUntil: validUntil ? new Date(validUntil).toISOString() : offer.validUntil,
        notes: notes || undefined,
        saleType,
        referralId: offer.referralId,
        referralName: offer.referralName,
        referralPercent: offer.referralPercent,
      });
      if (result.success) {
        router.push(`/sales/offers/${offer.id}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error updating offer");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-black text-foreground">Edit Sales Offer: {offer.offerNumber}</h1>
          <p className="text-sm text-muted-foreground">Adjust the line items, discounts, or notes below.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Client</CardTitle></CardHeader>
            <CardContent>
              <Label>Select Client</Label>
              <Select value={clientId} onValueChange={(v) => setClientId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder={offer.clientName} /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name} — {c.company}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Line Items</CardTitle>
                <Button variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-1" /> Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="w-24">Qty</TableHead>
                    <TableHead className="w-36">Unit Price</TableHead>
                    <TableHead className="w-32">Total</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Select value={item.productId} onValueChange={(v) => selectProduct(idx, v ?? "")}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select product">
                              {item.productName || "Select product"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((p) => (
                               <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number" min={1} value={item.quantity}
                          onChange={(e) => setItems(items.map((it, i) => i === idx ? { ...it, quantity: parseInt(e.target.value) || 1 } : it))}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number" step="0.01" min={0} value={item.unitPrice}
                          onChange={(e) => setItems(items.map((it, i) => i === idx ? { ...it, unitPrice: parseFloat(e.target.value) || 0 } : it))}
                        />
                      </TableCell>
                      <TableCell className="font-semibold">
                        BDT {(item.quantity * item.unitPrice).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => removeItem(idx)} disabled={items.length === 1}>
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Terms & Notes</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Discount</Label>
                  <Input type="number" min={0} value={discount} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <Label>Discount Type</Label>
                  <Select value={discountType} onValueChange={(v) => setDiscountType(v as "fixed" | "percent")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed (BDT)</SelectItem>
                      <SelectItem value="percent">Percent (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Valid Until</Label>
                  <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary side */}
        <div className="space-y-4">
          <Card className="sticky top-24">
            <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Items</span>
                  <span>{items.filter(i => i.productId).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>BDT {subtotal.toLocaleString()}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-red-500">
                    <span>Discount</span>
                    <span>-BDT {discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total</span>
                  <span className="text-primary">BDT {total.toLocaleString()}</span>
                </div>
              </div>
              <Button className="w-full gap-2" onClick={handleSubmit} disabled={saving || !clientId || items.some(i => !i.productId)}>
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
