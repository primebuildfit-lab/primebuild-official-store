import { Card } from "./card";
import { Icon } from "./icon";

// The generic honest empty state now lives in states.tsx (single source, PBOS
// ORDEN 0.E). Re-export it here so existing `NoData` imports keep working.
export { NoData } from "./states";

/**
 * The Shopify-specific not-connected state. When the live store is not connected
 * we say so plainly and show exactly what is needed to connect it — never fake
 * data.
 */
export function StoreNotConnected({ error }: { error?: string }) {
  return (
    <Card className="border-dashed">
      <div className="flex flex-col gap-2 p-6">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-surface-muted text-warn">
            <Icon name="alert" size={16} />
          </span>
          <p className="text-sm font-semibold">
            {error ? "No se pudo leer la tienda oficial." : "Tienda oficial no conectada."}
          </p>
        </div>
        <p className="max-w-2xl text-sm text-muted">
          {error
            ? error
            : "Esta sección muestra datos reales de la tienda primebuildfit (Shopify) en solo lectura. Para conectarla, define las credenciales del Admin API en .env:"}
        </p>
        {!error ? (
          <pre className="mt-1 overflow-x-auto rounded-lg border border-border bg-surface-muted/50 p-3 text-[0.72rem] text-muted">
            {`# .env
SHOPIFY_STORE_DOMAIN="primebuildfit.myshopify.com"
SHOPIFY_ADMIN_ACCESS_TOKEN="shpat_********"   # token de solo lectura
# opcional:
SHOPIFY_API_VERSION="2025-01"`}
          </pre>
        ) : null}
        <p className="text-xs text-faint">
          Solo lectura: PrimeBuild Official Store nunca escribe en la tienda. Hasta conectarla, este
          estado vacío es honesto — no se inventan productos, pedidos ni ingresos.
        </p>
      </div>
    </Card>
  );
}
