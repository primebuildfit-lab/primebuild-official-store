import type { SVGProps } from "react";

/**
 * A tiny, dependency-free inline-SVG icon set (lucide-style: 24×24, stroke,
 * `currentColor`). Replaces the unicode glyphs the console used to render for
 * navigation and status, giving a consistent, premium iconography across the
 * whole app. Add an icon = add one entry to `PATHS`.
 *
 * Icons inherit color via `currentColor` and size via the `size` prop, so they
 * compose with the semantic text utilities (`text-accent`, `text-muted`, …).
 */

export type IconName =
  // navigation / modules
  | "dashboard"
  | "store"
  | "box"
  | "layers"
  | "receipt"
  | "users"
  | "percent"
  | "coins"
  | "megaphone"
  | "settings"
  | "activity"
  // ui / actions
  | "search"
  | "command"
  | "menu"
  | "chevron-right"
  | "chevron-down"
  | "external-link"
  | "check"
  | "alert"
  | "x"
  | "sun"
  | "moon"
  | "arrow-up"
  | "arrow-down"
  | "package"
  | "trending-up"
  | "sparkles"
  | "shield"
  | "globe"
  | "bell";

/** Path/element markup for each icon, drawn on a 24×24 canvas. */
const PATHS: Record<IconName, React.ReactNode> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  store: (
    <>
      <path d="M3 9.5 4.2 4.8A1.5 1.5 0 0 1 5.65 3.7h12.7a1.5 1.5 0 0 1 1.45 1.1L21 9.5" />
      <path d="M4 9.5v9.5a1.5 1.5 0 0 0 1.5 1.5h13a1.5 1.5 0 0 0 1.5-1.5V9.5" />
      <path d="M3 9.5a2.6 2.6 0 0 0 5.2 0 2.6 2.6 0 0 0 5.2 0 2.6 2.6 0 0 0 5.2 0" />
      <path d="M9 21v-4.5A1.5 1.5 0 0 1 10.5 15h3A1.5 1.5 0 0 1 15 16.5V21" />
    </>
  ),
  box: (
    <>
      <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
      <path d="m3 8 9 5 9-5" />
      <path d="M12 13v8" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 13 9 5 9-5" />
      <path d="m3 17 9 5 9-5" />
    </>
  ),
  receipt: (
    <>
      <path d="M5 3v18l2-1.2L9 21l2-1.2L13 21l2-1.2L17 21l2-1.2V3l-2 1.2L15 3l-2 1.2L11 3 9 4.2 7 3 5 4.2 5 3Z" />
      <path d="M8 8h8" />
      <path d="M8 12h8" />
    </>
  ),
  users: (
    <>
      <path d="M16 20v-1.5A3.5 3.5 0 0 0 12.5 15h-5A3.5 3.5 0 0 0 4 18.5V20" />
      <circle cx="10" cy="8" r="3.2" />
      <path d="M20 20v-1.5a3.5 3.5 0 0 0-2.6-3.38" />
      <path d="M15.5 4.7a3.2 3.2 0 0 1 0 6.16" />
    </>
  ),
  percent: (
    <>
      <line x1="18" y1="6" x2="6" y2="18" />
      <circle cx="7.5" cy="7.5" r="2.2" />
      <circle cx="16.5" cy="16.5" r="2.2" />
    </>
  ),
  coins: (
    <>
      <circle cx="9" cy="9" r="6" />
      <path d="M17.5 5.3a6 6 0 0 1 0 13.4" />
      <path d="M14.5 8.5a6 6 0 0 1 0 7" />
    </>
  ),
  megaphone: (
    <>
      <path d="M3 11v2a1 1 0 0 0 1 1h2l7 4V6L6 10H4a1 1 0 0 0-1 1Z" />
      <path d="M13 6v12l5 3V3l-5 3Z" />
      <path d="M18 9a3 3 0 0 1 0 6" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </>
  ),
  activity: <path d="M3 12h3l3 8 4-16 3 8h5" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </>
  ),
  command: (
    <path d="M15 6a3 3 0 1 1 3 3h-3V6Zm0 3v6m0 0a3 3 0 1 0 3 3h-3v-3Zm0 0H9m0 0a3 3 0 1 1-3 3h3v-3Zm0 0V9m0 0a3 3 0 1 0-3-3h3v3Zm0 0h6" />
  ),
  menu: (
    <>
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </>
  ),
  "chevron-right": <path d="m9 6 6 6-6 6" />,
  "chevron-down": <path d="m6 9 6 6 6-6" />,
  "external-link": (
    <>
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6" />
    </>
  ),
  check: <path d="m5 12 5 5 9-11" />,
  alert: (
    <>
      <path d="M12 3 2 20h20L12 3Z" />
      <line x1="12" y1="9" x2="12" y2="14" />
      <circle cx="12" cy="17.5" r="0.6" fill="currentColor" stroke="none" />
    </>
  ),
  x: (
    <>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />,
  "arrow-up": (
    <>
      <line x1="12" y1="19" x2="12" y2="5" />
      <path d="m6 11 6-6 6 6" />
    </>
  ),
  "arrow-down": (
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <path d="m6 13 6 6 6-6" />
    </>
  ),
  package: (
    <>
      <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
      <path d="m3 8 9 5 9-5" />
      <path d="M12 13v8" />
      <path d="M7.5 5.5 16.5 10.5" />
    </>
  ),
  "trending-up": (
    <>
      <path d="m3 17 6-6 4 4 8-8" />
      <path d="M17 7h4v4" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z" />
      <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 6v5c0 4.5 3 7.8 7 9 4-1.2 7-4.5 7-9V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 1 0-12 0c0 6-2 8-2 8h16s-2-2-2-8Z" />
      <path d="M10.3 20a2 2 0 0 0 3.4 0" />
    </>
  ),
};

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: number;
}

/** Render a named icon. Unknown names render nothing (fails safe). */
export function Icon({ name, size = 18, strokeWidth = 1.75, className, ...props }: IconProps) {
  const path = PATHS[name];
  if (!path) return null;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {path}
    </svg>
  );
}

/** Type guard used by the section registry / callers that hold loose strings. */
export function isIconName(value: string): value is IconName {
  return value in PATHS;
}
