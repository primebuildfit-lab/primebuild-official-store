import { Badge, type BadgeKind } from "./badge";
import { Icon } from "./icon";

/**
 * A provenance badge (PBOS-001 · ORDEN 0.D). Every integrated datum can state
 * where it came from and whether it was verified. Nothing is "verified" without
 * evidence, so the default is unverified/unknown, never a reassuring green.
 */

export type SourceVerification = "verified" | "unverified" | "unknown";

const VERIFICATION: Record<SourceVerification, { kind: BadgeKind; label: string }> = {
  verified: { kind: "healthy", label: "verificada" },
  unverified: { kind: "warning", label: "sin verificar" },
  unknown: { kind: "neutral", label: "sin verificar" },
};

export function SourceBadge({
  source,
  verification = "unknown",
  asOf,
}: {
  /** The system the datum came from, e.g. "Shopify", "PrimeBuild", "Manual". */
  source: string;
  verification?: SourceVerification;
  /** When the datum was last observed/verified, pre-formatted. Optional. */
  asOf?: string;
}) {
  const v = VERIFICATION[verification];
  const title = `Fuente: ${source} · ${v.label}${asOf ? ` · ${asOf}` : ""}`;
  return (
    <Badge kind={v.kind} title={title}>
      <Icon name="shield" size={11} />
      <span className="font-medium">{source}</span>
      {asOf ? <span className="text-faint">· {asOf}</span> : null}
    </Badge>
  );
}
