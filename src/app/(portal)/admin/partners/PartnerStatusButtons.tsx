"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { PartnerStatus } from "@/types";
import { updatePartnerStatusAction } from "./actions";

interface PartnerStatusButtonsProps {
  partnerId: string;
  currentStatus: PartnerStatus;
}

export default function PartnerStatusButtons({ partnerId, currentStatus }: PartnerStatusButtonsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleChange(status: PartnerStatus) {
    setLoading(true);
    await updatePartnerStatusAction(partnerId, status);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      {currentStatus !== "active" && (
        <Button size="sm" variant="outline" className="text-green-700 border-green-300 hover:bg-green-50" onClick={() => handleChange("active")} disabled={loading}>
          Activate
        </Button>
      )}
      {currentStatus !== "suspended" && (
        <Button size="sm" variant="outline" className="text-red-700 border-red-300 hover:bg-red-50" onClick={() => handleChange("suspended")} disabled={loading}>
          Suspend
        </Button>
      )}
      {currentStatus !== "pending" && (
        <Button size="sm" variant="ghost" className="text-gray-500" onClick={() => handleChange("pending")} disabled={loading}>
          Set Pending
        </Button>
      )}
    </div>
  );
}
