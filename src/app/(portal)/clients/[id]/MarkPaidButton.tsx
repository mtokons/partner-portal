"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { markInstallmentPaidAction } from "./actions";

export default function MarkPaidButton({ installmentId }: { installmentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    await markInstallmentPaidAction(installmentId);
    setLoading(false);
    router.refresh();
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={loading}>
      {loading ? "..." : "Mark Paid"}
    </Button>
  );
}
