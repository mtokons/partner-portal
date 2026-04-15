"use client";
import { useState, useRef, useEffect } from "react";

const MEMBERS = [
  { id: "m1", name: "Sara Ahmed", initials: "SA", color: "#185FA5" },
  { id: "m2", name: "Tom Wei", initials: "TW", color: "#0F6E56" },
  { id: "m3", name: "Priya Nair", initials: "PN", color: "#993C1D" },
  { id: "m4", name: "Leo Müller", initials: "LM", color: "#534AB7" },
  { id: "m5", name: "Hana Yilmaz", initials: "HY", color: "#993556" },
];

const PRIORITIES = ["Low", "Medium", "High", "Critical"];
const PRIORITY_COLORS = {
  Low: { bg: "#EAF3DE", text: "#3B6D11", border: "#639922" },
  Medium: { bg: "#FAEEDA", text: "#854F0B", border: "#EF9F27" },
  High: { bg: "#FAECE7", text: "#993C1D", border: "#D85A30" },
  Critical: { bg: "#FCEBEB", text: "#A32D2D", border: "#E24B4A" },
};

const COLUMNS = [
  { id: "backlog", label: "Backlog", color: "#888780" },
  { id: "todo", label: "To Do", color: "#378ADD" },
  { id: "inprogress", label: "In Progress", color: "#EF9F27" },
  { id: "review", label: "In Review", color: "#534AB7" },
  { id: "done", label: "Done", color: "#1D9E75" },
];

const TAGS = ["Frontend", "Backend", "Design", "QA", "DevOps", "Docs", "Bug", "Feature"];

const initTasks = [
  { id: "t1", title: "Design new onboarding flow", desc: "Revamp the user onboarding screens based on research findings.", col: "inprogress", assignee: "m1", priority: "High", due: "2026-04-20", tags: ["Design"], comments: [{ author: "Tom Wei", text: "Mockups look great so far!", ts: "Apr 12" }], created: "Apr 10" },
  { id: "t2", title: "Set up CI/CD pipeline", desc: "Configure GitHub Actions for staging and production deploys.", col: "todo", assignee: "m2", priority: "Critical", due: "2026-04-18", tags: ["DevOps"], comments: [], created: "Apr 11" },
  { id: "t3", title: "Fix login redirect bug", desc: "Users are being redirected to 404 after OAuth login on mobile.", col: "review", assignee: "m3", priority: "Critical", due: "2026-04-16", tags: ["Bug", "Frontend"], comments: [{ author: "Leo Müller", text: "Reproduced on iOS 17.", ts: "Apr 13" }], created: "Apr 09" },
  { id: "t4", title: "Write API docs", desc: "Document all REST endpoints including auth, users, and billing.", col: "backlog", assignee: "m4", priority: "Low", due: "2026-04-30", tags: ["Docs", "Backend"], comments: [], created: "Apr 08" },
  { id: "t5", title: "Dashboard analytics widgets", desc: "Build chart components for revenue, DAU, and churn metrics.", col: "inprogress", assignee: "m5", priority: "Medium", due: "2026-04-22", tags: ["Frontend", "Feature"], comments: [], created: "Apr 10" },
  { id: "t6", title: "Database query optimization", desc: "Profile and optimize slow queries in the reporting module.", col: "todo", assignee: "m2", priority: "High", due: "2026-04-19", tags: ["Backend"], comments: [], created: "Apr 12" },
  { id: "t7", title: "Accessibility audit", desc: "Run WCAG 2.1 AA audit and fix critical issues.", col: "backlog", assignee: "m1", priority: "Medium", due: "2026-05-01", tags: ["QA"], comments: [], created: "Apr 07" },
  { id: "t8", title: "User permissions system", desc: "Implement role-based access control for admin, editor, viewer.", col: "done", assignee: "m4", priority: "High", due: "2026-04-14", tags: ["Backend", "Feature"], comments: [{ author: "Sara Ahmed", text: "Tested and approved!", ts: "Apr 14" }], created: "Apr 05" },
];

function Avatar({ member, size = 28 }) {
  if (!member) return <div style={{ width: size, height: size, borderRadius: "50%", background: "#D3D1C7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38, color: "#5F5E5A", fontWeight: 500, flexShrink: 0 }}>?</div>;
  return <div title={member.name} style={{ width: size, height: size, borderRadius: "50%", background: member.color + "22", border: `1.5px solid ${member.color}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.36, color: member.color, fontWeight: 500, flexShrink: 0, cursor: "default" }}>{member.initials}</div>;
}

function PriorityBadge({ priority }) {
  const c = PRIORITY_COLORS[priority] || {};
  return <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 7px", borderRadius: 4, background: c.bg, color: c.text, border: `1px solid ${c.border}`, whiteSpace: "nowrap" }}>{priority}</span>;
}

function TagBadge({ tag }) {
  return <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "var(--color-background-secondary)", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)", whiteSpace: "nowrap" }}>{tag}</span>;
}

function EmailNotificationModal({ task, member, onClose }) {
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
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={onClose}>
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: 12, padding: "1.5rem", width: 460, maxWidth: "90vw", position: "relative" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontWeight: 500, fontSize: 15 }}>Send email notification</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--color-text-secondary)", padding: "0 4px" }}>×</button>
        </div>
        {sent ? (
          <div style={{ textAlign: "center", padding: "2rem 0" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
            <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>Email sent to <strong>{member?.name}</strong></p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>To</label>
              <div style={{ fontSize: 14, padding: "8px 10px", borderRadius: 6, background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)" }}>{member?.name} &lt;{member?.name.toLowerCase().replace(" ", ".")}@company.com&gt;</div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Subject</label>
              <div style={{ fontSize: 14, padding: "8px 10px", borderRadius: 6, background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)" }}>New task assigned: {task?.title}</div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Message</label>
              <textarea value={preview} onChange={(e) => setPreview(e.target.value)} rows={8} style={{ width: "100%", fontSize: 13, fontFamily: "var(--font-mono)", padding: "8px 10px", borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", resize: "vertical", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "none", cursor: "pointer", fontSize: 13, color: "var(--color-text-secondary)" }}>Cancel</button>
              <button onClick={handleSend} disabled={loading} style={{ padding: "8px 16px", borderRadius: 6, border: "0.5px solid #185FA5", background: "#185FA5", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 500, opacity: loading ? 0.7 : 1 }}>{loading ? "Sending…" : "Send email"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TaskModal({ task, onClose, onUpdate, onDelete }) {
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

  const member = MEMBERS.find((m) => m.id === editAssignee);

  const save = () => {
    onUpdate({ ...task, title: editTitle, desc: editDesc, assignee: editAssignee, priority: editPriority, due: editDue, tags: editTags, col: editCol, comments });
    onClose();
  };

  const addComment = () => {
    if (!newComment.trim()) return;
    const c = { author: "You", text: newComment.trim(), ts: "Just now" };
    setComments((prev) => [...prev, c]);
    setNewComment("");
  };

  const toggleTag = (t) => setEditTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 900, overflowY: "auto", padding: "2rem 1rem" }} onClick={onClose}>
      <div style={{ background: "var(--color-background-primary)", borderRadius: 12, border: "0.5px solid var(--color-border-secondary)", width: 640, maxWidth: "100%", position: "relative" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)" }}>{task.id.toUpperCase()}</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowEmail(true)} style={{ padding: "5px 12px", borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "none", cursor: "pointer", fontSize: 12, color: "var(--color-text-secondary)" }}>✉ Notify</button>
            <button onClick={() => { onDelete(task.id); onClose(); }} style={{ padding: "5px 12px", borderRadius: 6, border: "0.5px solid #E24B4A44", background: "none", cursor: "pointer", fontSize: 12, color: "#A32D2D" }}>Delete</button>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--color-text-secondary)", lineHeight: 1 }}>×</button>
          </div>
        </div>
        <div style={{ padding: "1.5rem", display: "grid", gridTemplateColumns: "1fr 220px", gap: "1.5rem" }}>
          <div>
            <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} style={{ width: "100%", fontSize: 18, fontWeight: 500, border: "none", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "none", color: "var(--color-text-primary)", padding: "4px 0 8px", marginBottom: 12, outline: "none", boxSizing: "border-box" }} />
            <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Description</label>
            <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={4} style={{ width: "100%", fontSize: 13, border: "0.5px solid var(--color-border-secondary)", borderRadius: 6, background: "var(--color-background-secondary)", color: "var(--color-text-primary)", padding: "8px 10px", resize: "vertical", boxSizing: "border-box", marginBottom: 16 }} />
            <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>Tags</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
              {TAGS.map((t) => (
                <span key={t} onClick={() => toggleTag(t)} style={{ fontSize: 12, padding: "3px 8px", borderRadius: 4, cursor: "pointer", background: editTags.includes(t) ? "#E6F1FB" : "var(--color-background-secondary)", color: editTags.includes(t) ? "#185FA5" : "var(--color-text-secondary)", border: editTags.includes(t) ? "1px solid #185FA555" : "0.5px solid var(--color-border-secondary)", userSelect: "none" }}>{t}</span>
              ))}
            </div>
            <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 16 }}>
              <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 10 }}>Comments ({comments.length})</label>
              {comments.map((c, i) => (
                <div key={i} style={{ marginBottom: 10, padding: "8px 10px", borderRadius: 6, background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{c.author}</span>
                    <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{c.ts}</span>
                  </div>
                  <p style={{ fontSize: 13, margin: 0 }}>{c.text}</p>
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <input value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addComment()} placeholder="Add comment…" style={{ flex: 1, fontSize: 13, padding: "7px 10px", borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)" }} />
                <button onClick={addComment} style={{ padding: "7px 14px", borderRadius: 6, border: "0.5px solid #185FA5", background: "#185FA5", color: "#fff", cursor: "pointer", fontSize: 13 }}>Add</button>
              </div>
            </div>
          </div>
          <div style={{ fontSize: 13 }}>
            {[
              ["Status", <select value={editCol} onChange={(e) => setEditCol(e.target.value)} style={{ width: "100%", fontSize: 13, padding: "6px 8px", borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)" }}>{COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>],
              ["Assignee", <select value={editAssignee} onChange={(e) => setEditAssignee(e.target.value)} style={{ width: "100%", fontSize: 13, padding: "6px 8px", borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)" }}><option value="">Unassigned</option>{MEMBERS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>],
              ["Priority", <select value={editPriority} onChange={(e) => setEditPriority(e.target.value)} style={{ width: "100%", fontSize: 13, padding: "6px 8px", borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)" }}>{PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}</select>],
              ["Due date", <input type="date" value={editDue} onChange={(e) => setEditDue(e.target.value)} style={{ width: "100%", fontSize: 13, padding: "6px 8px", borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", boxSizing: "border-box" }} />],
            ].map(([label, ctrl]) => (
              <div key={label as string} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>{label as string}</label>
                {ctrl}
              </div>
            ))}
            {member && (
              <div style={{ marginTop: 16, padding: "10px", borderRadius: 8, background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Avatar member={member} size={32} />
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{member.name}</p>
                    <p style={{ margin: 0, fontSize: 11, color: "var(--color-text-secondary)" }}>{member.name.toLowerCase().replace(" ", ".")}@company.com</p>
                  </div>
                </div>
                <button onClick={() => setShowEmail(true)} style={{ width: "100%", marginTop: 10, padding: "6px 0", borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "none", cursor: "pointer", fontSize: 12, color: "var(--color-text-secondary)" }}>✉ Send email notification</button>
              </div>
            )}
            <p style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 16 }}>Created {task.created}</p>
          </div>
        </div>
        <div style={{ padding: "1rem 1.5rem", borderTop: "0.5px solid var(--color-border-tertiary)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onClose} style={{ padding: "7px 16px", borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "none", cursor: "pointer", fontSize: 13, color: "var(--color-text-secondary)" }}>Cancel</button>
          <button onClick={save} style={{ padding: "7px 16px", borderRadius: 6, border: "0.5px solid #185FA5", background: "#185FA5", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>Save changes</button>
        </div>
      </div>
      {showEmail && <EmailNotificationModal task={task} member={member} onClose={() => setShowEmail(false)} />}
    </div>
  );
}

function NewTaskModal({ onClose, onCreate, defaultCol }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [assignee, setAssignee] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [due, setDue] = useState("");
  const [col, setCol] = useState(defaultCol || "backlog");
  const [tags, setTags] = useState([]);

  const create = () => {
    if (!title.trim()) return;
    onCreate({ id: "t" + Date.now(), title: title.trim(), desc, assignee, priority, due, col, tags, comments: [], created: "Today" });
    onClose();
  };
  const toggleTag = (t) => setTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 900 }} onClick={onClose}>
      <div style={{ background: "var(--color-background-primary)", borderRadius: 12, border: "0.5px solid var(--color-border-secondary)", width: 520, maxWidth: "90vw", padding: "1.5rem" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <span style={{ fontWeight: 500, fontSize: 15 }}>Create new task</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--color-text-secondary)" }}>×</button>
        </div>
        {[
          ["Title *", <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title…" style={{ width: "100%", fontSize: 14, padding: "8px 10px", borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", boxSizing: "border-box" }} />],
          ["Description", <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} placeholder="Describe the task…" style={{ width: "100%", fontSize: 13, padding: "8px 10px", borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", resize: "vertical", boxSizing: "border-box" }} />],
          ["Status", <select value={col} onChange={(e) => setCol(e.target.value)} style={{ width: "100%", fontSize: 13, padding: "7px 8px", borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)" }}>{COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>],
          ["Assignee", <select value={assignee} onChange={(e) => setAssignee(e.target.value)} style={{ width: "100%", fontSize: 13, padding: "7px 8px", borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)" }}><option value="">Unassigned</option>{MEMBERS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>],
          ["Priority", <select value={priority} onChange={(e) => setPriority(e.target.value)} style={{ width: "100%", fontSize: 13, padding: "7px 8px", borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)" }}>{PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}</select>],
          ["Due date", <input type="date" value={due} onChange={(e) => setDue(e.target.value)} style={{ width: "100%", fontSize: 13, padding: "7px 8px", borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", boxSizing: "border-box" }} />],
        ].map(([label, ctrl]) => (
          <div key={label as string} style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>{label as string}</label>
            {ctrl}
          </div>
        ))}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>Tags</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {TAGS.map((t) => <span key={t} onClick={() => toggleTag(t)} style={{ fontSize: 12, padding: "3px 8px", borderRadius: 4, cursor: "pointer", background: tags.includes(t) ? "#E6F1FB" : "var(--color-background-secondary)", color: tags.includes(t) ? "#185FA5" : "var(--color-text-secondary)", border: tags.includes(t) ? "1px solid #185FA555" : "0.5px solid var(--color-border-secondary)", userSelect: "none" }}>{t}</span>)}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onClose} style={{ padding: "7px 16px", borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "none", cursor: "pointer", fontSize: 13, color: "var(--color-text-secondary)" }}>Cancel</button>
          <button onClick={create} style={{ padding: "7px 16px", borderRadius: 6, border: "0.5px solid #185FA5", background: "#185FA5", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>Create task</button>
        </div>
      </div>
    </div>
  );
}

function TaskCard({ task, onClick, onDragStart, onDragEnd }) {
  const member = MEMBERS.find((m) => m.id === task.assignee);
  const isOverdue = task.due && new Date(task.due) < new Date() && task.col !== "done";
  return (
    <div draggable onDragStart={(e) => { e.dataTransfer.setData("taskId", task.id); onDragStart(task.id); }} onDragEnd={onDragEnd} onClick={onClick}
      style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, padding: "12px", marginBottom: 8, cursor: "grab", userSelect: "none", transition: "box-shadow 0.15s", position: "relative" }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--color-border-secondary)"}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--color-border-tertiary)"}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6, gap: 8 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, lineHeight: 1.4, color: "var(--color-text-primary)", flex: 1 }}>{task.title}</p>
        <PriorityBadge priority={task.priority} />
      </div>
      {task.desc && <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{task.desc}</p>}
      {task.tags?.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>{task.tags.map((t) => <TagBadge key={t} tag={t} />)}</div>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Avatar member={member} size={22} />
          {task.comments?.length > 0 && <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>💬 {task.comments.length}</span>}
        </div>
        {task.due && <span style={{ fontSize: 11, color: isOverdue ? "#A32D2D" : "var(--color-text-secondary)", fontWeight: isOverdue ? 500 : 400 }}>{isOverdue ? "⚠ " : ""}{task.due}</span>}
      </div>
    </div>
  );
}

function Column({ col, tasks, onCardClick, onDrop, onDragOver, onDragLeave, isDragOver, onAddTask, draggingId }) {
  return (
    <div style={{ minWidth: 240, width: 260, flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, padding: "0 2px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: col.color, flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{col.label}</span>
          <span style={{ fontSize: 12, color: "var(--color-text-secondary)", background: "var(--color-background-secondary)", padding: "1px 7px", borderRadius: 10, border: "0.5px solid var(--color-border-tertiary)" }}>{tasks.length}</span>
        </div>
        <button onClick={onAddTask} title="Add task" style={{ background: "none", border: "0.5px solid var(--color-border-secondary)", borderRadius: 4, width: 22, height: 22, cursor: "pointer", fontSize: 14, color: "var(--color-text-secondary)", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>+</button>
      </div>
      <div onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave} style={{ minHeight: 120, borderRadius: 8, padding: "4px", transition: "background 0.15s", background: isDragOver ? col.color + "11" : "transparent", border: isDragOver ? `1.5px dashed ${col.color}55` : "1.5px dashed transparent" }}>
        {tasks.map((t) => <TaskCard key={t.id} task={t} onClick={() => onCardClick(t)} onDragStart={() => {}} onDragEnd={() => {}} />)}
        {tasks.length === 0 && <div style={{ textAlign: "center", padding: "24px 0", fontSize: 12, color: "var(--color-text-secondary)" }}>No tasks</div>}
      </div>
    </div>
  );
}

function StatsBar({ tasks }) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.col === "done").length;
  const overdue = tasks.filter((t) => t.due && new Date(t.due) < new Date() && t.col !== "done").length;
  const inprog = tasks.filter((t) => t.col === "inprogress").length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
      {[
        ["Total tasks", total, "#888780"],
        ["Completed", done, "#1D9E75"],
        ["In progress", inprog, "#EF9F27"],
        ["Overdue", overdue, "#E24B4A"],
        ["Progress", pct + "%", "#185FA5"],
      ].map(([label, val, color]) => (
        <div key={label as string} style={{ background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, padding: "10px 16px", minWidth: 100 }}>
          <p style={{ margin: "0 0 2px", fontSize: 11, color: "var(--color-text-secondary)" }}>{label as string}</p>
          <p style={{ margin: 0, fontSize: 20, fontWeight: 500, color: color as string }}>{val as string | number}</p>
        </div>
      ))}
    </div>
  );
}

export default function TaskBoard() {
  const [tasks, setTasks] = useState(initTasks);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [newDefaultCol, setNewDefaultCol] = useState("backlog");
  const [dragOverCol, setDragOverCol] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [filterMember, setFilterMember] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [view, setView] = useState("board");
  const [showEmailNotif, setShowEmailNotif] = useState<{task: any; member: any} | null>(null);

  const filtered = tasks.filter((t) => {
    if (filterMember && t.assignee !== filterMember) return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    if (searchQ && !t.title.toLowerCase().includes(searchQ.toLowerCase())) return false;
    return true;
  });

  const handleDrop = (colId, e) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (taskId) setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, col: colId } : t));
    setDragOverCol(null);
    setDraggingId(null);
  };

  const handleUpdate = (updated) => setTasks((prev) => prev.map((t) => t.id === updated.id ? updated : t));
  const handleDelete = (id) => setTasks((prev) => prev.filter((t) => t.id !== id));
  const handleCreate = (task) => setTasks((prev) => [...prev, task]);

  return (
    <div style={{ fontFamily: "var(--font-sans)", padding: "0 0 2rem" }}>
      <h2 className="sr-only">Task board — project management view</h2>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 500 }}>Task board</h2>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--color-text-secondary)" }}>Manage and track team tasks</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", border: "0.5px solid var(--color-border-secondary)", borderRadius: 6, overflow: "hidden" }}>
            {["board", "list"].map((v) => <button key={v} onClick={() => setView(v)} style={{ padding: "6px 14px", border: "none", background: view === v ? "var(--color-background-secondary)" : "none", cursor: "pointer", fontSize: 12, color: view === v ? "var(--color-text-primary)" : "var(--color-text-secondary)", fontWeight: view === v ? 500 : 400 }}>{v === "board" ? "⬜ Board" : "☰ List"}</button>)}
          </div>
          <button onClick={() => { setNewDefaultCol("backlog"); setShowNew(true); }} style={{ padding: "7px 14px", borderRadius: 6, border: "0.5px solid #185FA5", background: "#185FA5", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>+ New task</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="Search tasks…" style={{ fontSize: 13, padding: "6px 10px", borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", width: 180 }} />
        <select value={filterMember} onChange={(e) => setFilterMember(e.target.value)} style={{ fontSize: 13, padding: "6px 8px", borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)" }}>
          <option value="">All members</option>
          {MEMBERS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} style={{ fontSize: 13, padding: "6px 8px", borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)" }}>
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        {(filterMember || filterPriority || searchQ) && <button onClick={() => { setFilterMember(""); setFilterPriority(""); setSearchQ(""); }} style={{ fontSize: 12, padding: "6px 10px", borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "none", cursor: "pointer", color: "var(--color-text-secondary)" }}>Clear filters</button>}
      </div>

      <StatsBar tasks={filtered} />

      {view === "board" ? (
        <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 16 }}>
          {COLUMNS.map((col) => (
            <Column key={col.id} col={col}
              tasks={filtered.filter((t) => t.col === col.id)}
              onCardClick={(t) => setSelectedTask(t)}
              onDrop={(e) => handleDrop(col.id, e)}
              onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.id); }}
              onDragLeave={() => setDragOverCol(null)}
              isDragOver={dragOverCol === col.id}
              onAddTask={() => { setNewDefaultCol(col.id); setShowNew(true); }}
              draggingId={draggingId}
            />
          ))}
        </div>
      ) : (
        <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 120px 120px 120px 100px 80px", gap: 0, background: "var(--color-background-secondary)", padding: "8px 16px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
            {["Task", "Status", "Assignee", "Priority", "Due date", ""].map((h) => <span key={h} style={{ fontSize: 11, color: "var(--color-text-secondary)", fontWeight: 500 }}>{h}</span>)}
          </div>
          {filtered.map((t, i) => {
            const member = MEMBERS.find((m) => m.id === t.assignee);
            const col = COLUMNS.find((c) => c.id === t.col);
            const isOverdue = t.due && new Date(t.due) < new Date() && t.col !== "done";
            return (
              <div key={t.id} onClick={() => setSelectedTask(t)} style={{ display: "grid", gridTemplateColumns: "2fr 120px 120px 120px 100px 80px", gap: 0, padding: "10px 16px", borderBottom: i < filtered.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none", cursor: "pointer", alignItems: "center", background: "var(--color-background-primary)", transition: "background 0.1s" }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-background-secondary)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "var(--color-background-primary)"}
              >
                <span style={{ fontSize: 13, fontWeight: 500 }}>{t.title}</span>
                <span style={{ fontSize: 12, color: col?.color, fontWeight: 500 }}>{col?.label}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Avatar member={member} size={20} /><span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{member?.name.split(" ")[0]}</span></div>
                <PriorityBadge priority={t.priority} />
                <span style={{ fontSize: 12, color: isOverdue ? "#A32D2D" : "var(--color-text-secondary)", fontWeight: isOverdue ? 500 : 400 }}>{t.due || "—"}</span>
                <button onClick={(e) => { e.stopPropagation(); const m = MEMBERS.find((m) => m.id === t.assignee); setShowEmailNotif({ task: t, member: m }); }} style={{ fontSize: 11, padding: "4px 8px", border: "0.5px solid var(--color-border-secondary)", background: "none", borderRadius: 4, cursor: "pointer", color: "var(--color-text-secondary)" }}>✉</button>
              </div>
            );
          })}
          {filtered.length === 0 && <div style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>No tasks match filters</div>}
        </div>
      )}

      {selectedTask && <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)} onUpdate={handleUpdate} onDelete={handleDelete} />}
      {showNew && <NewTaskModal onClose={() => setShowNew(false)} onCreate={handleCreate} defaultCol={newDefaultCol} />}
      {showEmailNotif && <EmailNotificationModal task={showEmailNotif.task} member={showEmailNotif.member} onClose={() => setShowEmailNotif(null)} />}
    </div>
  );
}
