/**
 * The single StoreDefinition (PBOS-001 · ORDEN 17). One local, versioned
 * definition of the store's content and design — reused by design, pages and
 * preview. It references canonical products/collections/content by id and never
 * copies them, introduces no demo content/testimonials/promotions, and blocks
 * capabilities that belong to Shopify (e.g. a live theme editor). Saving creates a
 * revision; restoring creates a NEW revision and never deletes the replaced one.
 */

export const STORE_DEF_SCHEMA_VERSION = 1;

/** Allowed structural block types. "newsletter" is intentionally excluded. */
export type BlockType =
  | "hero"
  | "texto"
  | "imagen"
  | "banner"
  | "coleccion"
  | "productos"
  | "beneficios"
  | "categorias"
  | "faq"
  | "contacto"
  | "contenido"
  | "separador"
  | "cta";

export const BLOCK_TYPES: BlockType[] = [
  "hero",
  "texto",
  "imagen",
  "banner",
  "coleccion",
  "productos",
  "beneficios",
  "categorias",
  "faq",
  "contacto",
  "contenido",
  "separador",
  "cta",
];

/** Newsletter needs a real provider, so it is blocked here. */
export const BLOCKED_BLOCK_TYPES = ["newsletter"] as const;

export interface NavItem {
  id: string;
  label: string;
  ref?: string;
}

export interface StorePage {
  id: string;
  title: string;
  slug: string;
}

export interface StoreBlock {
  id: string;
  type: BlockType;
  /** Optional reference to a canonical product/collection/content id. */
  ref?: string;
  note?: string;
}

export interface DesignTokens {
  logoRef?: string;
  typography?: string;
  scale?: string;
  radius?: string;
}

export interface StoreDefinition {
  id: "current";
  identity: { name: string; tagline?: string };
  nav: NavItem[];
  pages: StorePage[];
  homeBlocks: StoreBlock[];
  featuredCollections: string[];
  tokens: DesignTokens;
  policies: { id: string; title: string }[];
  seo: { title?: string; description?: string };
  version: number;
}

export function isStoreDefinition(x: unknown): x is StoreDefinition {
  if (x === null || typeof x !== "object") return false;
  const d = x as Record<string, unknown>;
  return d.id === "current" && typeof d.identity === "object" && Array.isArray(d.pages);
}

export function defaultDefinition(): StoreDefinition {
  return {
    id: "current",
    identity: { name: "" },
    nav: [],
    pages: [],
    homeBlocks: [],
    featuredCollections: [],
    tokens: {},
    policies: [],
    seo: {},
    version: STORE_DEF_SCHEMA_VERSION,
  };
}

export function isAllowedBlock(type: string): type is BlockType {
  return (BLOCK_TYPES as string[]).includes(type);
}

export function validateDefinition(def: StoreDefinition): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!def.identity.name.trim()) errors.push("La identidad necesita un nombre.");
  const slugs = def.pages.map((p) => p.slug.trim().toLowerCase());
  if (new Set(slugs).size !== slugs.length) errors.push("Hay slugs de página duplicados.");
  if (def.pages.some((p) => !p.slug.trim())) errors.push("Toda página necesita un slug.");
  if (def.homeBlocks.some((b) => !isAllowedBlock(b.type)))
    errors.push("Hay un bloque no permitido.");
  return { ok: errors.length === 0, errors };
}

export interface StoreRevision {
  id: string;
  number: number;
  parentId: string | null;
  actor: string;
  at: string;
  reason: string;
  snapshot: StoreDefinition;
  status:
    | "borrador"
    | "en-validacion"
    | "validado"
    | "preparado"
    | "bloqueado"
    | "autorizado"
    | "publicado"
    | "retirado";
}

/** A shallow, human-readable diff summary between two definitions. */
export function diffSummary(a: StoreDefinition, b: StoreDefinition): string[] {
  const out: string[] = [];
  if (a.identity.name !== b.identity.name)
    out.push(`Identidad: "${a.identity.name}" → "${b.identity.name}"`);
  if (a.nav.length !== b.nav.length)
    out.push(`Navegación: ${a.nav.length} → ${b.nav.length} entradas`);
  if (a.pages.length !== b.pages.length) out.push(`Páginas: ${a.pages.length} → ${b.pages.length}`);
  if (a.homeBlocks.length !== b.homeBlocks.length)
    out.push(`Bloques de home: ${a.homeBlocks.length} → ${b.homeBlocks.length}`);
  if ((a.seo.title ?? "") !== (b.seo.title ?? "")) out.push("SEO: título cambiado");
  return out;
}
