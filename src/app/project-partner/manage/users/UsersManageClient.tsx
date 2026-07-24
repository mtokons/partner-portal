"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { UserPlus } from "lucide-react";
import { createPpmsUserAction } from "../actions";

interface UserRow { uid: string; email: string; displayName: string; role: string; status: string }

export default function UsersManageClient({ orgId, orgName, users, canCreateAdmin }: { orgId: string; orgName: string; users: UserRow[]; canCreateAdmin: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"project-partner" | "project-partner-admin">("project-partner");
  const [result, setResult] = useState<{ password?: string; error?: string; isNew?: boolean } | null>(null);

  function create() {
    setResult(null);
    if (!email.trim() || !fullName.trim()) { setResult({ error: "Name and email are required" }); return; }
    startTransition(async () => {
      try {
        const res = await createPpmsUserAction({ email: email.trim(), fullName: fullName.trim(), role, orgId });
        if (res.error) { setResult({ error: res.error }); return; }
        setResult({ password: res.tempPassword, isNew: res.isNew });
        setEmail(""); setFullName("");
        router.refresh();
      } catch (e) {
        setResult({ error: e instanceof Error ? e.message : "Failed to create user" });
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><UserPlus className="h-5 w-5" /> Add user to {orgName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <Label>Full name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="project-partner">Viewer (read-only)</SelectItem>
                  {canCreateAdmin && <SelectItem value="project-partner-admin">Org Admin (full CRUD)</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={create} disabled={pending}>{pending ? "Creating…" : "Create user"}</Button>
          {result?.error && <p className="text-sm text-red-600">{result.error}</p>}
          {result?.password && (
            <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">
              User {result.isNew ? "created" : "updated"}. Temporary password: <code className="font-mono font-semibold">{result.password}</code>
              <span className="block text-xs">Share this securely — it is shown only once.</span>
            </div>
          )}
          {result && !result.error && !result.password && (
            <p className="text-sm text-muted-foreground">User already exists; credentials unchanged.</p>
          )}
        </CardContent>
      </Card>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No users yet.</TableCell></TableRow>
            ) : users.map((u) => (
              <TableRow key={u.uid}>
                <TableCell className="font-medium">{u.displayName}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <Badge variant={u.role === "project-partner-admin" ? "default" : "outline"}>
                    {u.role === "project-partner-admin" ? "Org Admin" : "Viewer"}
                  </Badge>
                </TableCell>
                <TableCell className="capitalize">{u.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
