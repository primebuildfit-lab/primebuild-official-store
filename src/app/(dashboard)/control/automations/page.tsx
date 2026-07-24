import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/ds";
import { AutomationsBoard } from "@/components/os/automations-board";

export const metadata: Metadata = { title: "Automatizaciones" };

/**
 * Reglas y automatizaciones (PBOS-001 · ORDEN 26). Explainable, deterministic
 * rules — never "IA". Protected actions never execute without authorization; test
 * mode evaluates against a real entity without modifying it; pausing keeps
 * history; retries are idempotent.
 */
export default function AutomationsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Control"
        title="Automatizaciones"
        description="Reglas explicables y deterministas, con modo prueba sin efectos."
        icon="sparkles"
      />

      <Panel className="mb-6" icon="shield" title="Explicable, nunca ejecuta lo protegido">
        <p className="text-sm text-muted">
          Cada regla es <span className="font-medium text-foreground">determinista</span> (no
          &quot;IA&quot;) y declara disparador, condiciones y acciones. Las acciones{" "}
          <span className="font-medium text-foreground">protegidas</span> (enviar OC, ajustar,
          publicar, resolver conflicto remoto, cancelar, reembolsar, revocar Shopify, eliminar)
          nunca se ejecutan sin autorización. El modo prueba evalúa contra una entidad real{" "}
          <span className="font-medium text-foreground">sin modificarla</span>; pausar no borra el
          historial y los reintentos son idempotentes.
        </p>
      </Panel>

      <AutomationsBoard />
    </div>
  );
}
