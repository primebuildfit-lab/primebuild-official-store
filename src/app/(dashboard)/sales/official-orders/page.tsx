import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/ds";
import { OfficialOrdersBoard } from "@/components/os/official-orders-board";

export const metadata: Metadata = { title: "Pedidos Official Store" };

/**
 * Pedidos del storefront propio (PBOS-DPB-MEGA-FABLE-001 §48-§49): pagos y
 * reembolsos solo observados con evidencia; enviar contabiliza la salida en el
 * ledger (idempotente) y convierte la reserva; cancelar la libera.
 */
export default function OfficialOrdersPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Ventas"
        title="Pedidos Official Store"
        description="Bandeja de pedidos del storefront /shop, incluidas compras por volumen."
        icon="receipt"
      />
      <Panel className="mb-6" icon="shield" title="Estados con evidencia">
        <p className="text-sm text-muted">
          «Paid observed» y «Refund observed» exigen una referencia externa observada — sin proveedor
          financiero nada se marca pagado. El stock sale del ledger al{" "}
          <span className="font-medium text-foreground">enviar</span>, nunca antes, y la reserva del
          checkout se convierte en ese momento.
        </p>
      </Panel>
      <OfficialOrdersBoard />
    </div>
  );
}
