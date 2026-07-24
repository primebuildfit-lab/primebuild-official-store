"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ds";
import { app } from "@/config/app";
import { IDENTITY } from "@/config/identity";

/**
 * The topbar identity menu (PBOS-001 · ORDEN 0.B). It states the canonical
 * identity — "PrimeBuild Official Store / Commerce & Inventory Admin" — and is
 * honest about the operator session: identity and permissions are governed by
 * Platform Nexus, so until that is connected there is no signed-in user to
 * invent here.
 */
export function IdentityMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Identidad y sesión"
        className="grid h-9 w-9 place-items-center overflow-hidden rounded-lg bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        title={`${IDENTITY.title} · ${IDENTITY.subtitle}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/primebuild-mark.png"
          alt="PrimeBuild"
          width={24}
          height={24}
          className="h-6 w-6 object-contain"
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="core-rise absolute right-0 top-11 z-40 w-72 overflow-hidden rounded-xl border border-border bg-elevated shadow-[var(--shadow-e3)]"
        >
          <div className="border-b border-border/70 px-4 py-3">
            <p className="text-sm font-bold leading-tight">{IDENTITY.title}</p>
            <p className="text-[0.62rem] uppercase tracking-[0.12em] text-faint">
              {IDENTITY.subtitle}
            </p>
          </div>
          <div className="px-4 py-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
              <Icon name="shield" size={12} className="text-accent" />
              Sesión de operador
            </p>
            <p className="mt-1 text-[0.7rem] leading-relaxed text-faint">
              La identidad y los permisos se gobiernan en Platform Nexus. Hasta conectarlo, no hay
              usuario con sesión iniciada — no se inventa uno.
            </p>
          </div>
          <div className="border-t border-border/70 px-4 py-2 text-[0.65rem] text-faint">
            {app.name} · v{app.version}
          </div>
        </div>
      ) : null}
    </div>
  );
}
