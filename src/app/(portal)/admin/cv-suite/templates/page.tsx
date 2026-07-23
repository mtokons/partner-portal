import Link from "next/link";
import { Sparkles, ArrowRight, Check, FileText } from "lucide-react";

const TEMPLATE_CARDS = [
  {
    id: "berlin",
    name: "Berlin",
    category: "ATS-Friendly / Standard Corporate",
    desc: "Single-column layout with high ATS readability, clear chronological timelines, and subtle blue accent borders.",
    features: [
      "Optimized for automated resume parsers",
      "Traditional chronological experience flow",
      "Subtle left accent bar header",
      "2-Column skill rating indicators",
    ],
    recommendedFor: "Ausbildung, University Admissions & Corporate Roles",
    color: "from-blue-600 to-indigo-700",
  },
  {
    id: "zurich",
    name: "Zurich",
    category: "Modern Split-Column",
    desc: "Eye-catching dual column layout featuring a dark accent sidebar for contact information, skills, and languages.",
    features: [
      "High visual impact with dark sidebar",
      "Compact sidebar for skills & contact details",
      "Maximizes vertical space",
      "Ideal for multi-language candidates",
    ],
    recommendedFor: "Opportunity Card Applicants & Technical Specialists",
    color: "from-emerald-600 to-teal-700",
  },
  {
    id: "munich",
    name: "Munich",
    category: "Executive Minimalist",
    desc: "Sophisticated serif typography with centered executive header and elegant section dividers.",
    features: [
      "Refined serif font hierarchy",
      "Centered executive contact bar",
      "Clean horizontal divider lines",
      "Spacious reading flow",
    ],
    recommendedFor: "Senior Managers, Healthcare Experts & Consultants",
    color: "from-slate-700 to-slate-900",
  },
  {
    id: "vienna",
    name: "Vienna",
    category: "Creative Dual-Accent",
    desc: "Vibrant header banner styling with colored section badges and progress indicators.",
    features: [
      "Vibrant full-bleed header banner",
      "Colored section title badges",
      "Modern skill level indicators",
      "Distinct visual hierarchy",
    ],
    recommendedFor: "Designers, Marketers & Creative Professionals",
    color: "from-violet-600 to-purple-700",
  },
];

export default function TemplatesPage() {
  return (
    <div className="space-y-6">
      {/* Starting Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/90 to-primary p-8 text-primary-foreground shadow-lg">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5" /> Premium Template Collection
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Choose Your CV Template</h2>
          <p className="text-sm opacity-90 leading-relaxed">
            Market-tested resume templates designed specifically for German VET, Ausbildung, Opportunity Card, and international job market applications.
          </p>
        </div>
      </div>

      {/* Grid of Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {TEMPLATE_CARDS.map((tpl) => (
          <div
            key={tpl.id}
            className="group relative bg-card rounded-2xl border p-6 flex flex-col justify-between hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            <div className="space-y-4">
              {/* Card Banner */}
              <div className={`h-24 rounded-xl bg-gradient-to-r ${tpl.color} p-4 text-white flex flex-col justify-between shadow-inner`}>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">
                  {tpl.category}
                </span>
                <h3 className="text-xl font-bold">{tpl.name} Template</h3>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">{tpl.desc}</p>

              {/* Feature Checklist */}
              <div className="space-y-2 pt-2 border-t">
                {tpl.features.map((feat) => (
                  <div key={feat} className="flex items-center gap-2 text-xs text-foreground">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              <div className="p-2.5 rounded-lg bg-muted/40 text-[11px] text-muted-foreground font-medium">
                🎯 <strong className="text-foreground">Recommended for:</strong> {tpl.recommendedFor}
              </div>
            </div>

            {/* Action */}
            <div className="pt-6">
              <Link
                href={`/admin/cv-suite/builder`}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
              >
                Use {tpl.name} Template <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
