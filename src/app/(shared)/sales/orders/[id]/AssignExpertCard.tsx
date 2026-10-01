"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserCheck, Sparkles, Loader2, Edit3, X } from "lucide-react";
import type { Expert } from "@/types";
import { assignExpertToOrderAction } from "../../actions";
import { toast } from "sonner";

interface AssignExpertCardProps {
  orderId: string;
  notes?: string;
  experts: Expert[];
  isAdmin: boolean;
}

export default function AssignExpertCard({
  orderId,
  notes,
  experts,
  isAdmin,
}: AssignExpertCardProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedExpertId, setSelectedExpertId] = useState("");
  const [customExpertName, setCustomExpertName] = useState("");
  const [saving, setSaving] = useState(false);

  // Extract current assigned expert line from notes if present
  const assignedLine = (notes || "")
    .split("\n")
    .find((l) => l.trim().startsWith("Assigned Expert:"));
  const assignedValue = assignedLine
    ? assignedLine.replace("Assigned Expert:", "").trim()
    : null;

  async function handleAssign() {
    let expertName = "";
    let expertEmail = "";
    let expertSpecialization = "";

    if (selectedExpertId === "custom") {
      if (!customExpertName.trim()) {
        toast.error("Please enter the expert's name");
        return;
      }
      expertName = customExpertName.trim();
    } else {
      const exp = experts.find((e) => e.id === selectedExpertId);
      if (!exp) {
        toast.error("Please select an expert from the list");
        return;
      }
      expertName = exp.name;
      expertEmail = exp.email;
      expertSpecialization = exp.specialization;
    }

    setSaving(true);
    try {
      const res = await assignExpertToOrderAction({
        orderId,
        expertName,
        expertEmail,
        expertSpecialization,
      });

      if (!res.success) {
        toast.error(res.message || "Failed to assign expert");
        alert(res.message || "Failed to assign expert");
      } else {
        toast.success(`Service expert ${expertName} assigned to order!`);
        setIsEditing(false);
        router.refresh();
      }
    } catch (err: any) {
      const msg = err?.message || "Failed to assign expert";
      toast.error(msg);
      alert(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border border-border/80 shadow-md rounded-2xl overflow-hidden bg-card/60 backdrop-blur-sm">
      <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
            <UserCheck className="h-5 w-5 text-primary" />
            Service Expert Assignment
          </CardTitle>
          {assignedValue && !isEditing && isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-8 gap-1.5 text-xs rounded-xl"
            >
              <Edit3 className="h-3.5 w-3.5" /> Change
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {assignedValue && !isEditing ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-primary/5 border border-primary/15">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center text-sm shrink-0 border border-primary/20">
                {assignedValue.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-sm text-foreground">{assignedValue}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Assigned specialist handling this client&apos;s fulfillment
                </p>
              </div>
            </div>
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 self-start sm:self-auto">
              Active Assignment
            </Badge>
          </div>
        ) : isEditing || !assignedValue ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Select Service Expert
              </label>
              <select
                value={selectedExpertId}
                onChange={(e) => setSelectedExpertId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">-- Choose an Expert from Database --</option>
                {experts.map((exp) => (
                  <option key={exp.id} value={exp.id}>
                    {exp.name} {exp.specialization ? `(${exp.specialization})` : ""} {exp.email ? `— ${exp.email}` : ""}
                  </option>
                ))}
                <option value="custom">+ Other / Custom Expert Name...</option>
              </select>
            </div>

            {selectedExpertId === "custom" && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground block">
                  Expert Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Schmidt (Career Consultant)"
                  value={customExpertName}
                  onChange={(e) => setCustomExpertName(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                onClick={handleAssign}
                disabled={saving || !selectedExpertId}
                className="gap-2 rounded-xl"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {saving ? "Assigning..." : "Confirm Expert Assignment"}
              </Button>
              {assignedValue && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                  className="rounded-xl"
                >
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
