"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ClipboardCheck,
  Headphones,
  BookOpen,
  PenLine,
  MessageSquare,
  SpellCheck,
  Wand2,
  CircleCheck,
  CircleAlert,
} from "lucide-react";

type Level = "A1" | "A2" | "B1" | "B2";

interface SkillTile {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hint: string;
}

const LEVELS: { level: Level; tone: string; ring: string }[] = [
  { level: "A1", tone: "bg-lime-100 text-lime-900", ring: "ring-lime-300" },
  { level: "A2", tone: "bg-lime-200 text-lime-950", ring: "ring-lime-400" },
  { level: "B1", tone: "bg-amber-100 text-amber-900", ring: "ring-amber-300" },
  { level: "B2", tone: "bg-amber-300 text-amber-950", ring: "ring-amber-500" },
];

const SKILLS: SkillTile[] = [
  { key: "hoeren", label: "Hören", icon: Headphones, hint: "Listening comprehension" },
  { key: "lesen", label: "Lesen", icon: BookOpen, hint: "Reading passages & matching" },
  { key: "schreiben", label: "Schreiben", icon: PenLine, hint: "Guided writing tasks" },
  { key: "sprechen", label: "Sprechen", icon: MessageSquare, hint: "Oral profile & planning" },
  { key: "grammatik", label: "Sprachbausteine", icon: SpellCheck, hint: "Cloze & grammar gaps" },
];

export default function ModelTestsClient({
  serviceStatus,
  variant = "admin",
}: {
  serviceStatus?: "ok" | "unavailable";
  variant?: "admin" | "student";
}) {
  const [level, setLevel] = useState<Level>("A2");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
            <ClipboardCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Model Test Learning System</h1>
            <p className="text-sm text-muted-foreground">
              Online-Vorbereitung auf die telc Deutsch Prüfung
            </p>
          </div>
        </div>

        {serviceStatus === "ok" ? (
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
            <CircleCheck className="h-3.5 w-3.5" /> Builder service online
          </span>
        ) : variant === "admin" ? (
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
            <CircleAlert className="h-3.5 w-3.5" /> Builder service offline — start the model-test service to author tests
          </span>
        ) : null}
      </div>

      {/* Level selector */}
      <section className="space-y-4">
        <h2 className="text-center text-lg font-semibold">
          Wähle dein <span className="text-primary">Niveau</span> der Deutsch-Prüfung
        </h2>
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-4 md:grid-cols-4">
          {LEVELS.map(({ level: lv, tone, ring }) => (
            <button
              key={lv}
              type="button"
              onClick={() => setLevel(lv)}
              aria-pressed={level === lv}
              className={`flex h-28 items-center justify-center rounded-2xl text-4xl font-black shadow-sm transition ${tone} ${
                level === lv ? `ring-4 ${ring} scale-[1.02]` : "opacity-90 hover:opacity-100"
              }`}
            >
              {lv}
            </button>
          ))}
        </div>
        <p className="text-center text-sm text-muted-foreground">
          Ausgewählt: <span className="font-semibold text-foreground">telc Deutsch {level}</span>
        </p>
      </section>

      {/* Skill tiles */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Prüfungsteile</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {SKILLS.map(({ key, label, icon: Icon, hint }) => (
            <div
              key={key}
              className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-6 text-center shadow-sm transition hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-bold">{label}</p>
                <p className="text-[11px] text-muted-foreground">{hint}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      {variant === "admin" && (
        <section className="flex flex-col items-start gap-3 rounded-2xl border bg-muted/30 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Neuen Modelltest erstellen</h3>
            <p className="text-sm text-muted-foreground">
              Baue einen telc Deutsch {level} Modelltest in vier Schritten: Ingest → Struktur → Prüfen → Export.
            </p>
          </div>
          <Link
            href="/admin/school/model-tests/builder"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            <Wand2 className="h-4 w-4" /> Test Builder öffnen
          </Link>
        </section>
      )}
    </div>
  );
}
