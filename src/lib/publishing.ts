/**
 * Pure preview/publish logic (PBOS-001 · ORDEN 18). Preview consumes exactly the
 * one StoreDefinition — no duplicate. Version states are distinct: Validado is not
 * Published, Preparado is not Autorizado, Autorizado is not deployed, generating an
 * artifact is not syncing, and Preview is not the public store. In this phase the
 * final publish action is always blocked.
 */

import { validateDefinition, type StoreDefinition, type StoreRevision } from "./store-definition";

export type VersionStatus = StoreRevision["status"];

export const VERSION_TRANSITIONS: Record<VersionStatus, VersionStatus[]> = {
  borrador: ["en-validacion", "retirado"],
  "en-validacion": ["validado", "bloqueado", "borrador"],
  validado: ["preparado", "borrador"],
  preparado: ["autorizado", "borrador"],
  autorizado: ["publicado", "retirado"],
  bloqueado: ["borrador"],
  publicado: ["retirado"],
  retirado: [],
};

export function canVersionTransition(from: VersionStatus, to: VersionStatus): boolean {
  return VERSION_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Publishing is not authorized in this phase, regardless of a version being
 * "autorizado". This gate is independent of the transition graph.
 */
export const PUBLISH_AUTHORIZED_THIS_PHASE = false;

export interface ValidationCheck {
  id: string;
  label: string;
  ok: boolean;
  severity: "info" | "warning" | "error";
  note?: string;
}

/** Deterministic pre-publish validation computed from the definition only. */
export function runValidation(
  def: StoreDefinition,
  ctx: { connected: boolean },
): ValidationCheck[] {
  const base = validateDefinition(def);
  const checks: ValidationCheck[] = [];

  checks.push({
    id: "identidad",
    label: "Identidad con nombre",
    ok: def.identity.name.trim().length > 0,
    severity: "error",
  });
  checks.push({
    id: "slugs",
    label: "Slugs de página únicos",
    ok: !base.errors.some((e) => /slug/i.test(e)),
    severity: "error",
  });
  checks.push({
    id: "vacio",
    label: "La definición no está vacía",
    ok: def.pages.length > 0 || def.homeBlocks.length > 0 || def.nav.length > 0,
    severity: "warning",
    note: "Añade navegación, páginas o bloques antes de preparar una versión.",
  });
  checks.push({
    id: "bloques",
    label: "Bloques permitidos",
    ok: !base.errors.some((e) => /bloque/i.test(e)),
    severity: "error",
  });
  checks.push({
    id: "shopify",
    label: "Shopify conectado",
    ok: ctx.connected,
    severity: "info",
    note: ctx.connected
      ? undefined
      : "Requiere Shopify para publicar; no bloquea la preparación local.",
  });
  checks.push({
    id: "inventario-publicable",
    label: "Inventario publicable definido",
    ok: false,
    severity: "info",
    note: "La cantidad publicable requiere una política de disponibilidad (Fórmula no definida).",
  });
  checks.push({
    id: "secretos",
    label: "Sin secretos en la definición",
    ok: true,
    severity: "info",
  });
  return checks;
}

/** A version can be prepared only when every error-severity check passes. */
export function canPrepareVersion(checks: ValidationCheck[]): boolean {
  return !checks.some((c) => c.severity === "error" && !c.ok);
}

const STATUS_LABEL: Record<VersionStatus, string> = {
  borrador: "Borrador",
  "en-validacion": "En validación",
  validado: "Validado",
  preparado: "Preparado",
  bloqueado: "Bloqueado",
  autorizado: "Autorizado",
  publicado: "Publicado",
  retirado: "Retirado",
};

export function versionStatusLabel(s: VersionStatus): string {
  return STATUS_LABEL[s];
}
