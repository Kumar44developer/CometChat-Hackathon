import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

// shadcn/ui Badge — MentorRoom pill chip on the elevated fill.
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-pill border px-3 py-1 text-xs font-medium transition-colors duration-300",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "border-input text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
