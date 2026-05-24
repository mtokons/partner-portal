"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, ClipboardList, CheckCircle2, Play, XCircle } from "lucide-react";
import type { ServiceTask } from "@/types";
import { createServiceTaskAction, updateServiceTaskStatusAction } from "../../actions";

const taskStatusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  planned:       { label: "Planned",     variant: "secondary" },
  "in-progress": { label: "In Progress", variant: "outline" },
  completed:     { label: "Completed",   variant: "default" },
  cancelled:     { label: "Cancelled",   variant: "destructive" },
};

export default function ServiceTasksSection({ orderId, tasks }: { orderId: string; tasks: ServiceTask[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function handleCreate() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await createServiceTaskAction({
        salesOrderId: orderId,
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: dueDate || undefined,
        assignedTo: assignedTo.trim() || undefined,
      });
      setTitle("");
      setDescription("");
      setDueDate("");
      setAssignedTo("");
      setShowForm(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateStatus(taskId: string, status: "planned" | "in-progress" | "completed" | "cancelled") {
    setUpdatingId(taskId);
    try {
      await updateServiceTaskStatusAction(taskId, status);
      router.refresh();
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            Service Tasks ({tasks.length})
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-1" /> Add Task
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* New task form */}
        {showForm && (
          <div className="p-4 border rounded-xl bg-muted/30 space-y-3">
            <Input placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Assigned to (optional)" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} />
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={saving || !title.trim()}>
                {saving ? "Creating..." : "Create Task"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Task list */}
        {tasks.length === 0 && !showForm && (
          <p className="text-sm text-muted-foreground text-center py-4">No service tasks yet.</p>
        )}
        <div className="space-y-2">
          {tasks.map((task) => {
            const cfg = taskStatusConfig[task.status] || taskStatusConfig.planned;
            return (
              <div key={task.id} className="flex items-center justify-between p-3 border rounded-xl hover:bg-muted/20">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{task.title}</p>
                    <Badge variant={cfg.variant} className="text-[10px]">{cfg.label}</Badge>
                  </div>
                  {task.description && <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>}
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    {task.assignedTo && <span>Assigned: {task.assignedTo}</span>}
                    {task.dueDate && <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex gap-1 ml-3">
                  {task.status === "planned" && (
                    <Button size="sm" variant="ghost" onClick={() => handleUpdateStatus(task.id, "in-progress")} disabled={updatingId === task.id}>
                      <Play className="h-3 w-3" />
                    </Button>
                  )}
                  {(task.status === "planned" || task.status === "in-progress") && (
                    <Button size="sm" variant="ghost" onClick={() => handleUpdateStatus(task.id, "completed")} disabled={updatingId === task.id} className="text-emerald-600">
                      <CheckCircle2 className="h-3 w-3" />
                    </Button>
                  )}
                  {task.status !== "completed" && task.status !== "cancelled" && (
                    <Button size="sm" variant="ghost" onClick={() => handleUpdateStatus(task.id, "cancelled")} disabled={updatingId === task.id} className="text-red-400">
                      <XCircle className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
