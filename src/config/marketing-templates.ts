/**
 * Registro de plantillas visuales y claves de marketing
 * (MEGA-FABLE-004 004D).
 *
 * Cada plantilla es editable y direccionable por CLAVE ESTABLE: el propietario
 * puede pedir «Redesign PB_PRODUCT_LAUNCH.PRODUCT_HERO» sin ambigüedad. Las
 * plantillas en estado DRAFT/IN_REVIEW/APPROVED NO aparecen en la navegación
 * pública (solo PUBLISHED); hoy TODAS nacen en DRAFT — nada nuevo se publica
 * desde esta campaña.
 */

export const TEMPLATE_STATES = [
  "DRAFT",
  "IN_REVIEW",
  "APPROVED",
  "PUBLISHED",
  "SUPERSEDED",
  "ARCHIVED",
] as const;
export type TemplateState = (typeof TEMPLATE_STATES)[number];

export const CONTENT_SLOTS = [
  "eyebrow",
  "headline",
  "subheadline",
  "primaryCta",
  "secondaryCta",
  "visual",
  "productGrid",
  "collectionGrid",
  "trustProof",
  "shippingProof",
  "pbUsdBreakdown",
  "faq",
  "legalNote",
] as const;
export type ContentSlot = (typeof CONTENT_SLOTS)[number];

export interface MarketingSection {
  sectionKey: string;
  title: string;
  purpose: string;
  contentSlots: ContentSlot[];
}

export interface MarketingTemplate {
  pageKey: string;
  title: string;
  purpose: string;
  publicState: TemplateState;
  templateVersion: number;
  /** Ruta prevista cuando se publique (nunca en nav mientras sea DRAFT). */
  intendedRoute: string;
  sections: MarketingSection[];
}

const s = (
  sectionKey: string,
  title: string,
  purpose: string,
  contentSlots: ContentSlot[],
): MarketingSection => ({ sectionKey, title, purpose, contentSlots });

export const MARKETING_TEMPLATES: MarketingTemplate[] = [
  {
    pageKey: "PB_HOME",
    title: "Home pública",
    purpose: "Portada del storefront (YA PUBLICADA vía clon del theme).",
    publicState: "PUBLISHED",
    templateVersion: 1,
    intendedRoute: "/shop",
    sections: [
      s("PB_HOME.HERO_PRIMARY", "Hero principal", "Propuesta de valor con vídeo", ["headline", "primaryCta", "visual"]),
      s("PB_HOME.COLLECTION_BENTO", "Bento de colecciones", "Descubrimiento por colección", ["collectionGrid"]),
      s("PB_HOME.FEATURED_STRIPS", "Franjas destacadas", "Productos por categoría", ["productGrid", "primaryCta"]),
      s("PB_HOME.CATEGORY_STORY", "Historias de categoría", "Narrativa Sport/Essentials", ["eyebrow", "headline", "subheadline", "primaryCta"]),
    ],
  },
  {
    pageKey: "PB_PRODUCT_LAUNCH",
    title: "Product Launch",
    purpose: "Lanzamiento de un producto con stock propio.",
    publicState: "DRAFT",
    templateVersion: 1,
    intendedRoute: "/shop/launch/[handle]",
    sections: [
      s("PB_PRODUCT_LAUNCH.PRODUCT_HERO", "Hero del producto", "Media + claim honesto del producto", ["eyebrow", "headline", "visual", "primaryCta"]),
      s("PB_PRODUCT_LAUNCH.PRICE_BLOCK", "Bloque de precio", "PB primario + USD + ahorro real", ["pbUsdBreakdown"]),
      s("PB_PRODUCT_LAUNCH.STOCK_PROOF", "Prueba de stock", "Unidades reales del ledger", ["trustProof"]),
      s("PB_PRODUCT_LAUNCH.FAQ", "FAQ del producto", "Dudas frecuentes", ["faq", "legalNote"]),
    ],
  },
  {
    pageKey: "PB_COLLECTION_CAMPAIGN",
    title: "Collection Campaign",
    purpose: "Campaña sobre una colección espejada.",
    publicState: "DRAFT",
    templateVersion: 1,
    intendedRoute: "/shop/campaign/collection/[handle]",
    sections: [
      s("PB_COLLECTION_CAMPAIGN.HERO", "Hero de colección", "Imagen de colección + promesa", ["headline", "visual", "primaryCta"]),
      s("PB_COLLECTION_CAMPAIGN.GRID", "Grid de campaña", "Productos públicos de la colección", ["productGrid"]),
    ],
  },
  {
    pageKey: "PB_SEASONAL",
    title: "Seasonal Campaign",
    purpose: "Campaña estacional (rebajas/temporada) sin urgencia falsa.",
    publicState: "DRAFT",
    templateVersion: 1,
    intendedRoute: "/shop/campaign/seasonal/[slug]",
    sections: [
      s("PB_SEASONAL.HERO", "Hero estacional", "Tema + periodo REAL de la campaña", ["eyebrow", "headline", "subheadline", "primaryCta", "legalNote"]),
      s("PB_SEASONAL.GRID", "Selección estacional", "Productos elegidos por el operador", ["productGrid"]),
    ],
  },
  {
    pageKey: "PB_FAST_SHIPPING",
    title: "Fast Shipping Campaign",
    purpose: "Campaña de envío rápido SOLO con SLA verificado.",
    publicState: "DRAFT",
    templateVersion: 1,
    intendedRoute: "/shop/campaign/fast-shipping",
    sections: [
      s("PB_FAST_SHIPPING.HERO", "Hero envío rápido", "Promesa con evidencia (SLA/corte)", ["headline", "shippingProof", "primaryCta"]),
      s("PB_FAST_SHIPPING.ELIGIBLE_GRID", "Grid elegible", "Solo productos con veredicto ⚡", ["productGrid"]),
    ],
  },
  {
    pageKey: "PB_BULK_BUYER",
    title: "Bulk Buyer Landing",
    purpose: "Aterrizaje B2B (YA PUBLICADA como /shop/business).",
    publicState: "PUBLISHED",
    templateVersion: 1,
    intendedRoute: "/shop/business",
    sections: [
      s("PB_BULK_BUYER.QUANTITY_VALUE", "Valor por cantidad", "Por qué comprar volumen aquí", ["headline", "subheadline", "primaryCta"]),
      s("PB_BULK_BUYER.PROCESS", "Proceso", "Matriz→reserva→envío", ["trustProof", "faq"]),
    ],
  },
  {
    pageKey: "PB_WAREHOUSE_ARRIVAL",
    title: "Warehouse Arrival",
    purpose: "Anuncio de llegada de stock al almacén (recepción real).",
    publicState: "DRAFT",
    templateVersion: 1,
    intendedRoute: "/shop/campaign/arrival/[receiptId]",
    sections: [
      s("PB_WAREHOUSE_ARRIVAL.PROOF", "Prueba de llegada", "Recepción del ledger con fecha", ["headline", "trustProof", "productGrid"]),
    ],
  },
  {
    pageKey: "PB_STOCK_DROP",
    title: "New Stock Drop",
    purpose: "Drop de unidades nuevas con inventario demostrable.",
    publicState: "DRAFT",
    templateVersion: 1,
    intendedRoute: "/shop/campaign/drop/[slug]",
    sections: [
      s("PB_STOCK_DROP.INVENTORY_PROOF", "Prueba de inventario", "Unidades disponibles REALES", ["headline", "trustProof", "productGrid", "primaryCta"]),
    ],
  },
  {
    pageKey: "PB_LIMITED_OWNED",
    title: "Limited Owned Inventory",
    purpose: "Escasez SOLO cuando el ledger la demuestra (available bajo).",
    publicState: "DRAFT",
    templateVersion: 1,
    intendedRoute: "/shop/campaign/limited",
    sections: [
      s("PB_LIMITED_OWNED.REAL_SCARCITY", "Escasez real", "available<=umbral del ledger; sin contadores falsos", ["headline", "trustProof", "productGrid", "legalNote"]),
    ],
  },
  {
    pageKey: "PB_PB_SAVINGS",
    title: "PB Savings Campaign",
    purpose: "Campaña del ahorro PB (VA→VN→PB del contrato).",
    publicState: "DRAFT",
    templateVersion: 1,
    intendedRoute: "/shop/campaign/pb-savings",
    sections: [
      s("PB_PB_SAVINGS.PRICE_BREAKDOWN", "Desglose de precio", "VA/VN/PB/ahorro calculados en vivo", ["pbUsdBreakdown", "primaryCta", "legalNote"]),
    ],
  },
  {
    pageKey: "PB_SPORT_LANDING",
    title: "Sport Category Landing",
    purpose: "Aterrizaje de la familia SPORT.",
    publicState: "DRAFT",
    templateVersion: 1,
    intendedRoute: "/shop/campaign/sport",
    sections: [
      s("PB_SPORT_LANDING.HERO", "Hero Sport", "Disciplinas + colecciones", ["headline", "collectionGrid", "primaryCta"]),
    ],
  },
  {
    pageKey: "PB_ESSENTIALS_LANDING",
    title: "Prime Essentials Landing",
    purpose: "Aterrizaje de Prime Essentials.",
    publicState: "DRAFT",
    templateVersion: 1,
    intendedRoute: "/shop/campaign/essentials",
    sections: [
      s("PB_ESSENTIALS_LANDING.HERO", "Hero Essentials", "Fundamentos + recuperación", ["headline", "collectionGrid", "primaryCta"]),
    ],
  },
  {
    pageKey: "PB_EMAIL_CAPTURE",
    title: "Email Capture",
    purpose: "Captura de email (requiere backend de email real: owner gate).",
    publicState: "DRAFT",
    templateVersion: 1,
    intendedRoute: "/shop/join",
    sections: [
      s("PB_EMAIL_CAPTURE.FORM", "Formulario", "Solo cuando exista backend que envíe de verdad", ["headline", "subheadline", "primaryCta", "legalNote"]),
    ],
  },
  {
    pageKey: "PB_WAITLIST",
    title: "Waitlist",
    purpose: "Lista de espera por producto agotado (con backend real).",
    publicState: "DRAFT",
    templateVersion: 1,
    intendedRoute: "/shop/waitlist/[handle]",
    sections: [
      s("PB_WAITLIST.SIGNUP", "Alta en lista", "Aviso al reponer, sin promesas de fecha", ["headline", "primaryCta", "legalNote"]),
    ],
  },
  {
    pageKey: "PB_REFERRAL",
    title: "Referral / Partner Campaign",
    purpose: "Campaña de referidos (integra el programa real de affiliates).",
    publicState: "DRAFT",
    templateVersion: 1,
    intendedRoute: "/shop/partners",
    sections: [
      s("PB_REFERRAL.VALUE", "Propuesta a partners", "Enlaza al programa de afiliados real", ["headline", "subheadline", "primaryCta", "legalNote"]),
    ],
  },
];

export function getTemplate(pageKey: string): MarketingTemplate | undefined {
  return MARKETING_TEMPLATES.find((t) => t.pageKey === pageKey);
}

export function getSection(fullKey: string): MarketingSection | undefined {
  const dot = fullKey.indexOf(".");
  if (dot < 0) return undefined;
  return getTemplate(fullKey.slice(0, dot))?.sections.find((x) => x.sectionKey === fullKey);
}

/** Solo lo PUBLISHED puede aparecer en navegación pública. */
export function isPubliclyNavigable(t: MarketingTemplate): boolean {
  return t.publicState === "PUBLISHED";
}
