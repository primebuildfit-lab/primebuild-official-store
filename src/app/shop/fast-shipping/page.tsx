"use client";

import { ProductCard } from "@/components/shop/product-card";
import { fastShippingVerdict } from "@/lib/owned-inventory";
import { useStorefrontCatalog } from "@/lib/official-store-data";

/** Envío rápido (§14, §42): SOLO productos con todas las condiciones verificadas. */
export default function ShopFastShippingPage() {
  const catalog = useStorefrontCatalog();

  const eligible = catalog.visibleProducts.filter((p) => {
    const available = p.variants.reduce(
      (acc, v) => acc + (catalog.variantAvailability.get(v.id)?.available ?? 0),
      0,
    );
    return fastShippingVerdict({
      stockConfirmed: available > 0,
      warehouseAssigned: p.fastShipping.warehouseAssigned,
      carrierServiceAvailable: p.fastShipping.carrierServiceAvailable,
      cutoffDefined: p.fastShipping.cutoffDefined,
      destinationEligible: true,
      slaRegistered: p.fastShipping.slaRegistered,
    }).eligible;
  });

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold">⚡ Envío rápido</h1>
        <p className="text-sm text-neutral-400">
          Aquí solo aparecen productos con stock físico confirmado, almacén asignado, transportista
          disponible, hora de corte y SLA registrados. La promesa nunca se basa en el proveedor
          dropshipping.
        </p>
      </header>
      {eligible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-700 p-10 text-center text-sm text-neutral-400">
          Ningún producto cumple hoy TODAS las condiciones de envío rápido. Preferimos no prometer lo
          que no está verificado.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {eligible.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              availableTotal={p.variants.reduce(
                (acc, v) => acc + (catalog.variantAvailability.get(v.id)?.available ?? 0),
                0,
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
