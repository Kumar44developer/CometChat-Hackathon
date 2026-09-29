import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// shadcn/ui helper: merge conditional classes, then de-duplicate conflicting
// Tailwind utilities (later wins) so component variants compose predictably.
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
