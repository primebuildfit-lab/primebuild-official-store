"use client";

import { useState } from "react";
import {
  Badge,
  DataTable,
  HonestState,
  SegmentedControl,
  type Column,
  type TabOption,
} from "@/components/ds";
import { useLocalCollection, localId } from "@/lib/local-collection";
import { validateContentBlock, type ContentBlock } from "@/lib/content";

/**
 * Contenido y medios (PBOS-001 · ORDEN 6). A reusable library for the catalog and
 * store. Media/documents need file storage that does not exist yet, so those
 * views are honestly empty and uploading is disabled — no file is invented and
 * nothing is presented as uploaded to Shopify. Content blocks are reusable text
 * the operator defines and persist locally.
 */

const VIEWS: TabOption[] = [
  { value: "medios", label: "Medios" },
  { value: "documentos", label: "Documentos" },
  { value: "bloques", label: "Bloques de contenido" },
  { value: "pendiente", label: "Contenido pendiente" },
  { value: "sin-alt", label: "Sin texto alternativo" },
  { value: "sin-uso", label: "Sin uso" },
  { value: "archivados", label: "Archivados" },
];

function NeedsStorage({ kind }: { kind: string }) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-border bg-surface/50 px-3 py-2 text-xs text-muted">
        <span>Requiere almacenamiento de archivos · no conectado</span>
        <button
          type="button"
          disabled
          title="No hay almacenamiento de medios conectado. La subida está deshabilitada."
          className="cursor-not-allowed rounded-lg border border-border px-2.5 py-1 text-faint opacity-60"
        >
          Subir
        </button>
      </div>
      <HonestState
        icon="box"
        title={`Aún no hay ${kind}.`}
        description="Los medios requieren almacenamiento de archivos, que aún no está conectado. No se inventan archivos ni se presenta nada como subido a Shopify."
      />
    </div>
  );
}

function ContentBlocks() {
  const blocks = useLocalCollection<ContentBlock>("content:blocks");
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  function add() {
    const parsed = validateContentBlock(blocks.items, { name });
    if (!parsed.ok) return setError(parsed.error ?? "No válido.");
    blocks.add({
      id: localId(),
      name: name.trim(),
      body: body.trim(),
      status: "borrador",
      updatedAt: new Date().toISOString(),
    });
    setName("");
    setBody("");
    setError(null);
  }

  const columns: Column<ContentBlock>[] = [
    { key: "name", header: "Bloque", render: (r) => <span className="font-medium">{r.name}</span> },
    {
      key: "body",
      header: "Contenido",
      render: (r) => (
        <span className="line-clamp-1 max-w-md text-muted">
          {r.body || <span className="text-faint">—</span>}
        </span>
      ),
    },
    { key: "status", header: "Estado", render: (r) => <Badge kind="neutral">{r.status}</Badge> },
    { key: "src", header: "Fuente", render: () => <Badge kind="neutral">Local</Badge> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) => (
        <button
          type="button"
          onClick={() => blocks.remove(r.id)}
          className="text-xs text-muted hover:text-foreground"
        >
          Eliminar
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 rounded-xl border border-border bg-surface/50 p-3">
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-muted">
            Nombre
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="p. ej. Beneficios del producto"
              className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <button
            type="button"
            onClick={add}
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Crear bloque
          </button>
          <span className="ml-auto text-[0.68rem] text-faint">
            Guardado local · reutilizable en productos, páginas y colecciones
          </span>
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Contenido reutilizable (opcional)…"
          rows={2}
          className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      {error ? <p className="mb-3 text-xs text-warn">{error}</p> : null}
      <DataTable
        columns={columns}
        rows={blocks.items}
        getKey={(r) => r.id}
        emptyMessage="Aún no hay bloques de contenido. Créalos arriba; se guardan localmente."
      />
    </div>
  );
}

export function MediaBoard() {
  const [view, setView] = useState("medios");
  return (
    <div>
      <SegmentedControl
        options={VIEWS}
        value={view}
        onChange={setView}
        className="mb-4 flex-wrap"
      />
      {view === "medios" ? <NeedsStorage kind="medios" /> : null}
      {view === "documentos" ? <NeedsStorage kind="documentos" /> : null}
      {view === "bloques" ? <ContentBlocks /> : null}
      {view === "pendiente" ? (
        <HonestState
          icon="box"
          title="Sin contenido pendiente."
          description="El contenido pendiente aparecerá cuando existan medios reales."
        />
      ) : null}
      {view === "sin-alt" ? (
        <HonestState
          icon="box"
          title="Sin medios sin texto alternativo."
          description="Requiere medios reales con almacenamiento; aún no hay ninguno."
        />
      ) : null}
      {view === "sin-uso" ? (
        <HonestState
          icon="box"
          title="Sin medios sin uso."
          description="Requiere medios reales con almacenamiento; aún no hay ninguno."
        />
      ) : null}
      {view === "archivados" ? (
        <HonestState
          icon="box"
          title="Sin medios archivados."
          description="Requiere medios reales con almacenamiento; aún no hay ninguno."
        />
      ) : null}
    </div>
  );
}
