import Link from "next/link";
import { Icon } from "@/components/ds";
import { app } from "@/config/app";

/** Honest 404: the route does not exist. No fabricated content, just a way back. */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-xl border border-border bg-surface-muted text-faint">
        <Icon name="search" size={22} />
      </span>
      <div>
        <h1 className="text-lg font-bold tracking-tight">Página no encontrada</h1>
        <p className="mt-1.5 text-sm text-muted">La ruta que buscas no existe en {app.name}.</p>
      </div>
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:border-border-strong hover:text-foreground"
      >
        <Icon name="dashboard" size={15} />
        Volver al resumen
      </Link>
    </main>
  );
}
