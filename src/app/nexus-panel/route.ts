import { defaultTransport, resolvePanel, renderNexusPanel, renderNexusPanelUnauthorized, tokenFromCookieHeader, PANEL_OPTIONS } from "@/lib/nexus-surface";

export const dynamic = "force-dynamic";

/**
 * GET /nexus-panel — shared Nexus Panel for PrimeBuild Official Store
 * (ROLLOUT-004 Wave 5). EMPLOYEE-ONLY: validated against the CENTRAL Nexus IdP
 * with this app's audience; any local session grants nothing. Read-only glue —
 * no commerce module is imported or touched.
 */
export async function GET(request: Request) {
  const token = tokenFromCookieHeader(request.headers.get("cookie"));
  const view = await resolvePanel(defaultTransport(), token);
  const headers = { "content-type": "text/html; charset=utf-8" };
  if (!view) return new Response(renderNexusPanelUnauthorized(PANEL_OPTIONS), { status: 401, headers });
  return new Response(renderNexusPanel(view, PANEL_OPTIONS), { status: view.own.active ? 200 : 401, headers });
}
