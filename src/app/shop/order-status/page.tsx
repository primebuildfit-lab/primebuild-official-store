"use client";

import Link from "next/link";
import { useState } from "react";
import { useOfficialOrders } from "@/lib/official-store-data";

/**
 * Order Status (MEGA-004 004C): consulta por número de pedido contra los
 * pedidos reales de este dispositivo. Sin backend de cuentas todavía
 * (identidad Nexus pendiente) — se dice tal cual.
 */
export default function OrderStatusPage() {
  const orders = useOfficialOrders();
  const [q, setQ] = useState("");
  const [searched, setSearched] = useState(false);
  const match = orders.items.find((o) => o.id.trim() === q.trim());

  return (
    <div className="pbsf-search-head" style={{ paddingBottom: 64 }}>
      <h1 className="pbsf-serif-heading">Order Status</h1>
      <p style={{ color: "var(--pbsf-text-body)", fontSize: 14, marginBottom: 18 }}>
        Introduce tu número de pedido (aparece en la confirmación del checkout).
      </p>
      <input
        className="pbsf-search-input"
        placeholder="p. ej. loc_abc123…"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setSearched(false);
        }}
        aria-label="Número de pedido"
      />
      <button
        className="pbsf-btn-pill"
        style={{ marginTop: 16 }}
        onClick={() => setSearched(true)}
        disabled={!q.trim()}
      >
        Consultar estado
      </button>
      {searched ? (
        match ? (
          <div style={{ marginTop: 24 }}>
            <p style={{ fontSize: 15 }}>
              Estado: <strong style={{ color: "var(--pbsf-gold)" }}>{match.state}</strong>
            </p>
            <Link href={`/shop/orders/${match.id}`} className="pb-featured-link">
              Ver el pedido completo
            </Link>
          </div>
        ) : (
          <p className="pbsf-empty" style={{ paddingTop: 24 }}>
            No hay ningún pedido con ese número en este dispositivo. Los pedidos se guardan
            localmente hasta que llegue la identidad unificada del ecosistema.
          </p>
        )
      ) : null}
    </div>
  );
}
