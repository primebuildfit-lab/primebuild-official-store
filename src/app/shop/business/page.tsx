"use client";

import Link from "next/link";
import { useLiveCatalog } from "@/lib/official-store-data";

/**
 * Business Buyers (MEGA-004 004C): aterrizaje B2B honesto — compra por
 * volumen validada contra stock real; sin tramos de descuento inventados
 * (se anunciarán cuando existan). CTA único: la matriz de volumen.
 */
export default function BusinessBuyersPage() {
  const live = useLiveCatalog();
  return (
    <div className="pb-catdesc">
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <span className="pb-catdesc-eyebrow">Business Buyers</span>
        <h1 className="pbsf-serif-heading" style={{ textAlign: "left" }}>
          Compra por volumen para gimnasios y equipos
        </h1>
        <p className="pb-catdesc-body">
          Equipa a tu box, gimnasio o club con inventario físico propio de PrimeBuild: cantidades
          validadas unidad a unidad contra el stock real del almacén (nunca contra promesas del
          proveedor), reserva atómica durante el checkout y precio principal en PB con equivalente
          USD siempre visible.
        </p>
        <ul className="pb-catdesc-body" style={{ paddingLeft: 18 }}>
          <li>Matriz de variantes × cantidades con validación de stock en vivo.</li>
          <li>Estimación de bultos y total PB/USD antes de confirmar.</li>
          <li>Guardar y repetir pedidos (en tu dispositivo).</li>
          <li>
            Tramos de descuento por volumen: <strong>aún no definidos</strong> — se publicarán
            cuando existan; no inventamos precios tachados.
          </li>
        </ul>
        <p style={{ marginTop: 24 }}>
          <Link href="/shop/bulk" className="pbsf-btn-pill" style={{ background: "var(--pbsf-gold)", color: "#0a0a0a", borderColor: "var(--pbsf-gold)" }}>
            Abrir compra por volumen
          </Link>
        </p>
        <p className="pb-catdesc-body" style={{ marginTop: 18, fontSize: 13 }}>
          {live.ready
            ? `${live.publicProducts.length} productos con stock propio disponibles para volumen ahora mismo.`
            : ""}
          {" "}Para pedidos especiales: <a className="pb-catdesc-link" href="mailto:primebuildfit@gmail.com">primebuildfit@gmail.com</a>
        </p>
      </div>
    </div>
  );
}
