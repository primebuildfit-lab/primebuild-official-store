import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Card } from "./card";
import { Icon, type IconName } from "./icon";

/**
 * A titled content panel — a Card with a standard header (icon + title +
 * optional description + right-aligned actions). The workhorse container for
 * grouping information without letting raw tables dominate the layout.
 */
export function Panel({
  title,
  description,
  icon,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  description?: ReactNode;
  icon?: IconName;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-3 border-b border-border/70 px-5 py-3.5">
          <div className="flex min-w-0 items-start gap-2.5">
            {icon ? (
              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-border bg-surface-muted text-accent">
                <Icon name={icon} size={15} />
              </span>
            ) : null}
            <div className="min-w-0">
              {title ? <h3 className="truncate text-sm font-semibold tracking-tight">{title}</h3> : null}
              {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
            </div>
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </Card>
  );
}
