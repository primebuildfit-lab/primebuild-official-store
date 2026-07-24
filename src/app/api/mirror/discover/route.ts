import { NextResponse } from "next/server";
import { shopifyQuery, StoreRequestError } from "@/server/integrations/store/shopify-client";
import { StoreNotConnectedError } from "@/server/integrations/store/config";
import type { ShopifyCatalogMirrorRecord } from "@/lib/catalog-mirror";

export const dynamic = "force-dynamic";

/**
 * Descubrimiento del catálogo para el ShopifyCatalogMirror (§9, §53).
 * SOLO LECTURA sobre el Admin API existente (cliente con guard anti-mutación).
 * Sin credenciales devuelve `connected: false` honesto. El stock del proveedor
 * viaja únicamente como `observedSupplierStock` — jamás como stock propio.
 */
export async function GET() {
  try {
    const data = await shopifyQuery<{
      products: {
        edges: Array<{
          node: {
            id: string;
            handle: string;
            title: string;
            descriptionHtml: string | null;
            vendor: string | null;
            productType: string | null;
            status: string;
            tags: string[];
            options: Array<{ name: string; values: string[] }>;
            featuredImage: { url: string } | null;
            media: { edges: Array<{ node: { preview: { image: { url: string } | null } | null } }> };
            collections: { edges: Array<{ node: { handle: string } }> };
            seo: { title: string | null; description: string | null } | null;
            variants: {
              edges: Array<{
                node: {
                  id: string;
                  title: string;
                  sku: string | null;
                  price: string;
                  inventoryQuantity: number | null;
                  selectedOptions: Array<{ name: string; value: string }>;
                };
              }>;
            };
          };
        }>;
      };
    }>(
      `query PrimeBuildMirrorDiscover($n: Int!) {
        products(first: $n, sortKey: UPDATED_AT, reverse: true) {
          edges {
            node {
              id
              handle
              title
              descriptionHtml
              vendor
              productType
              status
              tags
              options { name values }
              featuredImage { url }
              media(first: 5) { edges { node { preview { image { url } } } } }
              collections(first: 10) { edges { node { handle } } }
              seo { title description }
              variants(first: 50) {
                edges {
                  node {
                    id
                    title
                    sku
                    price
                    inventoryQuantity
                    selectedOptions { name value }
                  }
                }
              }
            }
          }
        }
      }`,
      { n: 50 },
    );

    const now = new Date().toISOString();
    const records: ShopifyCatalogMirrorRecord[] = data.products.edges.map(({ node }, i) => ({
      id: `mirror_${node.id.split("/").pop() ?? i}`,
      shopifyProductId: node.id,
      handle: node.handle,
      title: node.title,
      descriptionHtml: node.descriptionHtml ?? undefined,
      vendor: node.vendor ?? undefined,
      productType: node.productType ?? undefined,
      tags: node.tags,
      collections: node.collections.edges.map((e) => e.node.handle),
      mediaUrls: [
        ...(node.featuredImage ? [node.featuredImage.url] : []),
        ...node.media.edges.map((e) => e.node.preview?.image?.url).filter((u): u is string => Boolean(u)),
      ].filter((u, idx, arr) => arr.indexOf(u) === idx),
      seo:
        node.seo && (node.seo.title || node.seo.description)
          ? { title: node.seo.title ?? undefined, description: node.seo.description ?? undefined }
          : undefined,
      options: node.options,
      variants: node.variants.edges.map(({ node: v }) => ({
        shopifyVariantId: v.id,
        title: v.title,
        sku: v.sku ?? undefined,
        priceUsd: v.price,
        options: Object.fromEntries(v.selectedOptions.map((o) => [o.name, o.value])),
        observedSupplierStock: v.inventoryQuantity ?? undefined,
      })),
      status: (["ACTIVE", "DRAFT", "ARCHIVED"] as const).includes(
        node.status as "ACTIVE" | "DRAFT" | "ARCHIVED",
      )
        ? (node.status as "ACTIVE" | "DRAFT" | "ARCHIVED")
        : "UNKNOWN",
      source: "shopify_admin_api",
      fetchedAt: now,
      modes: ["TEMPLATE_ONLY", "CATALOG_METADATA", "MEDIA", "VARIANT_MAPPING", "OBSERVED_SUPPLIER_STOCK"],
      version: 1,
    }));

    return NextResponse.json({ connected: true, records });
  } catch (e) {
    if (e instanceof StoreNotConnectedError) {
      return NextResponse.json({
        connected: false,
        reason: "Credenciales de Shopify no configuradas (SHOPIFY_STORE_DOMAIN / SHOPIFY_ADMIN_ACCESS_TOKEN).",
      });
    }
    if (e instanceof StoreRequestError) {
      return NextResponse.json({ connected: false, reason: e.message });
    }
    return NextResponse.json(
      { connected: false, reason: e instanceof Error ? e.message : "Error desconocido" },
      { status: 500 },
    );
  }
}
