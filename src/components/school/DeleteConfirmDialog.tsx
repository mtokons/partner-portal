"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeleteConfirmDialogProps {
  title: string;
  description: string;
  onConfirm: () => Promise<void>;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DeleteConfirmDialog({
  title,
  description,
  onConfirm,
  trigger,
  open,
  onOpenChange,
}: DeleteConfirmDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      if (onOpenChange) onOpenChange(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger>{trigger}</DialogTrigger>}
      <DialogContent className="rounded-[32px] sm:max-w-[425px]">
        <DialogHeader>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 mb-4">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <DialogTitle className="text-center text-2xl font-black">{title}</DialogTitle>
          <DialogDescription className="text-center text-gray-500 font-medium">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-3 sm:flex-col sm:space-x-0 mt-6">
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading}
            className="w-full h-14 rounded-2xl font-black text-lg bg-red-600 hover:bg-red-700 shadow-xl shadow-red-200"
          >
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "Confirm Delete"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange?.(false)}
            disabled={loading}
            className="w-full h-12 rounded-2xl font-bold text-gray-500 hover:bg-gray-50"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
