"use client";

import { Badge, Icon, StatusDot } from "@/components/ds";
import { ThemeToggle } from "./theme-toggle";
import { TaskCenter } from "./task-center";
import { IdentityMenu } from "./identity-menu";

/**
 * The sticky command-center topbar: mobile menu trigger, a command-palette
 * launcher, a theme toggle, and an honest store-connection pill. It reports
 * whether the live Official Store is connected — it never invents system health.
 */
export function OsTopbar({
  onOpenPalette,
  onOpenMenu,
  storeConnected,
}: {
  onOpenPalette: () => void;
  onOpenMenu: () => void;
  storeConnected: boolean;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/70 px-4 backdrop-blur-md sm:px-6">
      <button
        type="button"
        onClick={onOpenMenu}
        className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted transition-colors hover:text-foreground md:hidden"
        aria-label="Abrir menú"
      >
        <Icon name="menu" size={18} />
      </button>

      <button
        type="button"
        onClick={onOpenPalette}
        className="flex h-9 flex-1 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-left text-sm text-faint transition-colors hover:border-border-strong sm:max-w-md"
        aria-label="Abrir buscador de secciones"
      >
        <Icon name="search" size={15} />
        <span className="truncate">Buscar sección o módulo…</span>
        <kbd className="ml-auto hidden items-center gap-0.5 rounded border border-border px-1.5 py-0.5 text-[0.62rem] text-muted sm:flex">
          Ctrl K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-2.5">
        {storeConnected ? (
          <Badge kind="healthy" title="Tienda oficial conectada (solo lectura)">
            <StatusDot tone="ok" live />
            <span className="hidden sm:inline">Tienda conectada</span>
          </Badge>
        ) : (
          <Badge kind="warning" title="Tienda oficial no conectada">
            <StatusDot tone="warn" />
            <span className="hidden sm:inline">Tienda no conectada</span>
          </Badge>
        )}
        <TaskCenter />
        <ThemeToggle />
        <IdentityMenu />
      </div>
    </header>
  );
}
