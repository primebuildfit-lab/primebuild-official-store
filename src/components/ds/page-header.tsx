import type { ReactNode } from "react";
import { Icon, type IconName } from "./icon";

/**
 * The standard title block at the top of every console screen: an eyebrow, an
 * optional module icon, the title, a description and a slot for right-aligned
 * status/actions.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  icon,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: IconName;
  children?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        {icon ? (
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border bg-surface-muted text-accent shadow-[var(--shadow-e1)]">
            <Icon name={icon} size={20} />
          </span>
        ) : null}
        <div>
          {eyebrow ? (
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-accent">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight">{title}</h1>
          {description ? <p className="mt-1.5 max-w-2xl text-sm text-muted">{description}</p> : null}
        </div>
      </div>
      {children ? <div className="flex items-center gap-2">{children}</div> : null}
    </div>
  );
}
