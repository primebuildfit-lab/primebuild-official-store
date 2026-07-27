#!/usr/bin/env node
/**
 * Verifica la integridad de los artefactos versionados en `vendor/`
 * (ORDER-007 §7: la dependencia compartida debe ser verificable y reproducible).
 * Falla con código 1 si falta el archivo o el SHA-256 no coincide.
 */
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const ARTIFACTS = [
  {
    file: "vendor/platform-nexus-app-surface-0.1.1.tgz",
    sha256: "d1741e9fc63aa81bb8d37b55e6c57f4a58c9daa559c2b0c2c74388ce07400a7c",
  },
];

let failed = 0;
for (const artifact of ARTIFACTS) {
  const path = join(root, artifact.file);
  if (!existsSync(path)) {
    console.error(`FALTA  ${artifact.file}`);
    failed += 1;
    continue;
  }
  const actual = createHash("sha256").update(readFileSync(path)).digest("hex");
  if (actual !== artifact.sha256) {
    console.error(`SHA-256 NO COINCIDE  ${artifact.file}\n  esperado: ${artifact.sha256}\n  obtenido: ${actual}`);
    failed += 1;
    continue;
  }
  console.log(`OK  ${artifact.file}  sha256=${actual}`);
}

process.exit(failed === 0 ? 0 : 1);
