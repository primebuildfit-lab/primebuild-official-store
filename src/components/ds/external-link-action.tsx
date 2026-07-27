import { cn } from "@/lib/cn";
import { Icon } from "./icon";

/**
 * An action that leaves the application for an external system (PBOS-001 · ORDEN
 * 0.D). It opens ONLY a real, verified https URL, never carries a token or secret
 * in the URL, and always signals that it opens an external system. When no safe
 * URL is available it renders disabled — it never fabricates a link (e.g. a fake
 * "Abrir Shopify" target).
 */

const TOKENISH = /(token|access[_-]?token|secret|password|api[_-]?key|shpat_|bearer)/i;

/**
 * True only for a URL safe to open: absolute https, no userinfo, and no
 * token/secret-looking material anywhere in the URL.
 */
export function isSafeExternalUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;
  if (u.username || u.password) return false;
  if (TOKENISH.test(u.search) || TOKENISH.test(u.hash) || TOKENISH.test(u.pathname)) return false;
  return true;
}

export function ExternalLinkAction({
  href,
  children,
  system,
  className,
  disabledReason,
}: {
  href: string | null | undefined;
  children: React.ReactNode;
  /** The external system, e.g. "Shopify Admin". Used for the honest aria-label. */
  system?: string;
  className?: string;
  /** Shown as the title when the link is unavailable. */
  disabledReason?: string;
}) {
  const safe = isSafeExternalUrl(href);
  const base =
    "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  if (!safe) {
    return (
      <button
        type="button"
        disabled
        title={disabledReason ?? "Enlace externo no disponible o no verificado."}
        className={cn(base, "cursor-not-allowed border-border text-faint opacity-60", className)}
      >
        <Icon name="external-link" size={13} />
        {children}
      </button>
    );
  }

  return (
    <a
      href={href as string}
      target="_blank"
      rel="noopener noreferrer external"
      aria-label={`${typeof children === "string" ? children : "Abrir"} — abre ${
        system ?? "un sistema externo"
      } en una pestaña nueva`}
      className={cn(
        base,
        "border-border text-muted hover:border-border-strong hover:text-foreground",
        className,
      )}
    >
      <Icon name="external-link" size={13} />
      {children}
    </a>
  );
}
