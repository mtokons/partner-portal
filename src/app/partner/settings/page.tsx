import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getPartnerByEmail } from "@/lib/sharepoint";

import { Settings, Award, Shield, User } from "lucide-react";
import SettingsForm from "./SettingsForm";

export default async function PartnerSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  const partner = await getPartnerByEmail(user.email!);
  if (!partner) redirect("/partner-pending");

  const tierStatus = partner.tierStatus || "Silver";
  const margin = partner.marginPercentage || 15;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-muted-foreground" />
          Account Settings
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your partner profile, company info, and preferences.
        </p>
      </div>

      {/* Account Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border rounded-2xl p-5 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{partner.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <div className="bg-card border rounded-2xl p-5 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-yellow-500/10">
            <Award className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{tierStatus} Partner</p>
            <p className="text-xs text-muted-foreground">{margin}% commission</p>
          </div>
        </div>
        <div className="bg-card border rounded-2xl p-5 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10">
            <Shield className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground capitalize">{partner.partnerType || "Individual"}</p>
            <p className="text-xs text-muted-foreground">Code: {partner.partnerCode || "—"}</p>
          </div>
        </div>
      </div>

      {/* Editable Settings Form */}
      <SettingsForm
        initialData={{
          name: partner.name || "",
          email: user.email || "",
          company: partner.company || "",
          phone: partner.phone || "",
          partnerType: partner.partnerType || "individual",
          partnerCode: partner.partnerCode || "",
        }}
      />
    </div>
  );
}
