"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ds";

/**
 * Theme toggle. The console is dark-locked by default ("fondo negro profundo");
 * this offers an optional light override for readability in bright rooms. The
 * choice persists to localStorage and is applied to <html data-theme>. The
 * server always renders dark, so there is no flash for the default case.
 */
type Theme = "dark" | "light";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const stored = (localStorage.getItem("pb-theme") as Theme | null) ?? "dark";
    setTheme(stored);
    document.documentElement.setAttribute("data-theme", stored);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("pb-theme", next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted transition-colors hover:border-border-strong hover:text-foreground"
      aria-label={theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      title={theme === "dark" ? "Tema oscuro" : "Tema claro"}
    >
      <Icon name={theme === "dark" ? "moon" : "sun"} size={16} />
    </button>
  );
}
