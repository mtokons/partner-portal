"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Download } from "lucide-react";

interface LineItem {
  name: string;
  quantity: number;
  price: number;
}

export default function SalesOfferPage() {
  const [clientName, setClientName] = useState("");
  const [partnerCompany, setPartnerCompany] = useState("");
  const [validUntil, setValidUntil] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [items, setItems] = useState<LineItem[]>([{ name: "", quantity: 1, price: 0 }]);
  const [generating, setGenerating] = useState(false);

  function addItem() {
    setItems([...items, { name: "", quantity: 1, price: 0 }]);
  }

  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof LineItem, value: string | number) {
    setItems(items.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  }

  const total = items.reduce((s, i) => s + i.quantity * i.price, 0);
  const [rate, setRate] = useState<number | null>(null);
  useEffect(() => {
    // fetch BDT->EUR rate for display
    (async () => {
      try {
        const res = await fetch("/api/currency");
        if (!res.ok) return;
        const data = await res.json();
        const r = Number(data?.rate);
        if (r && !Number.isNaN(r)) setRate(r);
      } catch (err) {
        // ignore
      }
    })();
  }, []);

  async function handleGenerate() {
    if (!clientName || !partnerCompany) return;
    setGenerating(true);
    try {
      const { generateSalesOfferPdf } = await import("@/lib/pdf");
      const pdfBytes = generateSalesOfferPdf(partnerCompany, clientName, items, validUntil, rate ?? undefined);
      const blob = new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sales-offer-${clientName.replace(/\s+/g, "-").toLowerCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Sales Offer</h1>
      <p className="text-sm text-gray-500">Create a professional sales offer PDF to send to your clients.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Offer Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Your Company Name</Label>
                  <Input
                    placeholder="Weber Trading GmbH"
                    value={partnerCompany}
                    onChange={(e) => setPartnerCompany(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Client Name</Label>
                  <Input
                    placeholder="TechCorp Industries"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label>Valid Until</Label>
                <Input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>
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
                    <TableHead>Product / Service</TableHead>
                    <TableHead className="w-24">Qty</TableHead>
                    <TableHead className="w-32">Unit Price (BDT)</TableHead>
                    <TableHead className="w-28">Total</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Input
                          placeholder="Product name"
                          value={item.name}
                          onChange={(e) => updateItem(idx, "name", e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 1)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          value={item.price}
                          onChange={(e) => updateItem(idx, "price", parseFloat(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell className="font-semibold">
                        BDT {(item.quantity * item.price).toFixed(2)}{rate ? ` · €${((item.quantity * item.price) * rate).toFixed(2)}` : ""}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(idx)}
                          disabled={items.length === 1}
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Items</span><span>{items.length}</span></div>
                <div className="flex justify-between font-semibold text-lg border-t pt-2">
                  <span>Total</span>
                  <span className="text-blue-700">BDT {total.toFixed(2)}{rate ? ` · €${(total * rate).toFixed(2)}` : ""}</span>
                </div>
              </div>
              <Button
                onClick={handleGenerate}
                disabled={generating || !clientName || !partnerCompany || items.some((i) => !i.name)}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                {generating ? "Generating PDF..." : "Download PDF"}
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-xs text-gray-500 space-y-1">
              <p>The PDF will be generated in your browser.</p>
              <p>Valid until date: <strong>{new Date(validUntil).toLocaleDateString("en-GB")}</strong></p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
