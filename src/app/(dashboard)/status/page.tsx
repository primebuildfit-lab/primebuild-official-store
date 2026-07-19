import type { Metadata } from "next";
import { Badge, Card, Icon, StatusDot, type BadgeKind } from "@/components/ds";
import { ModuleHeader } from "@/components/os/module-header";
import { app } from "@/config/app";
import { isStoreConnected } from "@/server/integrations/store/config";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Estado" };

export default function StatusPage() {
  const storeConnected = isStoreConnected();

  const checks: Array<{ name: string; ok: boolean; detail: string; icon: "sparkles" | "store" }> = [
    { name: "Aplicación", ok: true, icon: "sparkles", detail: `${app.name} v${app.version} en ejecución` },
    {
      name: "Tienda oficial (Shopify)",
      ok: storeConnected,
      icon: "store",
      detail: storeConnected
        ? "Credenciales presentes — lectura en vivo disponible"
        : "No conectada — las pantallas de tienda muestran estado vacío honesto",
    },
  ];

  return (
    <div>
      <ModuleHeader id="status" />
      <div className="grid gap-4 sm:grid-cols-2">
        {checks.map((c) => {
          const kind: BadgeKind = c.ok ? "healthy" : "warning";
          return (
            <Card key={c.name} className="flex items-center gap-3 p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-surface-muted text-accent">
                <Icon name={c.icon} size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{c.name}</p>
                <p className="mt-0.5 text-xs text-muted">{c.detail}</p>
              </div>
              <Badge kind={kind}>
                <StatusDot tone={c.ok ? "ok" : "warn"} live={c.ok} />
                {c.ok ? "OK" : "Pendiente"}
              </Badge>
            </Card>
          );
        })}
      </div>
      <p className="mt-6 text-xs text-faint">
        Este estado es real: refleja el proceso de la app y si la tienda oficial está conectada. No se
        simula salud de servicios.
      </p>
    </div>
  );
}
