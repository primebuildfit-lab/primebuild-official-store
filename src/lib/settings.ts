/**
 * Pure settings logic (PBOS-001 · ORDEN 28). Only Official Store's own settings.
 * Critical settings are persistent, validated, versioned, audited and reversible.
 * Business decisions (base currency, countries, warehouses, suppliers, taxes,
 * return rules, carriers, availability formula, reservation/publish policy) are
 * NEVER invented — they are listed as pending decisions. Identifier, keys, updater
 * and channel are never changed here; no live migrations.
 */

export const SETTINGS_SCHEMA_VERSION = 1;

export interface OperatorSettings {
  id: string; // singleton
  displayLabel: string;
  timezoneLabel: string;
  updatedAt: string;
}

export interface SettingsRevision {
  id: string;
  number: number;
  at: string;
  actor: string;
  reason: string;
  before: OperatorSettings | null;
  after: OperatorSettings;
}

export function isSettingsRevision(x: unknown): x is SettingsRevision {
  return x !== null && typeof x === "object" && typeof (x as { id?: unknown }).id === "string";
}

export function validateOperatorSettings(input: { displayLabel: string }): {
  ok: boolean;
  error?: string;
} {
  if (!input.displayLabel.trim()) return { ok: false, error: "La etiqueta no puede estar vacía." };
  if (input.displayLabel.length > 60) return { ok: false, error: "Máximo 60 caracteres." };
  return { ok: true };
}

/** A minimal diff between two settings snapshots, for the audit/revision view. */
export function diffSettings(before: OperatorSettings | null, after: OperatorSettings): string[] {
  if (!before) return ["(creación inicial)"];
  const out: string[] = [];
  if (before.displayLabel !== after.displayLabel)
    out.push(`etiqueta: "${before.displayLabel}" → "${after.displayLabel}"`);
  if (before.timezoneLabel !== after.timezoneLabel)
    out.push(`zona: "${before.timezoneLabel}" → "${after.timezoneLabel}"`);
  return out.length ? out : ["(sin cambios)"];
}

/** Decisions the owner must make — never invented here. */
export const PENDING_DECISIONS: { name: string; reason: string }[] = [
  { name: "Moneda base", reason: "No se asume; cada valor lleva su moneda explícita." },
  { name: "Países / mercados", reason: "Sin países habilitados por defecto." },
  { name: "Almacenes reales", reason: "Solo los que el operador registre localmente." },
  { name: "Proveedores reales", reason: "No se precrean por mención." },
  { name: "Impuestos", reason: "Sin política fiscal definida." },
  { name: "Reglas de devolución", reason: "Sin reglas por categoría por defecto." },
  { name: "Transportistas", reason: "Sin transportista conectado." },
  {
    name: "Fórmula de disponibilidad",
    reason: "Available/Available-to-sell sin fórmula definida.",
  },
  { name: "Política de reserva", reason: "No se reserva automáticamente sin política." },
  { name: "Política de publicación", reason: "Publicación no autorizada en esta fase." },
];
