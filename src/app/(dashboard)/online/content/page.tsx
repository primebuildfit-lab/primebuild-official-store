import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/ds";
import { MediaBoard } from "@/components/os/media-board";

export const metadata: Metadata = { title: "Contenido y medios" };

/**
 * Contenido y medios (PBOS-001 · ORDEN 6). A reusable library for the catalog and
 * store. Media/documents need file storage that does not exist yet (uploading is
 * disabled, nothing invented); content blocks are reusable text the operator
 * defines and persist locally.
 */
export default function ContentPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Tienda online"
        title="Contenido y medios"
        description="Biblioteca reutilizable para productos, páginas y colecciones."
        icon="edit"
      />

      <Panel className="mb-6" icon="shield" title="Fuente reutilizable, sin inventar archivos">
        <p className="text-sm text-muted">
          Esta biblioteca alimenta productos, páginas, colecciones y diseño de tienda. Los medios y
          documentos requieren almacenamiento de archivos, que aún no está conectado: la subida está
          deshabilitada y nada se presenta como subido a Shopify. Los bloques de contenido se
          guardan localmente y no duplican la biblioteca de páginas o diseño.
        </p>
      </Panel>

      <MediaBoard />
    </div>
  );
}
