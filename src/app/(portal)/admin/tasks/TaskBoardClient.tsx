"use client";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { 
  ClipboardList, Plus, Search, Filter, MoreHorizontal, 
  Clock, MessageSquare, AlertTriangle, CheckCircle2, 
  BarChart3, Layout, List, Mail, Trash2, X, ChevronRight,
  Shield, User as UserIcon, Calendar, Tag as TagIcon,
  ChevronDown
} from "lucide-react";

import { fetchTaskBoardDataAction, saveTaskAction, deleteTaskAction, moveTaskAction } from "./actions";
import { KanbanTask } from "@/types";

const PRIORITIES = ["Low", "Medium", "High", "Critical"];
const PRIORITY_THEMES = {
  Low: { bg: "bg-emerald-500/10", text: "text-emerald-600", border: "border-emerald-500/20", line: "#10b981" },
  Medium: { bg: "bg-blue-500/10", text: "text-blue-600", border: "border-blue-500/20", line: "#3b82f6" },
  High: { bg: "bg-orange-500/10", text: "text-orange-600", border: "border-orange-500/20", line: "#f97316" },
  Critical: { bg: "bg-rose-500/10", text: "text-rose-600", border: "border-rose-500/20", line: "#f43f5e" },
};

const COLUMNS = [
  { id: "backlog", label: "Backlog", color: "#64748b", gradient: "gradient-blue" },
  { id: "todo", label: "To Do", color: "#3b82f6", gradient: "gradient-cosmic" },
  { id: "inprogress", label: "In Progress", color: "#f59e0b", gradient: "gradient-orange" },
  { id: "review", label: "In Review", color: "#8b5cf6", gradient: "gradient-purple" },
  { id: "done", label: "Done", color: "#10b981", gradient: "gradient-green" },
];

const TAGS = ["Frontend", "Backend", "Design", "QA", "DevOps", "Docs", "Bug", "Feature"];

function Avatar({ member, size = 28 }: any) {
  if (!member) return (
    <div style={{ width: size, height: size }} className="rounded-full bg-muted border border-border flex items-center justify-center text-[10px] text-muted-foreground font-medium shrink-0">?</div>
  );
  return (
    <div 
      title={member.name} 
      style={{ width: size, height: size, background: `${member.color}15`, border: `1.5px solid ${member.color}40`, color: member.color }}
      className="rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 cursor-default shadow-sm"
    >
      {member.initials}
    </div>
  );
}

function PriorityBadge({ priority }: any) {
  const theme = PRIORITY_THEMES[priority as keyof typeof PRIORITY_THEMES] || PRIORITY_THEMES.Medium;
  return (
    <span className={cn(
      "text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-sm flex items-center gap-1",
      theme.bg, theme.text, theme.border
    )}>
      {priority === "Critical" && <AlertTriangle className="w-2.5 h-2.5" />}
      {priority}
    </span>
  );
}

function TagBadge({ tag }: any) {
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-muted-foreground whitespace-nowrap backdrop-blur-sm">
      {tag}
    </span>
  );
}

function EmailNotificationModal({ task, member, onClose }: any) {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (task && member) {
      setPreview(`Hi ${member.name.split(" ")[0]},\n\nYou have been assigned a new task:\n\n📋 ${task.title}\n\nPriority: ${task.priority}\nDue: ${task.due}\n\n${task.desc}\n\nPlease log into the portal to view and update your task.\n\nBest regards,\nPortal Team`);
    }
  }, [task, member]);

  const handleSend = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1400));
    setLoading(false);
    setSent(true);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[1000] animate-in fade-in duration-300" onClick={onClose}>
      <div 
        className="glass border border-white/20 rounded-3xl p-8 w-[480px] max-w-[95vw] relative shadow-2xl card-enter" 
        onClick={(e: any) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-primary" />
            <span className="font-bold text-lg tracking-tight">Notification</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded-full transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {sent ? (
          <div className="text-center py-10 animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold mb-2">Message Sent!</h3>
            <p className="text-muted-foreground text-sm">Email successfully delivered to <strong>{member?.name}</strong></p>
            <button onClick={onClose} className="mt-8 px-8 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm">Close</button>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60">Recipient</label>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 font-bold text-sm text-foreground flex items-center gap-2">
                <Avatar member={member} size={20} />
                {member?.name}
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60">Message Preview</label>
              <textarea 
                value={preview} 
                onChange={(e: any) => setPreview(e.target.value)} 
                rows={6} 
                className="w-full text-xs font-medium p-4 rounded-xl border border-white/10 bg-white/5 text-foreground focus:ring-2 focus:ring-primary/20 outline-none resize-none"
              />
            </div>

            <div className="flex gap-3 justify-end mt-4">
              <button 
                onClick={onClose} 
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-muted-foreground hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSend} 
                disabled={loading} 
                className="flex items-center gap-2 px-8 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-xs shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? "Discovering..." : <><Mail className="w-3.5 h-3.5" /> Send Discovery</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskModal({ task, onClose, onUpdate, onDelete, members }: any) {
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDesc, setEditDesc] = useState(task.desc);
  const [editAssignee, setEditAssignee] = useState(task.assignee);
  const [editPriority, setEditPriority] = useState(task.priority);
  const [editDue, setEditDue] = useState(task.due);
  const [editTags, setEditTags] = useState(task.tags);
  const [editCol, setEditCol] = useState(task.col);
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState(task.comments || []);
  const [showEmail, setShowEmail] = useState(false);

  const member = members.find((m: any) => m.id === editAssignee);

  const save = () => {
    onUpdate({ ...task, title: editTitle, desc: editDesc, assignee: editAssignee, priority: editPriority, due: editDue, tags: editTags, col: editCol, comments });
    onClose();
  };

  const addComment = () => {
    if (!newComment.trim()) return;
    const c = { author: "You", text: newComment.trim(), ts: "Just now" };
    setComments((prev: any) => [...prev, c]);
    setNewComment("");
  };

  const toggleTag = (t: any) => setEditTags((prev: any) => prev.includes(t) ? prev.filter((x: any) => x !== t) : [...prev, t]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[900] animate-in fade-in duration-300" onClick={onClose}>
      <div 
        className="glass border border-white/20 rounded-[32px] w-[800px] max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col shadow-2xl card-enter" 
        onClick={(e: any) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center p-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            <span className="px-3 py-1 rounded-full bg-white/10 text-[10px] font-black uppercase tracking-tighter text-muted-foreground/80">
              ID: {task.id.toUpperCase()}
            </span>
            <div className="h-4 w-[1px] bg-white/10" />
            <span className="text-xs font-bold text-muted-foreground italic flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" /> Created {task.created}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowEmail(true)} className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-all text-xs font-black uppercase">
              <Mail className="w-3.5 h-3.5" /> Notify
            </button>
            <button onClick={() => { onDelete(task.id); onClose(); }} className="flex items-center gap-2 px-4 py-1.5 rounded-full hover:bg-rose-500/10 text-rose-500 transition-all text-xs font-black uppercase">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors ml-2">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-4">
              <input 
                value={editTitle} 
                onChange={(e: any) => setEditTitle(e.target.value)} 
                className="w-full text-3xl font-black bg-transparent border-none outline-none focus:ring-0 text-foreground tracking-tight placeholder:text-muted-foreground/30"
                placeholder="Entry Discovery Title..."
              />
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60 flex items-center gap-2">
                  <List className="w-3.5 h-3.5" /> Exploration Details
                </label>
                <textarea 
                  value={editDesc} 
                  onChange={(e: any) => setEditDesc(e.target.value)} 
                  rows={4} 
                  className="w-full text-sm font-medium p-6 rounded-2xl border border-white/10 bg-white/5 text-foreground focus:ring-2 focus:ring-primary/20 outline-none resize-none leading-relaxed"
                  placeholder="Elaborate on the task objectives..."
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60 flex items-center gap-2">
                <TagIcon className="w-3.5 h-3.5" /> Categorization
              </label>
              <div className="flex flex-wrap gap-2">
                {TAGS.map((t: any) => (
                  <button 
                    key={t} 
                    onClick={() => toggleTag(t)} 
                    className={cn(
                      "px-4 py-1.5 rounded-xl text-xs font-bold transition-all border",
                      editTags.includes(t) 
                        ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20" 
                        : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Comments Section */}
            <div className="space-y-4 pt-6 border-t border-white/10">
              <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60 flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5" /> Intellectual Log ({comments.length})
              </label>
              <div className="space-y-4">
                {comments.map((c: any, i: any) => (
                  <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/[0.08] transition-all">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-black text-primary uppercase tracking-wider">{c.author}</span>
                      <span className="text-[10px] font-bold text-muted-foreground/60">{c.ts}</span>
                    </div>
                    <p className="text-sm font-medium leading-relaxed">{c.text}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-6">
                <input 
                  value={newComment} 
                  onChange={(e: any) => setNewComment(e.target.value)} 
                  onKeyDown={(e: any) => e.key === "Enter" && addComment()} 
                  placeholder="Append observation..." 
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/40"
                />
                <button onClick={addComment} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-xs">Post</button>
              </div>
            </div>
          </div>

          {/* Sidebar controls */}
          <div className="space-y-8 bg-black/20 -m-8 ml-0 p-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60">Flow State</label>
                <select 
                  value={editCol} 
                  onChange={(e) => setEditCol(e.target.value)} 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
                >
                  {COLUMNS.map((c: any) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60">Assigned Guardian</label>
                <select 
                  value={editAssignee} 
                  onChange={(e) => setEditAssignee(e.target.value)} 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
                >
                  <option value="">Unassigned</option>
                  {members.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60">Core Priority</label>
                <select 
                  value={editPriority} 
                  onChange={(e) => setEditPriority(e.target.value)} 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
                >
                  {PRIORITIES.map((p: any) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60">Deadline Horizon</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input 
                    type="date" 
                    value={editDue} 
                    onChange={(e: any) => setEditDue(e.target.value)} 
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            </div>

            {member && (
              <div className="p-5 rounded-[24px] bg-primary/5 border border-primary/20 space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar member={member} size={40} />
                  <div>
                    <p className="text-sm font-black text-foreground">{member.name}</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Lead Architect</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowEmail(true)} 
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-wider shadow-lg shadow-primary/20 hover:scale-[1.02] transition-scale"
                >
                  <Mail className="w-3.5 h-3.5" /> Send Dispatch
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-black/10">
          <button 
            onClick={onClose} 
            className="px-8 py-3 rounded-2xl text-sm font-black text-muted-foreground hover:bg-white/5 transition-all uppercase tracking-widest"
          >
            Cancel
          </button>
          <button 
            onClick={save} 
            className="px-10 py-3 rounded-2xl bg-primary text-primary-foreground font-black text-sm shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest"
          >
            Synchronize Changes
          </button>
        </div>
      </div>
      {showEmail && <EmailNotificationModal task={task} member={member} onClose={() => setShowEmail(false)} />}
    </div>
  );
}

function NewTaskModal({ onClose, onCreate, defaultCol, members }: any) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [assignee, setAssignee] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [due, setDue] = useState("");
  const [col, setCol] = useState(defaultCol || "backlog");
  const [tags, setTags] = useState<any[]>([]);

  const create = () => {
    if (!title.trim()) return;
    onCreate({ title: title.trim(), desc, assignee, priority, due, col, tags, comments: [] });
    onClose();
  };
  const toggleTag = (t: any) => setTags((prev: any) => prev.includes(t) ? prev.filter((x: any) => x !== t) : [...prev, t]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[900] animate-in fade-in duration-300" onClick={onClose}>
      <div 
        className="glass border border-white/20 rounded-[32px] w-[600px] max-w-[95vw] overflow-hidden flex flex-col shadow-2xl card-enter relative" 
        onClick={(e: any) => e.stopPropagation()}
      >
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 blur-[80px] rounded-full" />
        
        <div className="p-8 space-y-8 relative z-10">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-black tracking-tight flex items-center gap-3 italic">
              <Plus className="w-7 h-7 text-primary" />
              Initiate Discovery
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60">Heading</label>
              <input 
                autoFocus 
                value={title} 
                onChange={(e: any) => setTitle(e.target.value)} 
                placeholder="What objective are we chasing?..." 
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-lg font-bold outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/30 transition-all focus:bg-white/10" 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60">Stage</label>
                <div className="relative">
                  <select value={col} onChange={(e: any) => setCol(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold appearance-none outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer">
                    {COLUMNS.map((c: any) => <option key={c.id} value={c.id} className="bg-slate-900">{c.label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60">Priority</label>
                <div className="relative">
                  <select value={priority} onChange={(e: any) => setPriority(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold appearance-none outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer">
                    {PRIORITIES.map((p: any) => <option key={p} value={p} className="bg-slate-900">{p}</option>)}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60">Guardian</label>
              <div className="relative">
                <select value={assignee} onChange={(e: any) => setAssignee(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold appearance-none outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer">
                  <option value="" className="bg-slate-900">Unassigned</option>
                  {members.map((m: any) => <option key={m.id} value={m.id} className="bg-slate-900">{m.name}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60">Categorization Tokens</label>
              <div className="flex flex-wrap gap-2">
                {TAGS.map((t: any) => (
                  <button key={t} onClick={() => toggleTag(t)} className={cn("px-4 py-1.5 rounded-xl text-[10px] font-black uppercase border transition-all hover:scale-105 active:scale-95", tags.includes(t) ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10")}>{t}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button onClick={onClose} className="px-8 py-3 rounded-2xl text-sm font-black text-muted-foreground hover:bg-white/5 transition-all uppercase tracking-widest">Cancel</button>
            <button onClick={create} className="px-10 py-3 rounded-2xl bg-primary text-primary-foreground font-black text-sm shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest hover:shadow-primary/40">Deploy Task</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskCard({ task, onClick, onDragStart, onDragEnd, member }: any) {
  const isOverdue = task.due && new Date(task.due) < new Date() && task.col !== "done";
  const theme = PRIORITY_THEMES[task.priority as keyof typeof PRIORITY_THEMES] || PRIORITY_THEMES.Medium;

  return (
    <div 
      draggable 
      onDragStart={(e: any) => { e.dataTransfer.setData("taskId", task.id); onDragStart(task.id); }} 
      onDragEnd={onDragEnd} 
      onClick={onClick}
      className="bg-card glass border border-border/50 rounded-2xl p-4 mb-4 cursor-grab active:cursor-grabbing card-hover shadow-lg group relative overflow-hidden card-enter"
    >
      {/* Priority Accent */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1" 
        style={{ background: theme.line }}
      />

      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <h4 className="text-sm font-semibold text-foreground leading-snug group-hover:text-primary transition-colors">
            {task.title}
          </h4>
          <PriorityBadge priority={task.priority} />
        </div>

        {task.desc && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {task.desc}
          </p>
        )}

        {task.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {task.tags.map((t: any) => <TagBadge key={t} tag={t} />)}
          </div>
        )}

        <div className="flex items-center justify-between mt-2 pt-3 border-t border-border/10">
          <div className="flex items-center gap-4">
            <Avatar member={member} size={24} />
            {task.comments?.length > 0 && (
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                <MessageSquare className="w-3 h-3 opacity-60" />
                {task.comments.length}
              </div>
            )}
          </div>

          {task.due && (
            <div className={cn(
              "flex items-center gap-1.5 text-[10px] font-semibold",
              isOverdue ? "text-rose-500" : "text-muted-foreground/60"
            )}>
              <Clock className="w-3 h-3" />
              {task.due}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Column({ col, tasks, onCardClick, onDrop, onDragOver, onDragLeave, isDragOver, onAddTask, members }: any) {
  return (
    <div className="flex flex-col w-[300px] shrink-0 h-full">
      <div className="flex items-center justify-between mb-4 px-3">
        <div className="flex items-center gap-2.5">
          <div 
            className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)] nav-glow" 
            style={{ backgroundColor: col.color }} 
          />
          <h3 className="text-sm font-bold tracking-tight text-foreground uppercase">
            {col.label}
          </h3>
          <span className="px-2 py-0.5 rounded-full bg-secondary text-[10px] font-bold border border-border/50 text-muted-foreground">
            {tasks.length}
          </span>
        </div>
        <button 
          onClick={onAddTask}
          className="p-1.5 rounded-lg border border-border/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div 
        onDrop={onDrop} 
        onDragOver={onDragOver} 
        onDragLeave={onDragLeave} 
        className={cn(
          "flex-1 w-full rounded-2xl p-3 pb-20 transition-all duration-300 scrollbar-hide",
          isDragOver ? "bg-primary/5 border-2 border-dashed border-primary/30" : "bg-muted/30 border-2 border-transparent"
        )}
      >
        <div className="stagger">
          {tasks.map((t: any) => (
            <TaskCard 
              key={t.id} 
              task={t} 
              member={members.find((m: any) => m.id === t.assignee)}
              onClick={() => onCardClick(t)} 
              onDragStart={() => {}} 
              onDragEnd={() => {}} 
            />
          ))}
        </div>
        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-30">
            <ClipboardList className="w-8 h-8" />
            <p className="text-xs font-medium">No tasks yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatsBar({ tasks }: any) {
  const stats = [
    { label: "Total Tasks", val: tasks.length, color: "gradient-cosmic", icon: ClipboardList },
    { label: "Completed", val: tasks.filter((t: any) => t.col === "done").length, color: "gradient-green", icon: CheckCircle2 },
    { label: "In Progress", val: tasks.filter((t: any) => t.col === "inprogress").length, color: "gradient-orange", icon: BarChart3 },
    { label: "Overdue", val: tasks.filter((t: any) => t.due && new Date(t.due) < new Date() && t.col !== "done").length, color: "gradient-red", icon: AlertTriangle },
    { label: "Productivity", val: (tasks.length ? Math.round((tasks.filter((t: any) => t.col === "done").length / tasks.length) * 100) : 0) + "%", color: "gradient-blue", icon: Layout },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
      {stats.map((s) => (
        <div key={s.label} className={cn("kpi-card", s.color)}>
          <div className="flex flex-col gap-3 relative z-10">
            <div className="flex items-center justify-between opacity-80">
              <span className="text-[10px] font-bold uppercase tracking-widest">{s.label}</span>
              <s.icon className="w-4 h-4" />
            </div>
            <span className="text-2xl font-black tracking-tight">{s.val}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TaskBoard() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showNew, setShowNew] = useState(false);
  const [newDefaultCol, setNewDefaultCol] = useState("backlog");
  const [dragOverCol, setDragOverCol] = useState<any>(null);
  const [draggingId, setDraggingId] = useState<any>(null);
  const [filterMember, setFilterMember] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [view, setView] = useState("board");
  const [showEmailNotif, setShowEmailNotif] = useState<{task: any; member: any} | null>(null);

  const loadData = async () => {
    setLoading(true);
    const res = await fetchTaskBoardDataAction();
    if (res.success && res.data) {
      const mappedTasks = res.data.tasks.map((t: KanbanTask) => ({
        id: t.id,
        title: t.title,
        desc: t.description || "",
        col: t.status,
        assignee: t.assignedTo,
        priority: t.priority.charAt(0).toUpperCase() + t.priority.slice(1),
        due: t.dueDate?.split("T")[0] || "",
        tags: (t as any).tags || [],
        comments: (t as any).comments || [],
        created: new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      }));
      setTasks(mappedTasks);
      setMembers(res.data.members);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = tasks.filter((t: any) => {
    if (filterMember && t.assignee !== filterMember) return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    if (searchQ && !t.title.toLowerCase().includes(searchQ.toLowerCase())) return false;
    return true;
  });

  const handleDrop = async (colId: any, e: any) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (taskId) {
      const res = await moveTaskAction(taskId, colId);
      if (res.success) {
        setTasks((prev: any) => prev.map((t: any) => t.id === taskId ? { ...t, col: colId } : t));
      }
    }
    setDragOverCol(null);
    setDraggingId(null);
  };

  const handleUpdate = async (updated: any) => {
    const apiPayload = {
      id: updated.id,
      title: updated.title,
      description: updated.desc,
      status: updated.col,
      priority: updated.priority.toLowerCase(),
      dueDate: updated.due ? new Date(updated.due).toISOString() : null,
      assignedTo: updated.assignee,
      tags: updated.tags,
      comments: updated.comments,
      createdBy: "admin",
    };
    const res = await saveTaskAction(apiPayload);
    if (res.success) loadData();
  };

  const handleDelete = async (id: any) => {
    const res = await deleteTaskAction(id);
    if (res.success) {
      setTasks((prev: any) => prev.filter((t: any) => t.id !== id));
      setSelectedTask(null);
    }
  };

  const handleCreate = async (task: any) => {
    const apiPayload = {
      title: task.title,
      description: task.desc,
      status: task.col,
      priority: task.priority.toLowerCase(),
      dueDate: task.due ? new Date(task.due).toISOString() : null,
      assignedTo: task.assignee,
      tags: task.tags,
      comments: task.comments,
      createdBy: "admin",
    };
    const res = await saveTaskAction(apiPayload);
    if (res.success) loadData();
  };

  return (
    <div className="page-enter relative min-h-[calc(100vh-100px)]">
      {/* Premium Mesh Background */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[10%] right-[-10%] w-[30%] h-[30%] bg-purple-500/5 blur-[100px] rounded-full animate-pulse delay-700" />
        <div className="absolute top-[20%] right-[10%] w-[25%] h-[25%] bg-blue-500/5 blur-[80px] rounded-full animate-pulse delay-1000" />
      </div>
      <h2 className="sr-only">Task board — project management view</h2>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <h2 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-primary" />
            Task Board
          </h2>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-muted-foreground text-sm font-medium">Manage flow and monitor team efficiency.</p>
            {loading && (
              <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full animate-pulse">
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-ping" />
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Syncing</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex p-1 bg-secondary rounded-xl border border-border/50">
            <button 
              onClick={() => setView("board")} 
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
                view === "board" ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Layout className="w-4 h-4" /> Board
            </button>
            <button 
              onClick={() => setView("list")} 
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
                view === "list" ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="w-4 h-4" /> List
            </button>
          </div>
          <button 
            onClick={() => { setNewDefaultCol("backlog"); setShowNew(true); }}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" /> New Task
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-4 mb-8 p-4 bg-muted/30 rounded-2xl border border-border/50 backdrop-blur-sm animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="relative group flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input 
            value={searchQ} 
            onChange={(e: any) => setSearchQ(e.target.value)} 
            placeholder="Search tasks by title or ID..." 
            className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium" 
          />
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-background border border-border rounded-xl">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <select 
              value={filterMember} 
              onChange={(e: any) => setFilterMember(e.target.value)} 
              className="bg-transparent text-sm font-semibold outline-none text-foreground min-w-[120px]"
            >
              <option value="">All Members</option>
              {members.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-background border border-border rounded-xl">
            <Shield className="w-3.5 h-3.5 text-muted-foreground" />
            <select 
              value={filterPriority} 
              onChange={(e: any) => setFilterPriority(e.target.value)} 
              className="bg-transparent text-sm font-semibold outline-none text-foreground min-w-[120px]"
            >
              <option value="">All Priorities</option>
              {PRIORITIES.map((p: any) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {(filterMember || filterPriority || searchQ) && (
            <button 
              onClick={() => { setFilterMember(""); setFilterPriority(""); setSearchQ(""); }} 
              className="text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors px-2"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <StatsBar tasks={filtered} />

      {view === "board" ? (
        <div className="flex gap-6 overflow-x-auto pb-10 scrollbar-hide">
          {COLUMNS.map((col: any) => (
            <Column key={col.id} col={col}
              tasks={filtered.filter((t: any) => t.col === col.id)}
               members={members}
               onCardClick={(t: any) => setSelectedTask(t)}
               onDrop={(e: any) => handleDrop(col.id, e)}
               onDragOver={(e: any) => { e.preventDefault(); setDragOverCol(col.id); }}
               onDragLeave={() => setDragOverCol(null)}
              isDragOver={dragOverCol === col.id}
              onAddTask={() => { setNewDefaultCol(col.id); setShowNew(true); }}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[32px] overflow-hidden border border-border/50 bg-muted/20 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-500 shadow-2xl">
          <div className="grid grid-cols-[2.5fr_1.2fr_1.5fr_1.2fr_1.2fr_0.5fr] gap-4 bg-black/5 px-8 py-5 border-b border-white/5">
            {["Exploration Task", "Flow State", "Assigned Guardian", "Core Priority", "Deadline", ""].map((h) => (
              <span key={h} className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60">{h}</span>
            ))}
          </div>
          <div className="flex flex-col">
                  {filtered.map((t: any) => {
                    const member = members.find((m: any) => m.id === t.assignee);
                    const col = COLUMNS.find((c) => c.id === t.col);
              const isOverdue = t.due && new Date(t.due) < new Date() && t.col !== "done";
              return (
                <div 
                  key={t.id} 
                  onClick={() => setSelectedTask(t)} 
                  className="grid grid-cols-[2.5fr_1.2fr_1.5fr_1.2fr_1.2fr_0.5fr] gap-4 px-8 py-4 items-center border-b border-white/5 hover:bg-white/5 transition-all cursor-pointer group table-row-hover"
                >
                  <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{t.title}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col?.color }} />
                    <span className="text-xs font-black uppercase tracking-tighter" style={{ color: col?.color }}>{col?.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Avatar member={member} size={24} />
                    <span className="text-xs font-bold text-muted-foreground">{member?.name || "Unassigned"}</span>
                  </div>
                  <PriorityBadge priority={t.priority} />
                  <div className={cn(
                    "flex items-center gap-2 text-xs font-bold",
                    isOverdue ? "text-rose-500" : "text-muted-foreground"
                  )}>
                    <Clock className="w-3.5 h-3.5 opacity-50" />
                    {t.due || "TBD"}
                  </div>
                  <button 
                    onClick={(e: any) => { 
                      e.stopPropagation(); 
                      const m = members.find((mx: any) => mx.id === t.assignee); 
                      setShowEmailNotif({ task: t, member: m }); 
                    }} 
                    className="p-2 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center"
                  >
                    <Mail className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              );
            })}
          </div>
          {filtered.length === 0 && (
            <div className="py-20 text-center space-y-4 opacity-30">
              <Search className="w-12 h-12 mx-auto" />
              <p className="text-sm font-black uppercase tracking-widest">No matching explorations found</p>
            </div>
          )}
        </div>
      )}

      {selectedTask && (
        <TaskModal 
          task={selectedTask} 
          members={members}
          onClose={() => setSelectedTask(null)} 
          onUpdate={handleUpdate} 
          onDelete={handleDelete} 
        />
      )}
      {showNew && (
        <NewTaskModal 
          members={members}
          onClose={() => setShowNew(false)} 
          onCreate={handleCreate} 
          defaultCol={newDefaultCol} 
        />
      )}
      {showEmailNotif && <EmailNotificationModal task={showEmailNotif.task} member={showEmailNotif.member} onClose={() => setShowEmailNotif(null)} />}
    </div>
  );
}
