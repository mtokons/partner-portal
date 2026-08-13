import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
        // Portal Theme Variants
        germanBlue:
          "bg-[#0F4C81]/15 text-[#0F4C81] border-[#0F4C81]/30 dark:bg-[#0F4C81]/30 dark:text-blue-300 dark:border-[#0F4C81]/50",
        gold:
          "bg-[#F5B800]/20 text-[#856404] border-[#F5B800]/40 dark:bg-[#F5B800]/30 dark:text-[#FFE082] dark:border-[#F5B800]/50",
        success:
          "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:bg-emerald-500/25 dark:text-emerald-300 dark:border-emerald-500/40",
        running:
          "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:bg-emerald-500/25 dark:text-emerald-300 dark:border-emerald-500/40",
        active:
          "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:bg-emerald-500/25 dark:text-emerald-300 dark:border-emerald-500/40",
        completed:
          "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:bg-emerald-500/25 dark:text-emerald-300 dark:border-emerald-500/40",
        warning:
          "bg-amber-500/15 text-amber-800 border-amber-500/30 dark:bg-amber-500/25 dark:text-amber-300 dark:border-amber-500/40",
        hold:
          "bg-amber-500/15 text-amber-800 border-amber-500/30 dark:bg-amber-500/25 dark:text-amber-300 dark:border-amber-500/40",
        pending:
          "bg-amber-500/15 text-amber-800 border-amber-500/30 dark:bg-amber-500/25 dark:text-amber-300 dark:border-amber-500/40",
        danger:
          "bg-rose-500/15 text-rose-700 border-rose-500/30 dark:bg-rose-500/25 dark:text-rose-300 dark:border-rose-500/40",
        cancelled:
          "bg-rose-500/15 text-rose-700 border-rose-500/30 dark:bg-rose-500/25 dark:text-rose-300 dark:border-rose-500/40",
        overdue:
          "bg-rose-500/15 text-rose-700 border-rose-500/30 dark:bg-rose-500/25 dark:text-rose-300 dark:border-rose-500/40",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
