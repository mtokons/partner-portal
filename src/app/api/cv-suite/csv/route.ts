import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-auth";
import { getCandidates } from "@/lib/sharepoint";

export async function GET(request: Request) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles = ((user.roles || [user.role]) as string[]);
  if (!roles.includes("admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const ids = searchParams.getAll("id");

  let candidates = await getCandidates();

  if (ids.length > 0) {
    const idSet = new Set(ids);
    candidates = candidates.filter((c) => idSet.has(c.id));
  }

  const headers = [
    "SCCG ID",
    "Full Name",
    "Email",
    "Phone",
    "Nationality",
    "Country",
    "Category",
    "Status",
    "Payment Status",
    "Total Fee (EUR)",
    "Partner Share (EUR)",
    "SCCG Share (EUR)",
    "Deposit (EUR)",
    "Partner",
    "On Hold",
    "Created At",
  ];

  const escape = (v: string) => {
    if (v.includes(",") || v.includes('"') || v.includes("\n")) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };

  const rows = candidates.map((c) =>
    [
      c.sccgId,
      c.fullName,
      c.email,
      c.phone,
      c.nationality,
      c.country,
      c.workflowCategory,
      c.currentStatus as string,
      c.paymentStatus,
      c.totalServiceFee.toFixed(2),
      c.partnerShare.toFixed(2),
      c.sccgShare.toFixed(2),
      c.depositAmount.toFixed(2),
      c.partnerName ?? c.partnerId,
      c.isOnHold ? "Yes" : "No",
      c.createdAt ?? "",
    ]
      .map(escape)
      .join(",")
  );

  const csv = [headers.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="candidates-${Date.now()}.csv"`,
    },
  });
}
