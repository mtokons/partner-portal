import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Play, Pause, AlertCircle, Clock, XCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type PortalStatusType = 
  | "running" 
  | "active" 
  | "hold" 
  | "pending" 
  | "cancelled" 
  | "overdue" 
  | "completed"
  | "success"
  | "warning"
  | "danger";

interface PortalStatusBadgeProps {
  status: PortalStatusType | string;
  label?: string;
  className?: string;
  showIcon?: boolean;
}

export function PortalStatusBadge({
  status,
  label,
  className,
  showIcon = true,
}: PortalStatusBadgeProps) {
  const normalized = (status || "").toLowerCase().trim();

  let variant: "running" | "active" | "hold" | "pending" | "cancelled" | "overdue" | "completed" | "default" = "default";
  let displayLabel = label || status;
  let IconComponent: React.ElementType | null = null;
  let dotColor = "";

  switch (normalized) {
    case "running":
    case "active":
      variant = normalized as "running" | "active";
      IconComponent = Play;
      dotColor = "bg-emerald-500 animate-pulse";
      displayLabel = label || (normalized === "running" ? "Running" : "Active");
      break;

    case "success":
      variant = "running";
      IconComponent = CheckCircle2;
      dotColor = "bg-emerald-500";
      displayLabel = label || "Success";
      break;

    case "completed":
      variant = "completed";
      IconComponent = Check;
      dotColor = "bg-emerald-500";
      displayLabel = label || "Completed";
      break;

    case "hold":
    case "pending":
      variant = normalized as "hold" | "pending";
      IconComponent = normalized === "hold" ? Pause : Clock;
      dotColor = "bg-amber-500";
      displayLabel = label || (normalized === "hold" ? "On Hold" : "Pending");
      break;

    case "warning":
      variant = "pending";
      IconComponent = AlertCircle;
      dotColor = "bg-amber-500";
      displayLabel = label || "Warning";
      break;

    case "cancelled":
    case "overdue":
      variant = normalized as "cancelled" | "overdue";
      IconComponent = normalized === "cancelled" ? XCircle : AlertCircle;
      dotColor = "bg-rose-500";
      displayLabel = label || (normalized === "cancelled" ? "Cancelled" : "Overdue");
      break;

    case "danger":
      variant = "cancelled";
      IconComponent = XCircle;
      dotColor = "bg-rose-500";
      displayLabel = label || "Danger";
      break;

    default:
      variant = "default";
      break;
  }

  return (
    <Badge
      variant={variant as any}
      className={cn("gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border shadow-2xs", className)}
    >
      {showIcon && dotColor && (
        <span className={cn("inline-block h-1.5 w-1.5 rounded-full shrink-0", dotColor)} />
      )}
      {showIcon && IconComponent && <IconComponent className="h-3 w-3 shrink-0" />}
      <span>{displayLabel}</span>
    </Badge>
  );
}
