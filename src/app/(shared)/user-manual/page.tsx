import { getEffectiveSession } from "@/lib/effective-user";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import { BookOpen } from "lucide-react";
import PartnerManual from "./PartnerManual";
import CustomerManual from "./CustomerManual";
import ExpertManual from "./ExpertManual";
import AdminManual from "./AdminManual";
import StudentManual from "./StudentManual";

export const metadata = {
  title: "User Manual",
  description: "Role-specific user guide for the SCCG Career Lab UG Partner Portal.",
};

export default async function UserManualPage() {
  const session = await getEffectiveSession();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  const roles = (user.roles || [user.role]).map((r) => r.toLowerCase());

  // Determine which manual to show — first matching role wins
  const isAdmin = roles.includes("admin") || roles.includes("school-manager");
  const isPartner = roles.some((r) => ["partner", "partner-individual", "partner-institutional"].includes(r));
  const isExpert = roles.includes("expert") || roles.includes("teacher");
  const isCustomer = roles.includes("customer");
  const isStudent = roles.includes("student");

  return (
    <div className="min-h-screen bg-background p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="h-12 w-12 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center shrink-0">
          <BookOpen className="h-6 w-6 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">
            User Manual
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            SCCG Career Lab UG — Official Portal Guide
          </p>
        </div>
      </div>

      {isAdmin && <AdminManual userName={user.name || "Admin"} />}
      {!isAdmin && isPartner && <PartnerManual userName={user.name || "Partner"} />}
      {!isAdmin && !isPartner && isExpert && <ExpertManual userName={user.name || "Teacher"} />}
      {!isAdmin && !isPartner && !isExpert && isCustomer && <CustomerManual userName={user.name || "Customer"} />}
      {!isAdmin && !isPartner && !isExpert && !isCustomer && isStudent && <StudentManual userName={user.name || "Student"} />}
    </div>
  );
}
