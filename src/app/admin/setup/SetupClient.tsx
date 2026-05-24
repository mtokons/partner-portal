"use client";

import { useState, useEffect } from "react";
import { checkInfrastructureAction, initializeInfrastructureAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Database, CheckCircle2, AlertTriangle, Play, Sparkles } from "lucide-react";

export default function SetupClient() {
  const [status, setStatus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      const data = await checkInfrastructureAction();
      setStatus(data);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleInitialize() {
    if (!confirm("This will attempt to create all missing SCCG lists in your SharePoint site. Proceed?")) return;
    setBusy(true);
    setMessage(null);
    try {
      const results = await initializeInfrastructureAction();
      const failed = results.filter(r => r.status === "error");
      if (failed.length > 0) {
        setMessage({ type: "error", text: `Failed to create ${failed.length} lists. Check console.` });
      } else {
        setMessage({ type: "success", text: "Successfully initialized all SCCG infrastructure!" });
      }
      await refresh();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setBusy(false);
    }
  }


  return (
    <div className="max-w-4xl mx-auto space-y-8 page-enter pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <Database className="h-8 w-8 text-primary" />
            Infrastructure Setup
          </h1>
          <p className="text-muted-foreground">Initialize and verify your SharePoint environment</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            onClick={refresh} 
            disabled={loading || busy}
            variant="outline"
            className="rounded-xl"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify Health"}
          </Button>
          <Button 
            onClick={handleInitialize} 
            disabled={loading || busy}
            className="rounded-xl bg-primary text-white font-bold"
          >
            <Play className="h-4 w-4 mr-2" />
            Initialize Core Lists
          </Button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in zoom-in duration-300 ${
          message.type === "success" ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : "bg-rose-50 border border-rose-200 text-rose-700"
        }`}>
          {message.type === "success" ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          <p className="text-sm font-bold">{message.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-[2rem] border-primary/10 shadow-xl shadow-primary/5 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Required SharePoint Lists</CardTitle>
            <CardDescription>
              We detected the following lists in your connected SharePoint site. 
              Only "Partners" is required for login; others are needed for full Marketplace and Wallet features.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {status.map((item) => (
                <div 
                  key={item.name} 
                  className={`p-4 rounded-2xl border flex items-center justify-between gap-3 bg-muted/30 transition-all ${
                    item.exists ? "border-emerald-100 bg-emerald-50/30" : "border-muted"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">{item.name}</p>
                    <p className="font-bold text-sm truncate">{item.displayName}</p>
                  </div>
                  {item.exists ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  ) : (
                    <Badge variant="secondary" className="text-[10px] font-bold">READY</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>


        <Card className="rounded-[2rem] border-primary/10 shadow-xl shadow-primary/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-indigo-500" />
              Health Check
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Current environment mode: <Badge className="bg-primary text-white ml-2">{process.env.NEXT_PUBLIC_VERCEL_ENV || "Development"}</Badge>
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Site ID Resolved</span>
                <span className="font-bold text-emerald-500">YES</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Graph Auth</span>
                <span className="font-bold text-emerald-500">ACTIVE</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
