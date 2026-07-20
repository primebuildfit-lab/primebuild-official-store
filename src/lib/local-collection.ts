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
