"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ds";
import { app } from "@/config/app";
import { SECTION_GROUPS, sectionsByGroup } from "@/config/sections";

/**
 * The PrimeBuild Official Store navigation, grouped by commercial area and
 * derived entirely from the section registry (src/config/sections.ts). Premium
 * dark-first line: brand mark, DS icons, an active rail, and an honest footer.
 */

// The dashboard root and the store overview are matched exactly; every other
// route also matches its nested paths.
const EXACT = new Set(["/", "/store"]);

export function OsSidebar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="flex h-full flex-col gap-5 overflow-y-auto bg-sidebar px-3 py-4"
    >
      <Link href="/" className="group flex items-center gap-2.5 px-2 py-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/primebuild-mark.png"
          alt="PrimeBuild"
          width={36}
          height={36}
          className="h-9 w-9 shrink-0 object-contain"
        />
        <span className="min-w-0">
          <span className="block text-sm font-bold leading-tight tracking-tight">{app.name}</span>
          <span className="block text-[0.62rem] uppercase tracking-[0.12em] text-faint">
            {app.adminSubtitle}
          </span>
        </span>
      </Link>

      <div className="flex flex-col gap-4">
        {SECTION_GROUPS.map((group) => {
          const items = sectionsByGroup(group);
          if (items.length === 0) return null;
          return (
            <div key={group} className="flex flex-col gap-0.5">
              <p className="px-3 pb-1 text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-faint">
                {group}
              </p>
              {items.map((item) => {
                const active = EXACT.has(item.href)
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[0.82rem] font-medium transition-colors",
                      active
                        ? "bg-surface-muted text-foreground"
                        : "text-muted hover:bg-surface-muted/50 hover:text-foreground",
                    )}
                  >
                    {active ? (
                      <span
                        className="absolute inset-y-1.5 left-0 w-0.5 rounded-full"
                        style={{ background: "var(--gradient-accent)" }}
                        aria-hidden
                      />
                    ) : null}
                    <Icon
                      name={item.icon}
                      size={17}
                      className={cn(
                        "shrink-0 transition-colors",
                        active ? "text-accent" : "text-faint group-hover:text-muted",
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                    {item.status === "planned" ? (
                      <span
                        className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-faint/60"
                        title="Espacio definido — aún no construido"
                        aria-label="Planificado"
                      />
                    ) : null}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="mt-auto rounded-xl border border-border bg-surface/50 px-3 py-2.5">
        <p className="flex items-center gap-1.5 text-[0.65rem] font-semibold text-muted">
          <Icon name="shield" size={12} className="text-accent" />
          App independiente · solo lectura
        </p>
        <p className="mt-1 text-[0.64rem] leading-relaxed text-faint">{app.honesty}</p>
      </div>
    </nav>
  );
}
