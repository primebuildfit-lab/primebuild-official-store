/**
 * Pure support logic (PBOS-001 · ORDEN 29). Support is the single, last entry.
 * There is no ticket backend, so tickets/agents/SLA are never invented and nothing
 * is "sent" — a request can only be prepared or exported locally. Safe diagnostics
 * declare what is included/excluded and carry no secrets or unneeded personal data.
 */

export const SUPPORT_SCHEMA_VERSION = 1;

/** Contextual help links — all point to real routes in the app. */
export const SUPPORT_LINKS: { label: string; href: string }[] = [
  { label: "Productos", href: "/store/products" },
  { label: "Compra rápida", href: "/purchasing/quick-buy" },
  { label: "Proveedores", href: "/purchasing/suppliers" },
  { label: "Órdenes de compra", href: "/purchasing/orders" },
  { label: "Recepciones", href: "/purchasing/receiving" },
  { label: "Inventario", href: "/inventory/stock" },
  { label: "Almacenes", href: "/inventory/warehouses" },
  { label: "Shopify", href: "/store" },
  { label: "Pedidos", href: "/store/orders" },
  { label: "Preparación y envíos", href: "/operations/fulfillment" },
  { label: "Devoluciones", href: "/sales/returns" },
  { label: "Configuración", href: "/settings" },
];

export interface SupportTicket {
  id: string;
  subject: string;
  category: string;
  severity: "baja" | "media" | "alta";
  description: string;
  route: string;
  version: string;
  status: "borrador";
  includeDiagnostic: boolean;
  createdAt: string;
}

export function isSupportTicket(x: unknown): x is SupportTicket {
  return x !== null && typeof x === "object" && typeof (x as { id?: unknown }).id === "string";
}

export function validateTicket(input: { subject: string; description: string }): {
  ok: boolean;
  error?: string;
} {
  if (!input.subject.trim()) return { ok: false, error: "El asunto es obligatorio." };
  if (!input.description.trim()) return { ok: false, error: "La descripción es obligatoria." };
  return { ok: true };
}

/** What a safe diagnostic bundle includes and excludes — no secrets, ever. */
export function safeDiagnostic(version: string): { included: string[]; excluded: string[] } {
  return {
    included: [
      `versión ${version}`,
      "ruta actual",
      "estado de conexión de Shopify (sí/no)",
      "versiones de esquema local",
      "conteos de colecciones locales",
    ],
    excluded: ["tokens y secretos", "datos personales de clientes", "direcciones", "cookies"],
  };
}
