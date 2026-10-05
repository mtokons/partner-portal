"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import type { Project } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { createProjectAction, updateProjectAction, deleteProjectAction } from "../actions";
import { Pencil, Trash2, Plus, SlidersHorizontal, Sparkles, Lock, LockOpen } from "lucide-react";

interface Props {
  projects: Project[];
  orgId: string;
  orgName: string;
  partnerEmail: string;
}

const EMPTY = { name: "", code: "", client: "", description: "", status: "active" as Project["status"] };

export default function ProjectsManageClient({ projects, orgId, orgName, partnerEmail }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");

  function openNew() {
    setEditing(null);
    setForm(EMPTY);
    setError("");
    setOpen(true);
  }

  function openEdit(p: Project) {
    setEditing(p);
    setForm({ name: p.name, code: p.code, client: p.client, description: p.description || "", status: p.status });
    setError("");
    setOpen(true);
  }

  function save() {
    setError("");
    if (!form.name.trim()) { setError("Project name is required"); return; }
    startTransition(async () => {
      try {
        if (editing) {
          await updateProjectAction(editing.id, { ...form });
        } else {
          await createProjectAction({
            ...form,
            orgId,
            partnerName: orgName,
            partnerEmail,
          });
        }
        setOpen(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save project");
      }
    });
  }

  function remove(p: Project) {
    if (!confirm(`Delete project "${p.name}"? This removes its staffing too.`)) return;
    startTransition(async () => {
      try {
        await deleteProjectAction(p.id);
        router.refresh();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Failed to delete");
      }
    });
  }

  /** Quick-toggle between active ↔ inactive without opening the full edit form. */
  function toggleInactive(p: Project) {
    const newStatus: Project["status"] = p.status === "inactive" ? "active" : "inactive";
    startTransition(async () => {
      try {
        await updateProjectAction(p.id, { status: newStatus });
        router.refresh();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Failed to update status");
      }
    });
  }

  function statusBadgeClass(status: Project["status"]) {
    if (status === "active")    return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (status === "inactive")  return "bg-slate-100 text-slate-500 border-slate-300";
    if (status === "on-hold")   return "bg-amber-100 text-amber-700 border-amber-200";
    if (status === "completed") return "bg-blue-100 text-blue-700 border-blue-200";
    return "bg-slate-100 text-slate-500 border-slate-200";
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="gap-2">
              <Plus className="h-4 w-4" /> New project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit project" : "New project"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="p-name">Name</Label>
                <Input id="p-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="p-code">Code</Label>
                  <Input id="p-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="p-client">Client</Label>
                  <Input id="p-client" value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="p-desc">Description</Label>
                <Textarea id="p-desc" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              {/* ── Status selector ── */}
              <div className="space-y-1">
                <Label htmlFor="p-status">Status</Label>
                <select
                  id="p-status"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as Project["status"] })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="active">Active</option>
                  <option value="on-hold">On Hold</option>
                  <option value="completed">Completed</option>
                  <option value="inactive">Inactive — read-only for partner (no download / no copy)</option>
                </select>
                {form.status === "inactive" && (
                  <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700 border border-amber-200 mt-1">
                    ⚠️ Partners will see the project in read-only mode. Downloads and text copying will be blocked.
                  </p>
                )}
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
              <Button onClick={save} disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {projects.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No projects yet. Create your first joint-venture or direct project.
        </p>
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Config</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((p) => (
                <TableRow key={p.id} className={p.status === "inactive" ? "opacity-60" : ""}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.code}</TableCell>
                  <TableCell>{p.client}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadgeClass(p.status)}`}
                    >
                      {p.status === "inactive" && <Lock className="h-3 w-3" />}
                      {p.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Badge variant={p.cvFormTemplateId ? "default" : "outline"} className="gap-1">
                        <Sparkles className="h-3 w-3" /> Form
                      </Badge>
                      <Badge variant={p.evaluationTemplateId ? "default" : "outline"} className="gap-1">
                        <SlidersHorizontal className="h-3 w-3" /> Matrix
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Link href={`/project-partner/manage/evaluation?project=${p.id}`}>
                        <Button size="sm" variant="ghost" title="Configure evaluation">
                          <SlidersHorizontal className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(p)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {/* ── Inactive / Activate quick toggle ── */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleInactive(p)}
                        disabled={pending}
                        title={
                          p.status === "inactive"
                            ? "Activate project — partner regains full access"
                            : "Deactivate project — partner sees read-only, no downloads"
                        }
                        className={
                          p.status === "inactive"
                            ? "text-emerald-600 hover:text-emerald-700"
                            : "text-slate-400 hover:text-amber-600"
                        }
                      >
                        {p.status === "inactive"
                          ? <LockOpen className="h-4 w-4" />
                          : <Lock className="h-4 w-4" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(p)} title="Delete">
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
