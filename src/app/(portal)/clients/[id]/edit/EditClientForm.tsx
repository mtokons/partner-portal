"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateClientAction } from "../../actions";
import { Client } from "@/types";
import { User, Mail, Phone, Building2, MapPin, ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function EditClientForm({ client }: { client: Client }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: client.name || "",
    email: client.email || "",
    phone: client.phone || "",
    company: client.company || "",
    address: client.address || "",
  });

  async function handleSubmit() {
    setLoading(true);
    const res = await updateClientAction(client.id, form);
    setLoading(false);
    
    if (res.ok) {
      toast.success("Client updated successfully");
      router.push("/clients");
      router.refresh();
    } else {
      toast.error(res.error || "Failed to update client");
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link 
          href="/clients" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Clients
        </Link>
      </div>

      <Card className="border-0 shadow-xl rounded-3xl overflow-hidden">
        <CardHeader className="bg-muted/30 pb-8 pt-8 px-8">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <User className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-2xl font-black tracking-tight">Edit Client</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Update information for {client.name}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <User className="h-3 w-3" /> Full Name
              </Label>
              <Input 
                placeholder="John Doe"
                className="rounded-xl border-muted-foreground/20 focus:ring-primary/20"
                value={form.name} 
                onChange={(e) => setForm({ ...form, name: e.target.value })} 
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Building2 className="h-3 w-3" /> Company
              </Label>
              <Input 
                placeholder="Acme Corp"
                className="rounded-xl border-muted-foreground/20"
                value={form.company} 
                onChange={(e) => setForm({ ...form, company: e.target.value })} 
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Mail className="h-3 w-3" /> Email Address
                </Label>
                <Input 
                  type="email" 
                  placeholder="john@example.com"
                  className="rounded-xl border-muted-foreground/20"
                  value={form.email} 
                  onChange={(e) => setForm({ ...form, email: e.target.value })} 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Phone className="h-3 w-3" /> Phone Number
                </Label>
                <Input 
                  placeholder="+49 123 456789"
                  className="rounded-xl border-muted-foreground/20"
                  value={form.phone} 
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <MapPin className="h-3 w-3" /> Address
              </Label>
              <Input 
                placeholder="Street, City, Postcode"
                className="rounded-xl border-muted-foreground/20"
                value={form.address} 
                onChange={(e) => setForm({ ...form, address: e.target.value })} 
              />
            </div>

            <div className="pt-4">
              <Button 
                onClick={handleSubmit} 
                disabled={loading || !form.name} 
                className="w-full h-12 rounded-2xl font-bold text-base shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </span>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
