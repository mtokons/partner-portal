"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MoreHorizontal, Pencil, Trash2, Pause, Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export interface RowActionsProps {
  /** Path to navigate to for the Edit action. Omit to hide. */
  editHref?: string;
  /** Server action to delete. Omit to hide. */
  onDelete?: () => Promise<{ ok: boolean; error?: string } | void>;
  /** Server action to put on hold (or resume). Omit to hide. */
  onHold?: () => Promise<{ ok: boolean; error?: string } | void>;
  /** Whether the row is currently on hold (changes Hold -> Resume). */
  isOnHold?: boolean;
  /** Friendly label for the entity, used in confirm dialog. */
  entityLabel?: string;
}

/**
 * Reusable row-level actions for grid tables.
 * Renders a "⋯" trigger that opens Edit / Hold|Resume / Delete items.
 */
export function RowActions({
  editHref,
  onDelete,
  onHold,
  isOnHold = false,
  entityLabel = "item",
}: RowActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const runAction = (fn: () => Promise<{ ok: boolean; error?: string } | void>, successMsg: string) => {
    startTransition(async () => {
      try {
        const res = await fn();
        if (res && res.ok === false) {
          toast.error(res.error || "Action failed");
          return;
        }
        toast.success(successMsg);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Action failed");
      }
    });
  };

  const hasAny = editHref || onDelete || onHold;
  if (!hasAny) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {editHref && (
            <DropdownMenuItem asChild>
              <Link href={editHref}>
                <Pencil className="h-4 w-4 mr-2" /> Edit
              </Link>
            </DropdownMenuItem>
          )}
          {onHold && (
            <DropdownMenuItem onSelect={() => runAction(onHold, isOnHold ? "Resumed" : "Put on hold")}>
              {isOnHold ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
              {isOnHold ? "Resume" : "Hold"}
            </DropdownMenuItem>
          )}
          {onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={(e) => {
                  e.preventDefault();
                  setConfirmOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {onDelete && (
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete this {entityLabel}?</DialogTitle>
              <DialogDescription>
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setConfirmOpen(false);
                  runAction(onDelete, `Deleted ${entityLabel}`);
                }}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
