import type { ProjectStaffingEntry } from "@/types";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  standby: "bg-amber-100 text-amber-700",
  unavailable: "bg-gray-200 text-gray-600",
};
const STATUS_LABEL: Record<string, string> = { active: "Active", standby: "Standby", unavailable: "Unavailable" };

export default function StaffingMatrixTable({ rows }: { rows: ProjectStaffingEntry[] }) {
  if (rows.length === 0) {
    return <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No staffing entries yet.</p>;
  }

  // Group consecutive rows by Work Package so the WP/Focus cells merge vertically.
  const groups: { wp: string; focus: string; items: ProjectStaffingEntry[] }[] = [];
  for (const r of rows) {
    const wp = r.workPackage || "—";
    const last = groups[groups.length - 1];
    if (last && last.wp === wp) last.items.push(r);
    else groups.push({ wp, focus: r.focusObjective || "", items: [r] });
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[1100px] border-collapse text-xs">
        <thead className="bg-blue-900 text-left text-white">
          <tr>
            <th className="border border-blue-800 px-2 py-2 font-semibold">Status</th>
            <th className="border border-blue-800 px-2 py-2 font-semibold">CV</th>
            <th className="border border-blue-800 px-2 py-2 font-semibold">Work Package</th>
            <th className="border border-blue-800 px-2 py-2 font-semibold">Focus &amp; Objective</th>
            <th className="border border-blue-800 px-2 py-2 font-semibold">Expert Position</th>
            <th className="border border-blue-800 px-2 py-2 font-semibold">Name</th>
            <th className="border border-blue-800 px-2 py-2 font-semibold">Edu. Qualifications</th>
            <th className="border border-blue-800 px-2 py-2 font-semibold">Prof. Experience</th>
            <th className="border border-blue-800 px-2 py-2 font-semibold">Specific Prof. Experience</th>
            <th className="border border-blue-800 px-2 py-2 font-semibold">Exp. Dev. Cooperation</th>
          </tr>
        </thead>
        <tbody className="align-top">
          {groups.map((g) =>
            g.items.map((r, idx) => (
              <tr key={r.id} className="border-t">
                <td className="border px-2 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLE[r.activeStatus] || ""}`}>
                    {STATUS_LABEL[r.activeStatus] || r.activeStatus}
                  </span>
                </td>
                <td className="border px-2 py-2">
                  {r.cvFileName ? (
                    <a href={`/api/project-files/${r.projectId}/CVs/${encodeURIComponent(r.cvFileName)}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View</a>
                  ) : <span className="text-muted-foreground">—</span>}
                </td>
                {idx === 0 && (
                  <>
                    <td className="border bg-blue-50 px-2 py-2 font-semibold" rowSpan={g.items.length}>{g.wp}</td>
                    <td className="border bg-blue-50/50 px-2 py-2 text-muted-foreground" rowSpan={g.items.length}>{g.focus}</td>
                  </>
                )}
                <td className="border px-2 py-2 font-medium">{r.position}</td>
                <td className="border px-2 py-2">
                  {r.expertId && <span className="block font-mono text-[10px] text-muted-foreground">{r.expertId}</span>}
                  {r.expertName}
                </td>
                <td className="border px-2 py-2">{r.education}</td>
                <td className="border px-2 py-2 text-muted-foreground">{r.profExperience}</td>
                <td className="border px-2 py-2 text-muted-foreground">{r.specificExperience}</td>
                <td className="border px-2 py-2 text-muted-foreground">{r.devCooperation}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
