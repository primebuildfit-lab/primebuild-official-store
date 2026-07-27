import {
  NexusHttpTransport,
  resolveNexusPanel,
  renderNexusPanel,
  renderNexusPanelUnauthorized,
  type NexusSurfaceTransport,
  type NexusPanelView,
} from "@platform-nexus/app-surface";

/**
 * NEXUS ROLLOUT WAVE 5 — PrimeBuild Official Store consumer glue over the SHARED
 * package @platform-nexus/app-surface (nothing hand-copied, ORDER_004).
 *
 * EMPLOYEE-ONLY via the CENTRAL Nexus session. This module touches NOTHING of
 * Shopify/catalog/products/orders/prices/inventory — it is pure identity glue;
 * the hard prohibition of ORDER_004 for PrimeBuild is preserved by construction
 * (no import from any commerce module).
 */

export const PBSTORE_AUDIENCE = "primebuild-official-store";
export const FOREIGN_AUDIENCE = "platform-nexus";

export const PANEL_OPTIONS = {
  appName: "PrimeBuild Official Store",
  ownAudience: PBSTORE_AUDIENCE,
  foreignAudience: FOREIGN_AUDIENCE,
};

export function defaultTransport(): NexusSurfaceTransport {
  return new NexusHttpTransport();
}

export function tokenFromCookieHeader(cookieHeader: string | null): string | undefined {
  const m = /(?:^|;\s*)nexus_session=([^;]+)/.exec(cookieHeader ?? "");
  return m ? decodeURIComponent(m[1]!) : undefined;
}

export async function resolvePanel(transport: NexusSurfaceTransport, token: string | undefined): Promise<NexusPanelView | null> {
  return resolveNexusPanel(transport, token, PBSTORE_AUDIENCE, FOREIGN_AUDIENCE);
}

export { renderNexusPanel, renderNexusPanelUnauthorized };
