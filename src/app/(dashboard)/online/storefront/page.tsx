import type { Metadata } from "next";
import { PageHeader } from "@/components/ds";
import { StorefrontStatus } from "@/components/os/storefront-status";

export const metadata: Metadata = { title: "Storefront propio" };

/**
 * Estado del Client /shop (PBOS-DPB-MEGA-FABLE-001 §10, §42, §54): visibilidad,
 * flags, roles declarados y eventos. El storefront no tiene autoridad sobre su
 * configuración (AP-4.2 / AP-4.3).
 */
export default function StorefrontAdminPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Tienda online"
        title="Storefront propio"
        description="La tienda pública de inventario físico propio, gobernada desde este Admin."
        icon="globe"
      />
      <StorefrontStatus />
    </div>
  );
}
