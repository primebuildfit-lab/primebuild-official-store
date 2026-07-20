"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ds";
import { SECTIONS } from "@/config/sections";

/**
 * A breadcrumb derived from the section registry and the current path. It shows
 * Inicio › Grupo › Sección, so the operator always knows where they are in the
 * commerce admin. It fabricates nothing: unmatched paths simply collapse to the
 * home crumb.
 */

/** The section whose href best matches the path (longest prefix wins). */
function matchSection(pathname: string) {
  let best: (typeof SECTIONS)[number] | undefined;
  for (const s of SECTIONS) {
    if (s.href === "/") {
      if (pathname === "/" && !best) best = s;
      continue;
    }
    if (pathname === s.href || pathname.startsWith(`${s.href}/`)) {
      if (!best || s.href.length > best.href.length) best = s;
    }
  }
  return best;
}

export function Breadcrumb() {
  const pathname = usePathname();
  const section = matchSection(pathname);

  return (
    <nav aria-label="Ruta" className="flex items-center gap-1.5 text-xs text-faint">
      <Link href="/" className="transition-colors hover:text-muted">
        Inicio
      </Link>
      {section && section.href !== "/" ? (
        <>
          <Icon name="chevron-right" size={12} className="text-faint/60" aria-hidden />
          <span className="text-muted">{section.group}</span>
          <Icon name="chevron-right" size={12} className="text-faint/60" aria-hidden />
          <span className="font-medium text-foreground" aria-current="page">
            {section.label}
          </span>
        </>
      ) : null}
    </nav>
  );
}
