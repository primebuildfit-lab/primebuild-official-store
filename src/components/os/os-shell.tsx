"use client";

import { useEffect, useState } from "react";
import { OsSidebar } from "./os-sidebar";
import { OsTopbar } from "./os-topbar";
import { OsCommandPalette } from "./os-command-palette";
import { app } from "@/config/app";

/**
 * The command-center shell: fixed sidebar, sticky topbar, scrollable main and a
 * minimal footer. Owns the two pieces of cross-cutting UI state — the mobile nav
 * drawer and the command palette — and wires the global Ctrl/⌘+K shortcut.
 */
export function OsShell({
  children,
  storeConnected,
  generatedAt,
}: {
  children: React.ReactNode;
  storeConnected: boolean;
  generatedAt: string;
}) {
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="grid min-h-dvh grid-cols-1 md:grid-cols-[16rem_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh border-r border-border md:block">
        <OsSidebar />
      </aside>

      {/* Mobile drawer */}
      {drawer ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawer(false)}
            aria-hidden
          />
          <div className="core-rise absolute left-0 top-0 h-full w-64 border-r border-border shadow-[var(--shadow-e3)]">
            <OsSidebar />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-col">
        <OsTopbar
          onOpenPalette={() => setPalette(true)}
          onOpenMenu={() => setDrawer(true)}
          storeConnected={storeConnected}
        />
        <main className="mx-auto w-full max-w-[92rem] flex-1 px-4 py-7 sm:px-6 lg:px-8">
          {children}
        </main>
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-6 py-3 text-[0.7rem] text-faint">
          <span>
            {app.name} · {app.tagline}
          </span>
          <span className="tabular-nums">Generado · {generatedAt}</span>
        </footer>
      </div>

      <OsCommandPalette open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}
