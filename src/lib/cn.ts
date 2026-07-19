import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge class names conditionally, resolving Tailwind conflicts predictably.
 * `cn("px-2", condition && "px-4")` → the last-wins Tailwind class survives.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
