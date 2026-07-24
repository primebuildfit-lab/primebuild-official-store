"use client";

import { useEffect } from "react";
import { ErrorState, PageHeader } from "@/components/ds";

/**
 * Dashboard error boundary. Shows the honest ErrorState with the real error
 * message (never a fabricated one) and offers a retry via Next's reset().
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the real error to the console for diagnosis; no telemetry here.
    console.error(error);
  }, [error]);

  return (
    <div>
      <PageHeader
        eyebrow="Error"
        title="Algo falló en esta pantalla"
        description="La aplicación siguió en pie. Puedes reintentar."
        icon="alert"
      />
      <ErrorState message={error.message || "Error desconocido."} onRetry={reset} />
    </div>
  );
}
