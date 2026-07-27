/**
 * Construye el snapshot del mirror desde las capturas del Admin API
 * (PBOS-SCLP-FABLE-002). Entrada: los volcados JSON crudos del catálogo
 * activo (productos página 1, descripciones) + los datos de la página 2 y
 * colecciones embebidos abajo (capturados el 2026-07-24 en la misma sesión).
 * Salida: src/server/mirror/snapshot-2026-07-24.json con la forma del
 * contrato ShopifyCatalogMirror (fuente etiquetada, nunca "live").
 *
 * Uso: node scripts/mirror/build-snapshot.mjs <productos.json> <descripciones.json>
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const [productsFile, descFile] = process.argv.slice(2);
const CAPTURED_AT = "2026-07-24T04:00:00.000Z";
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const page1 = JSON.parse(readFileSync(productsFile, "utf8")).data.products.edges.map((e) => e.node);
const descs = new Map(
  JSON.parse(readFileSync(descFile, "utf8")).data.products.edges.map((e) => [
    e.node.handle,
    e.node.descriptionHtml,
  ]),
);

// Página 2 (2 productos restantes del catálogo activo), capturada aparte.
const page2 = [
  {
    id: "gid://shopify/Product/8459829706960",
    handle: "primebuild-adjustable-speed-jump-rope",
    title: "PrimeBuild™ Adjustable Speed Jump Rope",
    status: "ACTIVE", vendor: "PrimeBuild", productType: "essential",
    tags: ["cardio", "essential"],
    updatedAt: "2026-07-08T20:19:32Z", publishedAt: "2026-06-02T17:58:21Z",
    featuredImage: { url: "https://cdn.shopify.com/s/files/1/0670/7737/4160/files/32a26989a7138ebbdb6969917108199c.jpg?v=1780423105" },
    seo: { title: "PrimeBuild™ Adjustable Speed Jump Rope | Cardio & Endurance Training", description: "Improve endurance, burn calories and boost conditioning with the PrimeBuild™ Adjustable Speed Jump Rope." },
    collections: { edges: [] },
    options: [{ name: "Title", values: ["Default Title"] }],
    variants: { edges: [{ node: { id: "gid://shopify/ProductVariant/45029113921744", title: "Default Title", sku: "d8889edd-69d8-47a6-b819-b2de1fa12f68", price: "34.99", compareAtPrice: "0.00", inventoryQuantity: 0, selectedOptions: [{ name: "Title", value: "Default Title" }], image: { url: "https://cdn.shopify.com/s/files/1/0670/7737/4160/files/32a26989a7138ebbdb6969917108199c.jpg?v=1780423105" } } }] },
  },
  {
    id: "gid://shopify/Product/8459818729680",
    handle: "primebuild-auto-rebound-ab-roller",
    title: "PrimeBuild™ Auto-Rebound Ab Roller – Core Strength Trainer",
    status: "ACTIVE", vendor: "PrimeBuild", productType: "core",
    tags: ["core", "essential", "strength"],
    updatedAt: "2026-07-08T20:19:32Z", publishedAt: "2026-06-02T16:45:37Z",
    featuredImage: { url: "https://cdn.shopify.com/s/files/1/0670/7737/4160/files/c373f4d16cd1470591f727ffa25835c7.jpg?v=1780418748" },
    seo: { title: "PrimeBuild™ Auto-Rebound Ab Roller | Core Strength & Ab Training", description: "Build core strength and improve stability with the PrimeBuild™ Auto-Rebound Ab Roller." },
    collections: { edges: [] },
    options: [{ name: "Title", values: ["Default Title"] }],
    variants: { edges: [{ node: { id: "gid://shopify/ProductVariant/45029078597840", title: "Default Title", sku: "7ed66586-4057-4a10-8aaa-419938aee156", price: "35.34", compareAtPrice: "0.00", inventoryQuantity: 0, selectedOptions: [{ name: "Title", value: "Default Title" }], image: { url: "https://cdn.shopify.com/s/files/1/0670/7737/4160/files/c373f4d16cd1470591f727ffa25835c7.jpg?v=1780418748" } } }] },
  },
];

// Colecciones (39) capturadas vía Admin API: [handle, title, tagRule, imageUrl, count, sortOrder]
const CDN = "https://cdn.shopify.com/s/files/1/0670/7737/4160/collections/";
const COLLECTIONS = [
  ["activewear-womens", "Women's Activewear(I)", "womens-activewear", CDN + "998e926f-55f7-413b-a2ef-35bcf1aa3951.webp?v=1781957377", 7, "BEST_SELLING"],
  ["activewear", "Activewear", "activewear", CDN + "8f631030-f04c-4003-855a-a74cea696fc1.webp?v=1781957464", 23, "BEST_SELLING"],
  ["strength-training-essentials-1", "Strength Training Essentials", "strength", CDN + "G8LCBp-RfjaCa5U05E59Qg9ItqlpnDqcDVMUWnYvQ_5d2oVsKPX13gJCazTEVWUR8wljuewChzbkEUd7RhC5nX70Ffv2e1aDDej_xKE5pGNgMzhhErZwstFMNzon58VJZyY7V_XzurNmuPgdIH_cl22eQH-O6esSyiNjSnYODp69OWrMGeNFDhV.webp?v=1781957704", 57, "BEST_SELLING"],
  ["primebuild-essentials", "PrimeBuild Essentials", "essential", CDN + "b0964ebe-61dd-453d-9208-1b58774cd340.png?v=1783124384", 18, "BEST_SELLING"],
  ["activewear-mens", "Men's Activewear", "mens-activewear", CDN + "36773458-50aa-4351-a1a6-256799481fbe.webp?v=1781957934", 17, "BEST_SELLING"],
  ["recovery-mobility", "Recovery & Mobility", "recovery", CDN + "HhjS9xFsQeXmxmop3jn4CDblMNm9ZR0lpJVjthZjc76E82uWb5a-1XvH2NEWwSSprhwMeeebHzbfM8Io-iCvGwCokVRPSv4117oDek0rt4nOhQWPKMDfrdgu0RjmSlcOKpuGogIpi5OJxXgUHtY4kEPBiwH1LSxwnDYX_iVlVSxo6KAJZ-PsiOS.webp?v=1781958023", 9, "BEST_SELLING"],
  ["cardio-performance", "Cardio Performance", "cardio", CDN + "SRT6As2nCvZxX44Q3aFomxLG7PfIXaiLgISd23az86eqolZexRyakaloIIM7Stw3PpnEEZSOvXQ35ITvvWC-T7ZWsVSr7O4QXrEqhCWMMecbXUc-7PIlmhVAqpG0Lh0_KtwgjaCarjQaLUX181Zvn_WAo1ZZn-BVy8qgYl24AZUXFWvxAKUycBo.webp?v=1781958145", 18, "BEST_SELLING"],
  ["hydration-performance", "Hydration & Performance", "hydration", CDN + "hX6-FEC4WrVzZGb7XL5YlhICDfirPrZc9dTSHL4LWgtTpPjMe-tIfjFcKlyTVbzStX_yRjbc_Nx6zzQcYWgpBPz-G6Kf-vdf40ApVEd9SVrUkBogXwElJRB82seKpgOg1iYRNg4w9GLyHztyBmweGxfgRMuvcbc0gjF1DPaZHYsjLAY4T4qDS0G.webp?v=1781958238", 6, "BEST_SELLING"],
  ["vitamins-wellness", "PrimeBuild™ Vitamins & Wellness", "wellness", CDN + "image_2.webp?v=1781958328", 0, "BEST_SELLING"],
  ["performance-nutrition", "Performance Nutrition", "nutrition", CDN + "83f7e4fd-9f91-4f28-944c-3fde440e70bf.webp?v=1781958407", 0, "BEST_SELLING"],
  ["hydration-electrolytes", "PrimeBuild™ Hydration & Electrolytes", "electrolytes", CDN + "image_3.webp?v=1781958481", 0, "BEST_SELLING"],
  ["pre-workout-supplements", "PrimeBuild™ Pre-Workout", "preworkout", CDN + "image_1.webp?v=1781958558", 0, "BEST_SELLING"],
  ["creatine-supplements", "PrimeBuild™ Creatine", "creatine", CDN + "3017b8f4-ca86-4a46-88ed-1cdf3f72b098.webp?v=1781958620", 0, "BEST_SELLING"],
  ["primebuild™-whey-protein", "PrimeBuild™ Whey Protein", "whey", CDN + "e80a1174-9afe-406d-b266-b4e21cbb7467.webp?v=1781958678", 0, "BEST_SELLING"],
  ["core-strength-stability", "Core Strength & Stability", "core", CDN + "rRdw4ZxWCnUFMAcbHjiosffph8PTkVbQemQHmWL3xYBmkQ7FznQ-1ZJr53E63K4yA7IBik_fRk6z8jc92dmFNWlyEjRfnVA-ajuxWj-zS7YeViY-xcCQytiWinqKaDZIwva1rcZQzmJ-G3w7lXst4ofRGeSOjqIrn6BRcfZSmyGt7e1VqDVmmY5.webp?v=1781958791", 25, "BEST_SELLING"],
  ["sport", "SPORT", "Sport", CDN + "sport.png?v=1782740383", 63, "BEST_SELLING"],
  ["running", "RUNNING", "Run", CDN + "re.png?v=1782741009", 20, "BEST_SELLING"],
  ["gym-training", "GYM TRAINING", "Gym", CDN + "stregth_trainning_ea857a8d-a610-41ee-84b8-739853097cca.png?v=1782739994", 57, "BEST_SELLING"],
  ["cycling", "CYCLING", "bike", CDN + "cycling.png?v=1782740119", 3, "BEST_SELLING"],
  ["swimming", "SWIMMING", "Swim", CDN + "swi.png?v=1782741148", 6, "BEST_SELLING"],
  ["hiking-outdoor", "HIKING & OUTDOOR", "outdoor", CDN + "camping.png?v=1782740144", 9, "BEST_SELLING"],
  ["yoga-pilates", "YOGA & PILATES", "Yoga", CDN + "yoga.png?v=1782739970", 6, "BEST_SELLING"],
  ["road-running", "ROAD RUNNING", "road", CDN + "road_running.png?v=1782740723", 7, "BEST_SELLING"],
  ["trail-running", "TRAIL RUNNING", "trail", CDN + "trail_running.png?v=1782740081", 0, "BEST_SELLING"],
  ["track-field", "TRACK & FIELD", "track-field", CDN + "track.png?v=1782740065", 0, "BEST_SELLING"],
  ["strength-training", "STRENGTH TRAINING", "S training", CDN + "stregth_trainning.png?v=1782740010", 22, "BEST_SELLING"],
  ["functional-training", "FUNCTIONAL TRAINING", "funcional", CDN + "funtional_training.png?v=1782739951", 44, "BEST_SELLING"],
  ["pool-swimming", "POOL SWIMMING", "pool", CDN + "swimming.png?v=1782740043", 5, "BEST_SELLING"],
  ["open-water", "OPEN WATER", "open water", CDN + "opne_water.png?v=1782740028", 2, "BEST_SELLING"],
  ["inventario-propio", "inventario propio", "propio", null, 9, "BEST_SELLING"],
  ["boxing", "boxing", "box", CDN + "box.png?v=1782759510", 0, "BEST_SELLING"],
  ["golf", "golf", "golf", CDN + "golf.png?v=1782759547", 0, "BEST_SELLING"],
  ["baseball", "baseball", "baseball", CDN + "baseball.png?v=1782759582", 0, "BEST_SELLING"],
  ["soccer", "soccer", "soccer", CDN + "soccer.png?v=1782759619", 0, "BEST_SELLING"],
  ["volleyball", "volleyball", "volleyball", CDN + "bolyball_6697ab5d-8b38-4743-8903-3c46a0f65274.png?v=1782759665", 0, "BEST_SELLING"],
  ["basketball", "basketball", "basket", CDN + "basketball.png?v=1782759705", 0, "BEST_SELLING"],
  ["skiing", "skiing", "skiing", CDN + "esquiar_5c032f1a-d979-4b70-b58f-196c12c181c3.png?v=1782759744", 0, "BEST_SELLING"],
  ["all", "all", "all", null, 17, "BEST_SELLING"],
  ["new-arrivals-feed", "New Arrivals Feed", "new", null, 21, "CREATED_DESC"],
];

function hashOf(x) {
  return createHash("sha256").update(JSON.stringify(x)).digest("hex").slice(0, 16);
}

function toMirror(node) {
  const descriptionHtml = descs.get(node.handle);
  const rec = {
    id: `mirror_${node.id.split("/").pop()}`,
    shopifyProductId: node.id,
    handle: node.handle,
    title: node.title,
    descriptionHtml: descriptionHtml ?? undefined,
    vendor: node.vendor ?? undefined,
    productType: node.productType || undefined,
    tags: node.tags ?? [],
    collections: (node.collections?.edges ?? []).map((e) => e.node.handle),
    mediaUrls: [
      ...(node.featuredImage ? [node.featuredImage.url] : []),
      ...(node.variants?.edges ?? [])
        .map((e) => e.node.image?.url)
        .filter(Boolean),
    ].filter((u, i, a) => a.indexOf(u) === i),
    seo:
      node.seo && (node.seo.title || node.seo.description)
        ? { title: node.seo.title ?? undefined, description: node.seo.description ?? undefined }
        : undefined,
    options: node.options ?? [],
    variants: (node.variants?.edges ?? []).map(({ node: v }) => ({
      shopifyVariantId: v.id,
      title: v.title,
      sku: v.sku ?? undefined,
      priceUsd: v.price,
      compareAtPriceUsd: v.compareAtPrice && v.compareAtPrice !== "0.00" ? v.compareAtPrice : undefined,
      options: Object.fromEntries((v.selectedOptions ?? []).map((o) => [o.name, o.value])),
      imageUrl: v.image?.url ?? undefined,
      observedSupplierStock: v.inventoryQuantity ?? undefined,
    })),
    status: node.status,
    sourceStatus: node.status,
    publishedAt: node.publishedAt ?? undefined,
    updatedAtSource: node.updatedAt ?? undefined,
    source: "shopify_admin_api",
    fetchedAt: CAPTURED_AT,
    modes: ["TEMPLATE_ONLY", "CATALOG_METADATA", "MEDIA", "VARIANT_MAPPING", "OBSERVED_SUPPLIER_STOCK"],
    version: 1,
    syncState: "Synced",
  };
  rec.sourceHash = hashOf({ t: rec.title, p: rec.variants.map((v) => v.priceUsd), u: rec.updatedAtSource });
  return rec;
}

const products = [...page1, ...page2].map(toMirror);
const collections = COLLECTIONS.map(([handle, title, tagRule, imageUrl, productsCount, sortOrder]) => ({
  id: `mcol_${handle}`,
  handle,
  title,
  imageUrl: imageUrl ?? undefined,
  ruleTag: tagRule,
  productsCount,
  sortOrder,
  source: "shopify_admin_api",
  fetchedAt: CAPTURED_AT,
}));

const snapshot = {
  v: 1,
  kind: "shopify-catalog-snapshot",
  capturedAt: CAPTURED_AT,
  note: "Snapshot real del catálogo ACTIVO de primebuildfit (Admin API, solo lectura). No es sincronización en vivo: al importarse queda en estado Stale hasta que existan credenciales.",
  products,
  collections,
};

const out = join(root, "src", "server", "mirror", "snapshot-2026-07-24.json");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(snapshot));
console.log(`snapshot: ${products.length} productos, ${collections.length} colecciones → ${out}`);
console.log(`bytes: ${JSON.stringify(snapshot).length}`);
