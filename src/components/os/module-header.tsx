import { Badge, PageHeader } from "@/components/ds";
import { getSection } from "@/config/sections";

/** Standard header for a functional module, driven by the section registry. */
export function ModuleHeader({ id, children }: { id: string; children?: React.ReactNode }) {
  const section = getSection(id);
  if (!section) return null;
  return (
    <PageHeader
      eyebrow={section.group}
      title={section.label}
      description={section.purpose}
      icon={section.icon}
    >
      {children}
    </PageHeader>
  );
}

/** A small pill describing whether the Official Store is connected (read-only). */
export function StoreSourceBadge({ connected, error }: { connected: boolean; error?: string }) {
  if (error) return <Badge kind="critical">Error de tienda</Badge>;
  return connected ? (
    <Badge kind="healthy">Tienda en vivo · solo lectura</Badge>
  ) : (
    <Badge kind="warning">Tienda no conectada</Badge>
  );
}
