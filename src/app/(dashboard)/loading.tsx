import { Spinner } from "@/components/ds";

/** Honest loading state for dashboard routes while server data resolves. */
export default function Loading() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted">
      <Spinner />
      <p className="text-sm">Cargando…</p>
    </div>
  );
}
