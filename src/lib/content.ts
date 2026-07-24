/**
 * Pure content logic (PBOS-001 · ORDEN 6). Content blocks are reusable text the
 * operator defines; media files require storage that does not exist yet, so none
 * are invented.
 */

export interface ContentBlock {
  id: string;
  name: string;
  body: string;
  status: "borrador" | "publicable" | "archivado";
  updatedAt: string;
}

export function validateContentBlock(
  existing: ContentBlock[],
  input: { id?: string; name: string },
): { ok: boolean; error?: string } {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "El nombre es obligatorio." };
  const others = existing.filter((b) => b.id !== input.id);
  if (others.some((b) => b.name.trim().toLowerCase() === name.toLowerCase())) {
    return { ok: false, error: "Ya existe un bloque con ese nombre." };
  }
  return { ok: true };
}
