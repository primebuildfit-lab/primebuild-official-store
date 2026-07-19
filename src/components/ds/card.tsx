import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/**
 * Surface container. `interactive` adds hover/active affordances for cards that
 * behave like links; `elevated` lifts it with the design-system shadow scale.
 * Reused across every panel in the console.
 */
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  elevated?: boolean;
}

export function Card({ className, interactive, elevated, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface shadow-[var(--shadow-e1)] transition-all duration-200",
        elevated && "shadow-[var(--shadow-e2)]",
        interactive &&
          "cursor-pointer hover:border-border-strong hover:bg-surface-muted/40 hover:shadow-[var(--shadow-e2)] active:translate-y-px",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1 p-5 pb-3", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-sm font-semibold tracking-tight", className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-0", className)} {...props} />;
}
