"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  ExternalLinkAction,
  Icon,
  SegmentedControl,
  UnsavedChangesBar,
  type TabOption,
} from "@/components/ds";
import { useVersionedCollection, useLocalCollection, localId } from "@/lib/local-collection";
import type { CommercialCollection } from "@/lib/catalog";
import {
  BLOCK_TYPES,
  STORE_DEF_SCHEMA_VERSION,
  defaultDefinition,
  diffSummary,
  isStoreDefinition,
  validateDefinition,
  type BlockType,
  type StoreDefinition,
  type StoreRevision,
} from "@/lib/store-definition";

/**
 * The StoreDefinition editor (PBOS-001 · ORDEN 17). Edits the ONE local, versioned
 * store definition — reused by design, pages and preview. It references canonical
 * products/collections/content by id, introduces no demo content, blocks the
 * newsletter block (needs a real provider), and does not pretend to edit Shopify's
 * theme. Saving validates and creates a revision; restoring creates a NEW revision
 * without deleting the replaced one; nothing publishes or syncs.
 */

const isRevision = (x: unknown): x is StoreRevision =>
  x !== null && typeof x === "object" && typeof (x as StoreRevision).id === "string";

const TABS: TabOption[] = [
  { value: "estructura", label: "Estructura" },
  { value: "navegacion", label: "Navegación" },
  { value: "paginas", label: "Páginas" },
  { value: "destacadas", label: "Colecciones destacadas" },
  { value: "bloques", label: "Bloques" },
  { value: "diseno", label: "Diseño" },
  { value: "politicas", label: "Políticas" },
  { value: "seo", label: "SEO" },
  { value: "shopify", label: "Shopify" },
];

export function StoreDefinitionEditor({ initialTab = "estructura" }: { initialTab?: string }) {
  const store = useVersionedCollection<StoreDefinition>(
    "store:definition",
    STORE_DEF_SCHEMA_VERSION,
    isStoreDefinition,
  );
  const revisions = useVersionedCollection<StoreRevision>(
    "store:revisions",
    STORE_DEF_SCHEMA_VERSION,
    isRevision,
  );
  const commercial = useLocalCollection<CommercialCollection>("catalog:commercial");

  const [tab, setTab] = useState(initialTab);
  const [draft, setDraft] = useState<StoreDefinition | null>(null);
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const stored = store.items[0] ?? null;

  useEffect(() => {
    if (store.ready && draft === null) setDraft(stored ?? defaultDefinition());
  }, [store.ready, stored, draft]);

  const changes = useMemo(
    () => (draft && stored ? diffSummary(stored, draft) : []),
    [draft, stored],
  );

  if (!draft) return <p className="text-sm text-faint">Cargando definición local…</p>;

  function set(patch: Partial<StoreDefinition>) {
    setDraft((d) => (d ? { ...d, ...patch } : d));
    setDirty(true);
  }

  function save() {
    const res = validateDefinition(draft!);
    setErrors(res.errors);
    if (!res.ok) return;
    store.replaceAll([draft!]);
    const number = revisions.items.length + 1;
    revisions.add({
      id: localId(),
      number,
      parentId: revisions.items.at(-1)?.id ?? null,
      actor: "operador-local",
      at: new Date().toISOString(),
      reason: "Guardado de definición",
      snapshot: draft!,
      status: "borrador",
    });
    setDirty(false);
  }

  function restore(rev: StoreRevision) {
    setDraft(rev.snapshot);
    store.replaceAll([rev.snapshot]);
    revisions.add({
      id: localId(),
      number: revisions.items.length + 1,
      parentId: revisions.items.at(-1)?.id ?? null,
      actor: "operador-local",
      at: new Date().toISOString(),
      reason: `Restaurada desde revisión #${rev.number}`,
      snapshot: rev.snapshot,
      status: "borrador",
    });
    setDirty(false);
  }

  return (
    <div>
      <SegmentedControl options={TABS} value={tab} onChange={setTab} className="mb-4 flex-wrap" />

      {tab === "estructura" ? (
        <div className="flex flex-col gap-2">
          <Text
            label="Nombre de la tienda"
            value={draft.identity.name}
            onChange={(v) => set({ identity: { ...draft.identity, name: v } })}
          />
          <Text
            label="Tagline (opcional)"
            value={draft.identity.tagline ?? ""}
            onChange={(v) => set({ identity: { ...draft.identity, tagline: v } })}
          />
          <p className="text-xs text-faint">
            Header, home, colecciones, fichas, búsqueda, carrito y footer se componen a partir de
            esta única definición. No se copian productos ni medios: se referencian.
          </p>
        </div>
      ) : null}

      {tab === "navegacion" ? (
        <ListEditor
          label="Entradas de navegación"
          items={draft.nav.map((n) => ({ id: n.id, primary: n.label, secondary: n.ref }))}
          placeholder="Etiqueta del menú"
          onAdd={(label) => set({ nav: [...draft.nav, { id: localId(), label }] })}
          onRemove={(id) => set({ nav: draft.nav.filter((n) => n.id !== id) })}
        />
      ) : null}

      {tab === "paginas" ? (
        <PagesEditor
          pages={draft.pages}
          onAdd={(title, slug) => set({ pages: [...draft.pages, { id: localId(), title, slug }] })}
          onRemove={(id) => set({ pages: draft.pages.filter((p) => p.id !== id) })}
        />
      ) : null}

      {tab === "destacadas" ? (
        <FeaturedEditor
          featured={draft.featuredCollections}
          collections={commercial.items}
          onToggle={(id) =>
            set({
              featuredCollections: draft.featuredCollections.includes(id)
                ? draft.featuredCollections.filter((x) => x !== id)
                : [...draft.featuredCollections, id],
            })
          }
        />
      ) : null}

      {tab === "bloques" ? (
        <BlocksEditor
          blocks={draft.homeBlocks}
          onAdd={(type) => set({ homeBlocks: [...draft.homeBlocks, { id: localId(), type }] })}
          onRemove={(id) => set({ homeBlocks: draft.homeBlocks.filter((b) => b.id !== id) })}
        />
      ) : null}

      {tab === "diseno" ? (
        <div className="flex flex-col gap-2">
          <Text
            label="Logo (referencia)"
            value={draft.tokens.logoRef ?? ""}
            onChange={(v) => set({ tokens: { ...draft.tokens, logoRef: v } })}
          />
          <Text
            label="Tipografía"
            value={draft.tokens.typography ?? ""}
            onChange={(v) => set({ tokens: { ...draft.tokens, typography: v } })}
          />
          <Text
            label="Escala"
            value={draft.tokens.scale ?? ""}
            onChange={(v) => set({ tokens: { ...draft.tokens, scale: v } })}
          />
          <Text
            label="Radios"
            value={draft.tokens.radius ?? ""}
            onChange={(v) => set({ tokens: { ...draft.tokens, radius: v } })}
          />
          <p className="text-xs text-faint">
            Tokens configurables locales. No se copia el tema visual de Shopify.
          </p>
        </div>
      ) : null}

      {tab === "politicas" ? (
        <ListEditor
          label="Páginas de políticas"
          items={draft.policies.map((p) => ({ id: p.id, primary: p.title }))}
          placeholder="Título de política (p. ej. Devoluciones)"
          onAdd={(title) => set({ policies: [...draft.policies, { id: localId(), title }] })}
          onRemove={(id) => set({ policies: draft.policies.filter((p) => p.id !== id) })}
        />
      ) : null}

      {tab === "seo" ? (
        <div className="flex flex-col gap-2">
          <Text
            label="Título SEO"
            value={draft.seo.title ?? ""}
            onChange={(v) => set({ seo: { ...draft.seo, title: v } })}
          />
          <Text
            label="Descripción SEO"
            value={draft.seo.description ?? ""}
            onChange={(v) => set({ seo: { ...draft.seo, description: v } })}
          />
        </div>
      ) : null}

      {tab === "shopify" ? (
        <div className="rounded-xl border border-border bg-surface/50 p-4 text-sm">
          <p className="mb-2 text-muted">
            El tema completo, el checkout y ciertas funciones pertenecen a Shopify. Aquí solo se
            define lo administrable de forma verificable; el resto se abre en Shopify.
          </p>
          <ExternalLinkAction
            href={null}
            system="el editor de tema de Shopify"
            disabledReason="URL de Shopify no verificada"
          >
            Abrir Theme Editor
          </ExternalLinkAction>
        </div>
      ) : null}

      {errors.length > 0 ? (
        <ul className="mt-3 list-disc pl-5 text-xs text-warn">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}

      {/* Revisions */}
      <div className="mt-6 rounded-xl border border-border bg-surface/40 p-3">
        <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-faint">
          Revisiones ({revisions.items.length})
        </p>
        {revisions.items.length === 0 ? (
          <p className="text-xs text-faint">Aún no hay revisiones. Guardar crea una.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {revisions.items
              .slice()
              .reverse()
              .map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 text-xs">
                  <span>
                    #{r.number} · {new Date(r.at).toLocaleString("es")} ·{" "}
                    <span className="text-faint">{r.reason}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => restore(r)}
                    className="text-accent hover:underline"
                  >
                    Restaurar
                  </button>
                </li>
              ))}
          </ul>
        )}
        <p className="mt-2 text-[0.66rem] text-faint">
          Restaurar crea una revisión nueva; no borra la reemplazada. Guardar no publica ni
          sincroniza.
        </p>
      </div>

      {changes.length > 0 ? (
        <p className="mt-3 text-[0.68rem] text-faint">Cambios sin guardar: {changes.join(" · ")}</p>
      ) : null}

      <UnsavedChangesBar visible={dirty} onSave={save} />
    </div>
  );
}

function Text({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </label>
  );
}

function ListEditor({
  label,
  items,
  placeholder,
  onAdd,
  onRemove,
}: {
  label: string;
  items: { id: string; primary: string; secondary?: string }[];
  placeholder: string;
  onAdd: (v: string) => void;
  onRemove: (id: string) => void;
}) {
  const [v, setV] = useState("");
  return (
    <div>
      <div className="mb-3 flex items-end gap-2">
        <label className="flex flex-1 flex-col gap-1 text-xs text-muted">
          {label}
          <input
            value={v}
            onChange={(e) => setV(e.target.value)}
            placeholder={placeholder}
            className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm outline-none"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            if (v.trim()) {
              onAdd(v.trim());
              setV("");
            }
          }}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
        >
          Añadir
        </button>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-faint">Sin elementos.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {items.map((it) => (
            <li
              key={it.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-2.5 py-1.5 text-sm"
            >
              <span>
                {it.primary}
                {it.secondary ? (
                  <span className="ml-1 text-xs text-faint">{it.secondary}</span>
                ) : null}
              </span>
              <button
                type="button"
                onClick={() => onRemove(it.id)}
                className="text-faint hover:text-foreground"
              >
                <Icon name="x" size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PagesEditor({
  pages,
  onAdd,
  onRemove,
}: {
  pages: StoreDefinition["pages"];
  onAdd: (title: string, slug: string) => void;
  onRemove: (id: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Título
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Slug
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="acerca-de"
            className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm outline-none"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            if (title.trim() && slug.trim()) {
              onAdd(title.trim(), slug.trim());
              setTitle("");
              setSlug("");
            }
          }}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
        >
          Añadir página
        </button>
      </div>
      {pages.length === 0 ? (
        <p className="text-xs text-faint">Sin páginas.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {pages.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-2.5 py-1.5 text-sm"
            >
              <span>
                {p.title} <span className="font-mono text-xs text-faint">/{p.slug}</span>
              </span>
              <button
                type="button"
                onClick={() => onRemove(p.id)}
                className="text-faint hover:text-foreground"
              >
                <Icon name="x" size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FeaturedEditor({
  featured,
  collections,
  onToggle,
}: {
  featured: string[];
  collections: CommercialCollection[];
  onToggle: (id: string) => void;
}) {
  if (collections.length === 0)
    return (
      <p className="text-xs text-faint">
        No hay colecciones comerciales locales. Créalas en Catálogo → Colecciones.
      </p>
    );
  return (
    <div className="flex flex-wrap gap-1.5">
      {collections.map((c) => {
        const on = featured.includes(c.id);
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onToggle(c.id)}
            aria-pressed={on}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${on ? "border-primary/40 bg-primary/15 text-accent" : "border-border bg-surface text-muted hover:text-foreground"}`}
          >
            {c.name}
          </button>
        );
      })}
    </div>
  );
}

function BlocksEditor({
  blocks,
  onAdd,
  onRemove,
}: {
  blocks: StoreDefinition["homeBlocks"];
  onAdd: (type: BlockType) => void;
  onRemove: (id: string) => void;
}) {
  const [type, setType] = useState<BlockType>("hero");
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Tipo de bloque
          <select
            value={type}
            onChange={(e) => setType(e.target.value as BlockType)}
            className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm outline-none"
          >
            {BLOCK_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => onAdd(type)}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
        >
          Añadir bloque
        </button>
        <span className="text-[0.66rem] text-faint">
          Newsletter bloqueado (requiere proveedor real).
        </span>
        <button
          type="button"
          disabled
          title="Requiere un proveedor de newsletter real."
          className="cursor-not-allowed rounded-lg border border-border px-2.5 py-1.5 text-xs text-faint opacity-60"
        >
          newsletter
        </button>
      </div>
      {blocks.length === 0 ? (
        <p className="text-xs text-faint">
          Sin bloques. No se insertan contenidos, testimonios ni promociones ficticias.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {blocks.map((b) => (
            <li
              key={b.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-2.5 py-1.5 text-sm"
            >
              <Badge kind="neutral">{b.type}</Badge>
              <button
                type="button"
                onClick={() => onRemove(b.id)}
                className="text-faint hover:text-foreground"
              >
                <Icon name="x" size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
