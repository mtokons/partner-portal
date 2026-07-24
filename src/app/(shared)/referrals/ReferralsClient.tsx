"use client";
import { useEffect, useState } from "react";
import { Partner } from "@/types";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { fetchReferralForCurrentUser } from "./actions";

export default function ReferralsClient() {
  const [partner, setPartner] = useState<Partner | null>(null);

  useEffect(() => {
    fetchReferralForCurrentUser().then(setPartner);
  }, []);

  if (!partner) return <div>Loading...</div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">My Referral Code</h2>
      <Separator className="mb-4" />
      <Card className="p-4">
        <div className="font-semibold">Referral Code:</div>
        <div className="text-lg">{partner.partnerCode || partner.id}</div>
      </Card>
    </div>
  );
}
