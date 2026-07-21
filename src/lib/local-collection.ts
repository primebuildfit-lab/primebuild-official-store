"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * A tiny, SSR-safe localStorage-backed collection (PBOS-001). It is LOCAL DRAFT
 * storage only — it is not a server, not Shopify, and not a canonical store. The
 * commerce admin has no backend yet, so operator-created drafts (purchase plans,
 * purchase orders, receipts, manual supplier/category entries) persist here and
 * are always labelled as local in the UI. It stores only what the operator
 * enters — it never seeds or invents data.
 *
 * `ready` is false during SSR and the first client render so callers can avoid a
 * hydration flash and can distinguish "still loading" from "genuinely empty".
 */

const PREFIX = "pbos:local:";

export function readLocal<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function writeLocal<T>(key: string, items: T[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(items));
  } catch {
    /* quota or serialization failure — drafts are best-effort local storage */
  }
}

export interface LocalCollection<T> {
  items: T[];
  ready: boolean;
  add: (item: T) => void;
  update: (id: string, patch: Partial<T>) => void;
  remove: (id: string) => void;
  replaceAll: (items: T[]) => void;
}

/**
 * Manage a keyed local collection of records that each carry an `id`. Reads on
 * mount, persists on every change. Purely local; no network, no side effects.
 */
export function useLocalCollection<T extends { id: string }>(key: string): LocalCollection<T> {
  const [items, setItems] = useState<T[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(readLocal<T>(key));
    setReady(true);
  }, [key]);

  const persist = useCallback(
    (next: T[]) => {
      setItems(next);
      writeLocal(key, next);
    },
    [key],
  );

  const add = useCallback((item: T) => persist([...readLocal<T>(key), item]), [key, persist]);

  const update = useCallback(
    (id: string, patch: Partial<T>) =>
      persist(readLocal<T>(key).map((it) => (it.id === id ? { ...it, ...patch } : it))),
    [key, persist],
  );

  const remove = useCallback(
    (id: string) => persist(readLocal<T>(key).filter((it) => it.id !== id)),
    [key, persist],
  );

  return { items, ready, add, update, remove, replaceAll: persist };
}

/** A short unique id for local drafts. */
export function localId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── Versioned collections ───────────────────────────────────────────────────
// A schema-versioned envelope on top of the same local store. Used by the
// inventory workspace (movements, warehouses, transfers, counts, policies) which
// need a schema version, read validation, and safe degradation on corrupt data.
// It is the SAME engine (readLocal/writeLocal families) — not a competing one.

interface Envelope<T> {
  scope: "local";
  v: number;
  updatedAt: string;
  items: T[];
}

/**
 * Read a versioned collection. Accepts a legacy bare array (v=0) and re-wraps it,
 * validates every item with `validate`, and drops anything invalid so corrupt or
 * partially-migrated data degrades safely instead of throwing. Valid previous
 * items are always preserved across a schema bump.
 */
export function readVersioned<T>(
  key: string,
  schemaVersion: number,
  validate: (x: unknown) => x is T,
): { items: T[]; storedVersion: number; updatedAt: string | null } {
  if (typeof window === "undefined") {
    return { items: [], storedVersion: schemaVersion, updatedAt: null };
  }
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return { items: [], storedVersion: schemaVersion, updatedAt: null };
    const parsed: unknown = JSON.parse(raw);
    const isEnvelope = parsed !== null && typeof parsed === "object" && "items" in parsed;
    const rawItems = Array.isArray(parsed)
      ? parsed
      : isEnvelope && Array.isArray((parsed as Envelope<T>).items)
        ? (parsed as Envelope<T>).items
        : [];
    const storedVersion = Array.isArray(parsed) ? 0 : Number((parsed as Envelope<T>).v ?? 0);
    const updatedAt =
      !Array.isArray(parsed) && isEnvelope ? ((parsed as Envelope<T>).updatedAt ?? null) : null;
    const items = (rawItems as unknown[]).filter((x): x is T => {
      try {
        return validate(x);
      } catch {
        return false;
      }
    });
    return { items, storedVersion, updatedAt };
  } catch {
    return { items: [], storedVersion: schemaVersion, updatedAt: null };
  }
}

export function writeVersioned<T>(key: string, schemaVersion: number, items: T[]): void {
  if (typeof window === "undefined") return;
  try {
    const env: Envelope<T> = {
      scope: "local",
      v: schemaVersion,
      updatedAt: new Date().toISOString(),
      items,
    };
    window.localStorage.setItem(PREFIX + key, JSON.stringify(env));
  } catch {
    /* best-effort local storage */
  }
}

export interface VersionedCollection<T> extends LocalCollection<T> {
  storedVersion: number;
  updatedAt: string | null;
}

/** Manage a schema-versioned collection with read validation. */
export function useVersionedCollection<T extends { id: string }>(
  key: string,
  schemaVersion: number,
  validate: (x: unknown) => x is T,
): VersionedCollection<T> {
  const [items, setItems] = useState<T[]>([]);
  const [ready, setReady] = useState(false);
  const [meta, setMeta] = useState<{ storedVersion: number; updatedAt: string | null }>({
    storedVersion: schemaVersion,
    updatedAt: null,
  });

  useEffect(() => {
    const r = readVersioned<T>(key, schemaVersion, validate);
    setItems(r.items);
    setMeta({ storedVersion: r.storedVersion, updatedAt: r.updatedAt });
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, schemaVersion]);

  const persist = useCallback(
    (next: T[]) => {
      setItems(next);
      writeVersioned(key, schemaVersion, next);
    },
    [key, schemaVersion],
  );

  const read = useCallback(
    () => readVersioned<T>(key, schemaVersion, validate).items,
    [key, schemaVersion, validate],
  );

  const add = useCallback((item: T) => persist([...read(), item]), [read, persist]);
  const update = useCallback(
    (id: string, patch: Partial<T>) =>
      persist(read().map((it) => (it.id === id ? { ...it, ...patch } : it))),
    [read, persist],
  );
  const remove = useCallback(
    (id: string) => persist(read().filter((it) => it.id !== id)),
    [read, persist],
  );

  return { items, ready, add, update, remove, replaceAll: persist, ...meta };
}

/**
 * An append-only ledger. Exposes only `append` — never update or remove — so the
 * movement history can never be edited or deleted (corrections are compensating
 * movements). Same local engine, versioned envelope.
 */
export function useLedger<T extends { id: string }>(
  key: string,
  schemaVersion: number,
  validate: (x: unknown) => x is T,
): {
  entries: T[];
  ready: boolean;
  append: (entry: T) => void;
  appendMany: (entries: T[]) => void;
} {
  const col = useVersionedCollection<T>(key, schemaVersion, validate);
  const append = useCallback((entry: T) => col.add(entry), [col]);
  const appendMany = useCallback(
    (entries: T[]) =>
      col.replaceAll([...readVersioned<T>(key, schemaVersion, validate).items, ...entries]),
    [key, schemaVersion, validate, col],
  );
  return { entries: col.items, ready: col.ready, append, appendMany };
}
