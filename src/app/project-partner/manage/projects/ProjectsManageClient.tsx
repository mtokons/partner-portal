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
import { Pencil, Trash2, Plus, SlidersHorizontal, Sparkles } from "lucide-react";

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

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> New project</Button>
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
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">No projects yet. Create your first joint-venture or direct project.</p>
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
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.code}</TableCell>
                  <TableCell>{p.client}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{p.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Badge variant={p.cvFormTemplateId ? "default" : "outline"} className="gap-1"><Sparkles className="h-3 w-3" /> Form</Badge>
                      <Badge variant={p.evaluationTemplateId ? "default" : "outline"} className="gap-1"><SlidersHorizontal className="h-3 w-3" /> Matrix</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Link href={`/project-partner/manage/evaluation?project=${p.id}`}>
                        <Button size="sm" variant="ghost" title="Configure evaluation"><SlidersHorizontal className="h-4 w-4" /></Button>
                      </Link>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(p)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(p)} title="Delete"><Trash2 className="h-4 w-4 text-red-600" /></Button>
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
