"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Euro,
  GraduationCap,
  Layers,
  Pencil,
  Plus,
  Trash2,
  Users,
  X,
  Search,
} from "lucide-react";
import type { CourseLevel, SchoolCourse } from "@/types";
import { createCourseAction, deleteCourseAction, updateCourseAction } from "../actions";

interface CoursesClientProps {
  initialCourses: SchoolCourse[];
}

const DEFAULT_LEVELS = [
  { level: "A1", name: "🇩🇪 A1 German — Beginner Level", desc: "Foundational grammar, vocabulary, pronunciation and everyday conversational basics." },
  { level: "A2", name: "🇩🇪 A2 German — Elementary Level", desc: "Sentence structure expansion, routine communication, past tense, and social topics." },
  { level: "B1", name: "🇩🇪 B1 German — Intermediate Level", desc: "Workplace & vocational communication, complex clauses, and independent conversation." },
  { level: "B2", name: "🇩🇪 B2 German — Upper Intermediate", desc: "Professional German, technical discourse, argumentation, and specialized vocational vocabulary." },
  { level: "C1", name: "🇩🇪 C1 German — Advanced Level", desc: "Academic and high-level professional fluency, complex writing, and nuanced conversation." },
];

export default function CoursesClient({ initialCourses }: CoursesClientProps) {
  const [courses, setCourses] = useState(initialCourses);
  const [selectedLevel, setSelectedLevel] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [editingCourse, setEditingCourse] = useState<SchoolCourse | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredCourses = courses.filter((c) => {
    const matchLevel = selectedLevel === "ALL" || (c.level || "").toUpperCase() === selectedLevel;
    const matchSearch =
      !search ||
      c.courseName.toLowerCase().includes(search.toLowerCase()) ||
      c.courseCode.toLowerCase().includes(search.toLowerCase());
    return matchLevel && matchSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto page-enter pb-10">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#0F4C81] uppercase tracking-wider mb-1">
            <BookOpen className="w-4 h-4" /> Language School CRM
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground">German Language Courses</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage CEFR German training curriculum, course fees, and level parameters.
          </p>
        </div>

        <button
          onClick={() => { setError(null); setShowAddModal(true); }}
          className="flex items-center gap-2 bg-[#0F4C81] hover:bg-[#0D3F6D] text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add German Course
        </button>
      </div>

      {/* ── Filters & Search ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {["ALL", "A1", "A2", "B1", "B2", "C1"].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setSelectedLevel(lvl)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedLevel === lvl
                  ? "bg-[#0F4C81] text-white shadow-sm"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {lvl === "ALL" ? "All Levels" : `🇩🇪 ${lvl}`}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search courses..."
            className="w-full h-9 pl-9 pr-3 rounded-xl border bg-background text-xs"
          />
        </div>
      </div>

      {/* ── Course Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCourses.map((c) => (
          <div
            key={c.id}
            className="bg-card border border-border/80 hover:border-[#0F4C81]/50 rounded-3xl p-5 shadow-sm space-y-4 transition-all group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-[#0F4C81]/10 text-[#0F4C81] border border-[#0F4C81]/20">
                  {c.level ? `🇩🇪 ${c.level} German` : c.courseCode}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  c.status === "published" ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"
                }`}>
                  {c.status === "published" ? "ACTIVE" : "INACTIVE"}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-base text-foreground leading-tight">{c.courseName}</h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="w-3.5 h-3.5 text-[#0F4C81]" />
                  <span>{c.totalDurationWeeks || 8} Wks · {c.totalSessions || 24} Sess</span>
                </div>
                <div className="flex items-center gap-1.5 font-black text-foreground">
                  <Euro className="w-3.5 h-3.5 text-emerald-600" />
                  <span>€{c.courseFee} Fee</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border/60">
              <Link
                href="/sccg/school/batches"
                className="text-xs font-bold text-[#0F4C81] hover:underline flex items-center gap-1"
              >
                <Layers className="w-3.5 h-3.5" /> View Batches
              </Link>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setError(null); setEditingCourse(c); }}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Edit Course"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={async () => {
                    if (confirm(`Delete course ${c.courseName}?`)) {
                      await deleteCourseAction(c.id);
                      setCourses((prev) => prev.filter((item) => item.id !== c.id));
                    }
                  }}
                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-600 transition-colors"
                  title="Delete Course"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredCourses.length === 0 && (
        <div className="py-16 text-center bg-card border border-dashed rounded-3xl p-8">
          <BookOpen className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-base font-bold text-foreground">No German Courses Found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Click &quot;Add German Course&quot; to initialize CEFR courses A1 through C1.
          </p>
        </div>
      )}

      {/* ── Modal: Add / Edit Course ── */}
      {(showAddModal || editingCourse) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#0F4C81]" />
                {editingCourse ? "Edit German Course" : "Add German Language Course"}
              </h3>
              <button
                onClick={() => { setShowAddModal(false); setEditingCourse(null); }}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {error && <div className="p-3 text-xs bg-red-500/15 text-red-600 rounded-xl">{error}</div>}

            <form
              action={async (fd) => {
                setLoading(true);
                setError(null);
                try {
                  if (editingCourse) {
                    await updateCourseAction(editingCourse.id, fd);
                  } else {
                    await createCourseAction(fd);
                  }
                  setShowAddModal(false);
                  setEditingCourse(null);
                  window.location.reload();
                } catch (err: any) {
                  setError(err.message || "Failed to save course");
                } finally {
                  setLoading(false);
                }
              }}
              className="space-y-3 text-sm"
            >
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Course Name *</label>
                <input
                  required
                  name="courseName"
                  defaultValue={editingCourse?.courseName || "German A1 Beginner Intensive"}
                  className="w-full h-10 px-3 rounded-xl border bg-background"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Course Code *</label>
                  <input
                    required
                    name="courseCode"
                    defaultValue={editingCourse?.courseCode || "GER-A1"}
                    className="w-full h-10 px-3 rounded-xl border bg-background uppercase font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">CEFR Level *</label>
                  <select
                    name="level"
                    defaultValue={editingCourse?.level || "A1"}
                    className="w-full h-10 px-3 rounded-xl border bg-background font-bold"
                  >
                    <option value="A1">🇩🇪 A1 German</option>
                    <option value="A2">🇩🇪 A2 German</option>
                    <option value="B1">🇩🇪 B1 German</option>
                    <option value="B2">🇩🇪 B2 German</option>
                    <option value="C1">🇩🇪 C1 German</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Course Fee (€) *</label>
                  <input
                    required
                    name="courseFee"
                    type="number"
                    defaultValue={editingCourse?.courseFee || 500}
                    className="w-full h-10 px-3 rounded-xl border bg-background font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Duration (Wks)</label>
                  <input
                    name="totalDurationWeeks"
                    type="number"
                    defaultValue={editingCourse?.totalDurationWeeks || 8}
                    className="w-full h-10 px-3 rounded-xl border bg-background"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Total Sessions</label>
                  <input
                    name="totalSessions"
                    type="number"
                    defaultValue={editingCourse?.totalSessions || 24}
                    className="w-full h-10 px-3 rounded-xl border bg-background"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Status</label>
                <select
                  name="status"
                  defaultValue={editingCourse?.status || "published"}
                  className="w-full h-10 px-3 rounded-xl border bg-background"
                >
                  <option value="published">Active / Published</option>
                  <option value="draft">Inactive / Draft</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Description</label>
                <textarea
                  name="description"
                  rows={2}
                  defaultValue={editingCourse?.description || ""}
                  placeholder="Curriculum overview and target learning outcomes..."
                  className="w-full p-2.5 rounded-xl border bg-background text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setEditingCourse(null); }}
                  className="w-1/2 h-10 rounded-xl border font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-1/2 h-10 rounded-xl bg-[#0F4C81] text-white font-bold text-xs hover:bg-[#0D3F6D] transition-colors"
                >
                  {loading ? "Saving..." : editingCourse ? "Update Course" : "Save Course"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
