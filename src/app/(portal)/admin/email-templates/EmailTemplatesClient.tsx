"use client";

import { useState, useTransition } from "react";
import { Plus, Edit, Trash2, Mail, Save, X } from "lucide-react";
import type { EmailTemplate } from "@/types";
import { 
  createEmailTemplateAction, 
  updateEmailTemplateAction, 
  deleteEmailTemplateAction 
} from "./actions";

export default function EmailTemplatesClient({ initialTemplates }: { initialTemplates: EmailTemplate[] }) {
  const [templates, setTemplates] = useState<EmailTemplate[]>(initialTemplates);
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Form State
  const [formKey, setFormKey] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formBody, setFormBody] = useState("");

  function openCreate() {
    setFormKey("");
    setFormSubject("");
    setFormBody("");
    setIsCreating(true);
    setEditingId(null);
  }

  function openEdit(tpl: EmailTemplate) {
    setFormKey(tpl.templateKey);
    setFormSubject(tpl.subjectTemplate);
    setFormBody(tpl.htmlBodyTemplate);
    setEditingId(tpl.id);
    setIsCreating(false);
  }

  function closeForm() {
    setIsCreating(false);
    setEditingId(null);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      if (isCreating) {
        const res = await createEmailTemplateAction({
          templateKey: formKey,
          subjectTemplate: formSubject,
          htmlBodyTemplate: formBody
        });
        if (res.success && res.data) {
          setTemplates([...templates, res.data]);
          setBanner({ type: "success", message: "Template created successfully." });
          closeForm();
        } else {
          setBanner({ type: "error", message: res.error || "Failed to create." });
        }
      } else if (editingId) {
        const res = await updateEmailTemplateAction(editingId, {
          templateKey: formKey,
          subjectTemplate: formSubject,
          htmlBodyTemplate: formBody
        });
        if (res.success) {
          setTemplates(templates.map(t => t.id === editingId ? { ...t, templateKey: formKey, subjectTemplate: formSubject, htmlBodyTemplate: formBody } : t));
          setBanner({ type: "success", message: "Template updated." });
          closeForm();
        } else {
          setBanner({ type: "error", message: res.error || "Failed to update." });
        }
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this template?")) return;
    startTransition(async () => {
      const res = await deleteEmailTemplateAction(id);
      if (res.success) {
        setTemplates(templates.filter(t => t.id !== id));
        setBanner({ type: "success", message: "Template deleted." });
      } else {
        setBanner({ type: "error", message: res.error || "Failed to delete." });
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Email Templates</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage the HTML templates used for automated portal emails.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> New Template
        </button>
      </div>

      {banner && (
        <div className={`rounded-xl border p-4 text-sm ${banner.type === "success" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700" : "border-destructive/20 bg-destructive/10 text-destructive"}`}>
          {banner.message}
        </div>
      )}

      {(isCreating || editingId) && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{isCreating ? "Create Template" : "Edit Template"}</h2>
            <button onClick={closeForm} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Template Key</label>
              <input
                required
                value={formKey}
                onChange={e => setFormKey(e.target.value)}
                placeholder="e.g. session-candidate-default"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-xs text-muted-foreground mt-1">This key must match exactly what the code expects (e.g. <code>session-candidate-default</code>).</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Subject Template</label>
              <input
                required
                value={formSubject}
                onChange={e => setFormSubject(e.target.value)}
                placeholder="e.g. Your [CandidateType] Session is Scheduled"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">HTML Body Template</label>
              <textarea
                required
                rows={12}
                value={formBody}
                onChange={e => setFormBody(e.target.value)}
                placeholder="<p>Dear [RecipientName],</p>"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-xs text-muted-foreground mt-1">Available placeholders: <code>[RecipientName]</code>, <code>[CandidateName]</code>, <code>[ExpertName]</code>, <code>[SessionNumber]</code>, <code>[ScheduledAt]</code>, <code>[SessionTitle]</code>, <code>[SessionDetails]</code>, <code>[MeetingUrl]</code>, <code>[AdditionalNotes]</code></p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={closeForm} className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted">Cancel</button>
              <button type="submit" disabled={isPending} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50">
                <Save className="h-4 w-4" /> {isPending ? "Saving..." : "Save Template"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-muted-foreground">
                <th className="p-4 font-medium">Template Key</th>
                <th className="p-4 font-medium">Subject</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-muted-foreground">
                    <Mail className="mx-auto h-8 w-8 mb-3 opacity-20" />
                    No templates found in SharePoint. Create one to get started.
                  </td>
                </tr>
              ) : (
                templates.map((tpl) => (
                  <tr key={tpl.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-4 font-mono text-xs">{tpl.templateKey}</td>
                    <td className="p-4 text-muted-foreground truncate max-w-[300px]">{tpl.subjectTemplate}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(tpl)}
                          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(tpl.id)}
                          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
