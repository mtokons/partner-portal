"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Building, Shield, CheckCircle2, Edit3, Lock, Camera,
  Fingerprint, CreditCard, MapPin,
  PackageCheck, AlertCircle,
} from "lucide-react";
import type { UserRole, SccgCard } from "@/types";
import SCCGCard from "@/components/ui/SCCGCard";
import { requestPhysicalCardAction } from "./actions";
import { cn } from "@/lib/utils";

interface ProfileClientProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    company: string;
    partnerId: string;
    registrationDate?: string;
  };
  card: SccgCard | null;
}

const roleColors: Record<string, { bg: string; text: string; gradient: string }> = {
  admin:    { bg: "bg-red-500/15", text: "text-red-400", gradient: "from-red-500 to-rose-600" },
  partner:  { bg: "bg-indigo-500/15", text: "text-indigo-400", gradient: "from-indigo-500 to-blue-600" },
  customer: { bg: "bg-emerald-500/15", text: "text-emerald-400", gradient: "from-emerald-500 to-teal-600" },
  expert:   { bg: "bg-violet-500/15", text: "text-violet-400", gradient: "from-violet-500 to-purple-600" },
};

export default function ProfileClient({ user, card }: ProfileClientProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [company, setCompany] = useState(user.company);
  const initials = user.name.slice(0, 2).toUpperCase();
  const rc = roleColors[user.role] || roleColors.partner;

  // Physical card request dialog
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [cardForm, setCardForm] = useState({
    fullName: user.name,
    addressLine1: "",
    addressLine2: "",
    city: "",
    postalCode: "",
    country: "Germany",
  });
  const [cardSubmitting, setCardSubmitting] = useState(false);
  const [cardSuccess, setCardSuccess] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  async function handleCardRequest(e: React.FormEvent) {
    e.preventDefault();
    setCardSubmitting(true);
    setCardError(null);
    try {
      await requestPhysicalCardAction(cardForm);
      setCardSuccess(true);
    } catch (err) {
      setCardError(err instanceof Error ? err.message : "Request failed. Please try again.");
    } finally {
      setCardSubmitting(false);
    }
  }

  return (
    <div className="space-y-7 page-enter">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="h-6 w-1 rounded-full bg-gradient-to-b from-indigo-500 to-violet-500" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Profile</p>
        </div>
        <h1 className="text-3xl font-black text-foreground tracking-tight">My Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account and view your activity</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile card */}
          <Card className="border-0 shadow-lg rounded-3xl overflow-hidden">
            <div className={`h-24 bg-gradient-to-r ${rc.gradient} relative`}>
              <div className="absolute inset-0 bg-black/10" />
              <div className="absolute -bottom-10 left-6">
                <div className="relative">
                  <Avatar className="h-20 w-20 ring-4 ring-white shadow-xl">
                    <AvatarFallback className="bg-white text-foreground text-xl font-black">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <button className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
            <CardContent className="pt-14 pb-6 px-6">
              <h2 className="text-lg font-black text-foreground">{user.name}</h2>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <div className="flex items-center gap-2 mt-3">
                <Badge className={`${rc.bg} ${rc.text} border-0 font-semibold capitalize`}>
                  {user.role}
                </Badge>
                <Badge variant="outline" className="text-xs">Active</Badge>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building className="h-3.5 w-3.5" />
                  <span>{user.company}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Shield className="h-3.5 w-3.5" />
                  <span>Access Level: {user.role === "admin" ? "Full" : "Standard"}</span>
                </div>
              </div>

              <div className="flex gap-2 mt-5">
                <Button size="sm" variant="outline" onClick={() => setEditing(!editing)} className="gap-1.5 flex-1">
                  <Edit3 className="h-3.5 w-3.5" />
                  {editing ? "Cancel" : "Edit Profile"}
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => router.push("/forgot-password")}>
                  <Lock className="h-3.5 w-3.5" />
                  Reset Password
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Edit form (sliding) */}
          {editing && (
            <Card className="border-0 shadow-lg rounded-3xl animate-in slide-in-from-top-2 duration-300">
              <CardHeader><CardTitle className="text-sm">Edit Profile</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Full Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <Label>Company</Label>
                  <Input value={company} onChange={(e) => setCompany(e.target.value)} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={user.email} disabled className="opacity-50" />
                </div>
                <Button className="w-full gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Digital Identity Section (New) */}
          <Card className="border-0 shadow-lg rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-card to-background border-primary/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-black flex items-center gap-2">
                 <Fingerprint className="h-4 w-4 text-primary" />
                 My Digital Identity
              </CardTitle>
              <Badge variant="secondary" className="bg-primary/5 text-primary border-0 font-bold uppercase tracking-tighter text-[10px]">Blockchain Verified</Badge>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row items-center gap-8 py-8">
              <div className="flex-1 w-full max-w-sm">
                 <SCCGCard 
                   cardNumber={card?.cardNumber}
                   cardholder={card?.clientName || user.name}
                   expiry={card?.expiresAt ? new Date(card.expiresAt).toLocaleDateString("en-GB", { month: "2-digit", year: "2-digit" }) : undefined}
                   tier={card?.tier || (user.role === "admin" ? "platinum" : "not-issued")}
                   balance={card?.balance}
                   currency={card?.currency}
                   userId={user.id}
                   registrationDate={user.registrationDate}
                 />
                 {card?.cardNumber && (
                   <div className="mt-3 flex items-center gap-2 bg-muted/40 rounded-xl px-4 py-2.5 border border-border/50">
                     <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Card №</span>
                     <span className="font-mono text-sm font-bold text-foreground tracking-wider flex-1">{card.cardNumber}</span>
                     <button
                       onClick={() => { navigator.clipboard.writeText(card.cardNumber); }}
                       className="text-[10px] font-bold text-primary hover:underline"
                     >
                       Copy
                     </button>
                   </div>
                 )}
              </div>
              <div className="flex-1 space-y-4">
                 <div className="p-4 rounded-2xl bg-muted/30 border border-dashed border-border/60">
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Status</p>
                    <div className="flex items-center gap-2">
                       <div className={cn("h-2 w-2 rounded-full", card ? "bg-emerald-500" : "bg-amber-500")} />
                       <p className="font-bold text-sm">{card ? "Card Active & Ready" : "Digital Pass Only (No Card Issued)"}</p>
                    </div>
                 </div>
                 <div className="p-4 rounded-2xl bg-muted/30 border border-dashed border-border/60">
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Privileges</p>
                    <ul className="text-xs font-medium space-y-1">
                       <li className="flex items-center gap-2">🚀 Instant Checkout Enabled</li>
                       <li className="flex items-center gap-2">🛡️ Secured by SCCG Multi-Auth</li>
                       {user.role === "admin" && <li className="flex items-center gap-2">👑 Management Override Access</li>}
                    </ul>
                 </div>
                 {!card && user.role !== "admin" && (
                   <Button
                     variant="outline"
                     className="w-full rounded-xl border-dashed py-6 text-primary hover:bg-primary/5 font-bold gap-2"
                     onClick={() => { setCardDialogOpen(true); setCardSuccess(false); setCardError(null); }}
                   >
                     <CreditCard className="h-4 w-4" />
                     Apply for Physical SCCG Card
                   </Button>
                 )}
              </div>
            </CardContent>
          </Card>







          {/* Physical Card Request Dialog */}
          <Dialog open={cardDialogOpen} onOpenChange={setCardDialogOpen}>
            <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden">
              <div className="bg-gradient-to-br from-indigo-600 to-violet-700 px-6 py-5 text-white">
                <DialogHeader>
                  <DialogTitle className="text-white text-lg font-black flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Apply for Physical SCCG Card
                  </DialogTitle>
                  <DialogDescription className="text-indigo-200 text-sm mt-1">
                    A premium physical card will be mailed to your address.
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-3 inline-flex items-center gap-2 bg-white/15 rounded-xl px-3 py-1.5">
                  <PackageCheck className="h-4 w-4 text-white" />
                  <span className="text-sm font-bold text-white">One-time fee: <span className="text-yellow-300">€5.00</span> incl. delivery</span>
                </div>
              </div>

              {cardSuccess ? (
                <div className="px-6 py-10 text-center space-y-4">
                  <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-black text-foreground">Request Submitted!</h3>
                  <p className="text-sm text-muted-foreground">Your physical SCCG card request has been received. Our team will process it within 3–5 business days.</p>
                  <Button className="rounded-xl" onClick={() => setCardDialogOpen(false)}>Close</Button>
                </div>
              ) : (
                <form onSubmit={handleCardRequest} className="px-6 py-5 space-y-4">
                  {cardError && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      {cardError}
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Full Name *</Label>
                    <Input
                      value={cardForm.fullName}
                      onChange={(e) => setCardForm((f) => ({ ...f, fullName: e.target.value }))}
                      required
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> Address Line 1 *
                    </Label>
                    <Input
                      placeholder="Street, house number"
                      value={cardForm.addressLine1}
                      onChange={(e) => setCardForm((f) => ({ ...f, addressLine1: e.target.value }))}
                      required
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Address Line 2</Label>
                    <Input
                      placeholder="Apartment, floor, etc. (optional)"
                      value={cardForm.addressLine2}
                      onChange={(e) => setCardForm((f) => ({ ...f, addressLine2: e.target.value }))}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">City *</Label>
                      <Input
                        placeholder="Berlin"
                        value={cardForm.city}
                        onChange={(e) => setCardForm((f) => ({ ...f, city: e.target.value }))}
                        required
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Postal Code *</Label>
                      <Input
                        placeholder="10115"
                        value={cardForm.postalCode}
                        onChange={(e) => setCardForm((f) => ({ ...f, postalCode: e.target.value }))}
                        required
                        className="rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Country *</Label>
                    <Input
                      value={cardForm.country}
                      onChange={(e) => setCardForm((f) => ({ ...f, country: e.target.value }))}
                      required
                      className="rounded-xl"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground bg-muted/50 rounded-xl px-3 py-2.5 leading-relaxed">
                    By submitting, you authorise SCCG to charge <strong>€5.00</strong> from your account for physical card production and standard delivery (3–5 business days).
                  </p>
                  <Button
                    type="submit"
                    disabled={cardSubmitting}
                    className="w-full rounded-xl py-5 font-bold text-base bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-lg shadow-indigo-500/25"
                  >
                    {cardSubmitting ? "Submitting..." : "Confirm & Submit Request — €5.00"}
                  </Button>
                </form>
              )}
            </DialogContent>
          </Dialog>

          {/* Role info card */}
          <Card className="border-0 shadow-lg rounded-3xl overflow-hidden">
            <div className={`p-6 bg-gradient-to-r ${rc.gradient} text-white`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-xs uppercase tracking-wider font-semibold">Your Role</p>
                  <p className="text-2xl font-black mt-1 capitalize">{user.role}</p>
                  <p className="text-white/60 text-sm mt-1">
                    {user.role === "admin"
                      ? "Full system access and management capabilities"
                      : user.role === "partner"
                      ? "Manage clients, orders, and track financials"
                      : user.role === "customer"
                      ? "Access your packages, sessions, and invoices"
                      : "Deliver sessions and track your payments"}
                  </p>
                </div>
                <div className="h-16 w-16 rounded-2xl bg-white/15 flex items-center justify-center">
                  <Shield className="h-8 w-8 text-white/90" />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
