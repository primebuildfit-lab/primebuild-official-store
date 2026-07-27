import { app } from "./app";

/**
 * The canonical identity of PrimeBuild Official Store, and the guard that keeps
 * it honest. The master order (PBOS-001 · ORDEN 0.C) fixes the primary identity
 * as two exact lines and forbids the app from ever presenting itself as another
 * system in the ecosystem.
 *
 * This is enforced by tests (tests/config/identity.test.ts) so a future edit that
 * blurs the boundary fails CI instead of shipping.
 */

/** The two lines shown, verbatim, as the primary identity. */
export const IDENTITY = {
  title: app.name, // "PrimeBuild Official Store"
  subtitle: app.adminSubtitle, // "Commerce & Inventory Admin"
} as const;

/**
 * Identities this application must NEVER adopt as its primary identity. Official
 * Store is the Product Builder / commerce admin — not the Internal OS that
 * supervises it, not a Shopify/Store admin, and not the public store or a client
 * experience.
 */
export const FORBIDDEN_IDENTITIES: readonly string[] = [
  "PrimeBuild Internal OS",
  "PrimeBuild Store Admin",
  "PrimeBuild Store", // the public store experience, never an admin panel
  "Shopify Admin",
  "Client",
];
// Note: a bare "Shopify" is a legitimate MODULE label (Tienda online › Shopify) —
// it is not a forbidden primary identity. Only "Shopify Admin" is forbidden.

/**
 * True when a candidate identity string collides with a forbidden identity.
 * Comparison is case-insensitive and trims surrounding whitespace so a stray
 * casing change cannot slip a forbidden identity through.
 */
export function isForbiddenIdentity(candidate: string): boolean {
  const c = candidate.trim().toLowerCase();
  return FORBIDDEN_IDENTITIES.some((f) => f.toLowerCase() === c);
}

/**
 * Assert the app's primary identity is the canonical one and is not any
 * forbidden identity. Returns the identity so callers can render it; throws if
 * the boundary has been violated.
 */
export function assertCanonicalIdentity(): typeof IDENTITY {
  if (IDENTITY.title !== "PrimeBuild Official Store") {
    throw new Error(`Official Store identity title drifted: ${IDENTITY.title}`);
  }
  if (IDENTITY.subtitle !== "Commerce & Inventory Admin") {
    throw new Error(`Official Store identity subtitle drifted: ${IDENTITY.subtitle}`);
  }
  if (isForbiddenIdentity(IDENTITY.title) || isForbiddenIdentity(IDENTITY.subtitle)) {
    throw new Error("Official Store must not present itself as another system.");
  }
  return IDENTITY;
}
