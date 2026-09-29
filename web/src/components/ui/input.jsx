import * as React from "react";
import { cn } from "@/lib/utils";

// shadcn/ui Input — themed to MentorRoom: 6px radius, subtle hairline,
// blue focus ring, deep-red invalid state (matches the .input class).
const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex min-h-[40px] w-full rounded-input border border-input bg-background px-3 py-2 text-body text-foreground transition-colors duration-300 placeholder:text-muted-foreground hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-45 aria-[invalid=true]:border-destructive",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
