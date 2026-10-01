"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Save,
  Loader2,
  UserCheck,
  Package,
  FileText,
  User,
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import type { SalesOrder, SalesOrderItem, Expert } from "@/types";
import { updateSalesOrderFullAction } from "../../../actions";
import { toast } from "sonner";

interface EditOrderFormProps {
  order: SalesOrder;
  items: SalesOrderItem[];
  experts: Expert[];
}

const statusOptions = [
  { value: "pending", label: "Pending", variant: "secondary" as const, desc: "Order awaiting processing or payment" },
  { value: "in-progress", label: "In Progress", variant: "outline" as const, desc: "Order is actively being fulfilled" },
  { value: "completed", label: "Completed", variant: "default" as const, desc: "All services or products delivered" },
  { value: "cancelled", label: "Cancelled", variant: "destructive" as const, desc: "Order voided or refunded" },
];

export default function EditOrderForm({ order, items, experts }: EditOrderFormProps) {
  const router = useRouter();

  // Extract initial assigned expert if present in notes
  const notesLines = (order.notes || "").split("\n");
  const assignedLine = notesLines.find((l) => l.trim().startsWith("Assigned Expert:"));
  const existingExpert = assignedLine ? assignedLine.replace("Assigned Expert:", "").trim() : "";

  const [status, setStatus] = useState<"pending" | "in-progress" | "completed" | "cancelled">(
    (order.status as any) || "pending"
  );
  const [clientName, setClientName] = useState(order.clientName || "");
  const [clientEmail, setClientEmail] = useState(order.clientEmail || "");
  const [notes, setNotes] = useState(order.notes || "");
  const [selectedExpert, setSelectedExpert] = useState(existingExpert || "");
  const [customExpertName, setCustomExpertName] = useState("");
  const [saving, setSaving] = useState(false);

  const isCustomExpert = selectedExpert === "custom";

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const finalExpert = isCustomExpert ? customExpertName.trim() : selectedExpert.trim();

      const res = await updateSalesOrderFullAction({
        orderId: order.id,
        status,
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim(),
        notes,
        assignedExpert: finalExpert || undefined,
      });

      if (!res.success) {
        toast.error(res.message || "Failed to update order");
        alert(res.message || "Failed to update order");
        return;
      }

      toast.success("Order updated successfully!");
      router.push(`/sales/orders/${order.id}`);
      router.refresh();
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error(err?.message || "Failed to update order");
      alert(err?.message || "Failed to update order");
    } finally {
      setSaving(false);
    }
  }

  const currentStatusCfg = statusOptions.find((s) => s.value === status) || statusOptions[0];

  return (
    <form onSubmit={handleSave} className="space-y-6 page-enter max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div className="flex items-center gap-3">
          <Link href={`/sales/orders/${order.id}`}>
            <Button type="button" variant="ghost" size="sm" className="rounded-xl">
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Order
            </Button>
          </Link>
          <div className="h-4 w-px bg-border/80 hidden sm:block" />
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                Edit Order {order.orderNumber}
              </h1>
              <Badge variant={currentStatusCfg.variant}>{currentStatusCfg.label}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Modify order fulfillment status, client details, assigned expert, and administrative notes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Link href={`/sales/orders/${order.id}`}>
            <Button type="button" variant="outline" size="sm" className="rounded-xl">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            size="sm"
            disabled={saving}
            className="rounded-xl gap-2 font-semibold shadow-sm"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving Changes..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Forms) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Status Card */}
          <Card className="rounded-2xl border-border/70 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/20 border-b border-border/40 pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Fulfillment Status
              </CardTitle>
              <CardDescription className="text-xs">
                Update the current operational status for this order. Setting to &quot;Completed&quot; will timestamp the delivery.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {statusOptions.map((opt) => {
                  const isSelected = status === opt.value;
                  return (
                    <div
                      key={opt.value}
                      onClick={() => setStatus(opt.value as any)}
                      className={`cursor-pointer rounded-xl p-3 border text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                          : "border-border/60 hover:border-border hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant={opt.variant} className="text-xs font-semibold">
                          {opt.label}
                        </Badge>
                        {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">{opt.desc}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Assigned Service Expert Card */}
          <Card className="rounded-2xl border-border/70 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/20 border-b border-border/40 pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-primary" />
                Assigned Service Expert
              </CardTitle>
              <CardDescription className="text-xs">
                Assign a dedicated career consultant or service specialist to manage fulfillment for this client.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="expertSelect" className="text-xs font-semibold text-muted-foreground">
                  Select Consultant / Expert
                </Label>
                <select
                  id="expertSelect"
                  value={selectedExpert}
                  onChange={(e) => setSelectedExpert(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">-- No Expert Assigned --</option>
                  {experts.map((exp) => (
                    <option key={exp.id} value={exp.name}>
                      {exp.name} {exp.specialization ? `(${exp.specialization})` : ""} {exp.email ? `— ${exp.email}` : ""}
                    </option>
                  ))}
                  {existingExpert && !experts.some((e) => e.name === existingExpert) && (
                    <option value={existingExpert}>{existingExpert} (Current Assignment)</option>
                  )}
                  <option value="custom">+ Other / Custom Expert Name...</option>
                </select>
              </div>

              {isCustomExpert && (
                <div className="space-y-1.5 pt-1">
                  <Label htmlFor="customExpert" className="text-xs font-semibold text-muted-foreground">
                    Custom Expert Full Name
                  </Label>
                  <Input
                    id="customExpert"
                    type="text"
                    placeholder="e.g. Dr. Klaus Weber (Senior Advisor)"
                    value={customExpertName}
                    onChange={(e) => setCustomExpertName(e.target.value)}
                    className="rounded-xl h-10"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Client Details Card */}
          <Card className="rounded-2xl border-border/70 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/20 border-b border-border/40 pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Client Information
              </CardTitle>
              <CardDescription className="text-xs">
                Contact information for the recipient of this order.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="clientName" className="text-xs font-semibold text-muted-foreground">
                    Client Name
                  </Label>
                  <Input
                    id="clientName"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Full client name"
                    className="rounded-xl h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="clientEmail" className="text-xs font-semibold text-muted-foreground">
                    Client Email
                  </Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="client@example.com"
                    className="rounded-xl h-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes Card */}
          <Card className="rounded-2xl border-border/70 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/20 border-b border-border/40 pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Order Notes &amp; Fulfillment Records
              </CardTitle>
              <CardDescription className="text-xs">
                Payment verification details, transaction reference numbers, and custom instructions.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-2">
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={6}
                placeholder="Add internal notes, fulfillment updates, or payment records..."
                className="rounded-xl text-sm font-mono leading-relaxed"
              />
              <p className="text-[11px] text-muted-foreground">
                Tip: Maintain lines such as &quot;Payment verification: verified&quot; or payment references so automated status badges remain synchronized.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (Summary & Items) */}
        <div className="space-y-6">
          {/* Order Summary Card */}
          <Card className="rounded-2xl border-border/70 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/20 border-b border-border/40 pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-primary" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3.5 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Order ID</span>
                <span className="font-mono font-bold text-foreground">#{order.id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Order Number</span>
                <span className="font-mono font-bold text-foreground">{order.orderNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Source</span>
                <span className="text-xs font-semibold">
                  {order.salesOfferId !== "DIRECT_BUY" ? `Offer ${order.offerNumber || ""}` : "Marketplace"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Date Placed</span>
                <span>{new Date(order.createdAt).toLocaleDateString()}</span>
              </div>
              {order.completedAt && (
                <div className="flex justify-between items-center text-emerald-600">
                  <span>Completed At</span>
                  <span>{new Date(order.completedAt).toLocaleDateString()}</span>
                </div>
              )}
              <div className="pt-3 border-t border-border flex justify-between items-center">
                <span className="font-medium text-foreground">Total Value</span>
                <span className="text-xl font-black text-primary">€{order.totalAmount.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Items Preview Card */}
          <Card className="rounded-2xl border-border/70 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/20 border-b border-border/40 pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                Ordered Items ({items.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground p-4">No items linked to this order.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs py-2 pl-4">Item</TableHead>
                      <TableHead className="text-xs py-2 text-center">Qty</TableHead>
                      <TableHead className="text-xs py-2 text-right pr-4">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id} className="text-xs">
                        <TableCell className="pl-4 font-medium py-2.5 max-w-[140px] truncate" title={item.productName}>
                          {item.productName}
                        </TableCell>
                        <TableCell className="text-center py-2.5">{item.quantity}</TableCell>
                        <TableCell className="text-right pr-4 font-semibold py-2.5">
                          €{item.totalPrice.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Save Action Sticky Card */}
          <Card className="rounded-2xl border-primary/20 bg-primary/5 p-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Ready to submit updates? All modifications will immediately reflect across admin consoles and partner views.
            </p>
            <Button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl gap-2 font-semibold shadow"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving Changes..." : "Save Order Changes"}
            </Button>
          </Card>
        </div>
      </div>
    </form>
  );
}
