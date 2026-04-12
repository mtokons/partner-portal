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
  User, Mail, Building, Shield, Activity, ShoppingCart,
  Users, CheckCircle2, Clock, Edit3, Lock, Camera,
  BarChart3, TrendingUp, ArrowRight, Fingerprint,
} from "lucide-react";
import type { UserRole, SccgCard } from "@/types";
import SCCGCard from "@/components/ui/SCCGCard";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Area, AreaChart,
} from "recharts";
import { cn } from "@/lib/utils";

interface ProfileClientProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    company: string;
    partnerId: string;
  };
  activities: Array<{
    id: string;
    type: string;
    description: string;
    createdAt: string;
  }>;
  chartData: Array<{ month: string; count: number }>;
  stats: {
    totalOrders: number;
    totalClients: number;
    recentActivities: number;
    deliveredOrders: number;
  };
  card: SccgCard | null;
}

const roleColors: Record<string, { bg: string; text: string; gradient: string }> = {
  admin:    { bg: "bg-red-500/15", text: "text-red-400", gradient: "from-red-500 to-rose-600" },
  partner:  { bg: "bg-indigo-500/15", text: "text-indigo-400", gradient: "from-indigo-500 to-blue-600" },
  customer: { bg: "bg-emerald-500/15", text: "text-emerald-400", gradient: "from-emerald-500 to-teal-600" },
  expert:   { bg: "bg-violet-500/15", text: "text-violet-400", gradient: "from-violet-500 to-purple-600" },
};

const activityIcons: Record<string, typeof Activity> = {
  order: ShoppingCart,
  client: Users,
  payment: CheckCircle2,
  login: User,
};

export default function ProfileClient({ user, activities, chartData, stats, card }: ProfileClientProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [company, setCompany] = useState(user.company);
  const initials = user.name.slice(0, 2).toUpperCase();
  const rc = roleColors[user.role] || roleColors.partner;

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
                   expiry={card?.expiresAt ? new Date(card.expiresAt).toLocaleDateString("en-GB", { month: "2-digit", year: "2-digit" }) : "IND-LIFE"}
                   tier={card?.tier || (user.role === "admin" ? "platinum" : "not-issued")}
                   balance={card?.balance}
                   currency={card?.currency}
                 />
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
                   <Button variant="outline" className="w-full rounded-xl border-dashed py-6 text-primary hover:bg-primary/5 font-bold">
                      Apply for Physical SCCG Card
                   </Button>
                 )}
              </div>
            </CardContent>
          </Card>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Orders", value: stats.totalOrders, icon: ShoppingCart, color: "text-indigo-500", bg: "bg-indigo-50 border-indigo-100" },
              { label: "Clients", value: stats.totalClients, icon: Users, color: "text-emerald-500", bg: "bg-emerald-50 border-emerald-100" },
              { label: "Delivered", value: stats.deliveredOrders, icon: CheckCircle2, color: "text-violet-500", bg: "bg-violet-50 border-violet-100" },
              { label: "Activities", value: stats.recentActivities, icon: Activity, color: "text-amber-500", bg: "bg-amber-50 border-amber-100" },
            ].map((s) => (
              <div key={s.label} className={`flex flex-col items-center gap-2 py-4 px-3 rounded-2xl border ${s.bg} card-hover text-center`}>
                <div className="h-10 w-10 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <p className="text-2xl font-black text-foreground leading-none">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Activity chart */}
          <Card className="border-0 shadow-lg rounded-3xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-primary" />
                Activity Trend
              </CardTitle>
              <Badge variant="outline" className="text-xs">Last 6 months</Badge>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="profileGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      fill="url(#profileGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-sm text-muted-foreground py-8">No activity data yet</p>
              )}
            </CardContent>
          </Card>

          {/* Recent activity */}
          <Card className="border-0 shadow-lg rounded-3xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-primary" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-6">No recent activity</p>
              ) : (
                <div className="space-y-3">
                  {activities.slice(0, 8).map((a) => {
                    const Icon = activityIcons[a.type] || Activity;
                    return (
                      <div key={a.id} className="flex items-start gap-3 group">
                        <div className="h-8 w-8 rounded-xl bg-primary/8 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary/15 transition-colors">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground truncate">{a.description}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(a.createdAt).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

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
