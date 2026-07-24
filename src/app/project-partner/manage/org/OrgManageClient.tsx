"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ProjectOrg } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createOrgAction, updateOrgAction } from "../actions";

export default function OrgManageClient({ org, canCreate }: { org: ProjectOrg | null; canCreate: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(org?.name || "");
  const [adminEmails, setAdminEmails] = useState((org?.adminEmails || []).join(", "));
  const [logoUrl, setLogoUrl] = useState(org?.logoUrl || "");
  const [primaryColor, setPrimaryColor] = useState(org?.primaryColor || "#2563eb");
  const [status, setStatus] = useState<ProjectOrg["status"]>(org?.status || "active");
  const [notes, setNotes] = useState(org?.notes || "");
  const [msg, setMsg] = useState("");

  function save() {
    setMsg("");
    if (!name.trim()) { setMsg("Organisation name is required"); return; }
    const emails = adminEmails.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
    startTransition(async () => {
      try {
        if (org) {
          await updateOrgAction(org.id, { name, adminEmails: emails, logoUrl, primaryColor, status, notes });
        } else {
          await createOrgAction({ name, adminEmails: emails, logoUrl, primaryColor, status, notes });
        }
        setMsg("Saved ✓");
        router.refresh();
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Failed to save");
      }
    });
  }

  if (!org && !canCreate) {
    return <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">No organisation is linked to your account.</p>;
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{org ? `Edit ${org.name}` : "Create organisation"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Admin emails (comma-separated)</Label>
          <Input value={adminEmails} onChange={(e) => setAdminEmails(e.target.value)} placeholder="admin@partner.com" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Logo URL</Label>
            <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Primary colour</Label>
            <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1 max-w-xs">
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as ProjectOrg["status"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Notes</Label>
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
          {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
