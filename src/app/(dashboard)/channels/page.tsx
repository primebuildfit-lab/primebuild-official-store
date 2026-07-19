import type { Metadata } from "next";
import { Card, Icon, Panel, StoreNotConnected, type IconName } from "@/components/ds";
import { ModuleHeader, StoreSourceBadge } from "@/components/os/module-header";
import { isStoreConnected, storeDisplayDomain } from "@/server/integrations/store/config";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Canales de venta" };

/**
 * Honest overview of the store's external sales channels & marketing surfaces.
 *
 * These channels (Google Merchant, Meta, Pinterest, SEO, installed apps) are
 * configured and measured inside the Shopify admin. PrimeBuild Official Store is
 * read-only and does NOT ingest their metrics, so this page never fabricates
 * numbers — it explains each channel and links out to where it is managed.
 */

interface Channel {
  name: string;
  desc: string;
  icon: IconName;
  /** Path under the Shopify admin for this store. */
  adminPath: string;
}

const CHANNELS: Channel[] = [
  { name: "Marketing", icon: "megaphone", desc: "Campañas, automatizaciones y actividad de marketing de la tienda.", adminPath: "marketing" },
  { name: "Google & YouTube (Merchant)", icon: "globe", desc: "Sincronización del catálogo con Google Merchant y anuncios de Shopping.", adminPath: "apps" },
  { name: "Meta (Facebook & Instagram)", icon: "users", desc: "Catálogo y tienda en Facebook e Instagram.", adminPath: "apps" },
  { name: "Pinterest", icon: "sparkles", desc: "Publicación del catálogo y pines de producto en Pinterest.", adminPath: "apps" },
  { name: "SEO y tienda online", icon: "trending-up", desc: "Preferencias de SEO, metadatos y tema de la tienda online.", adminPath: "online_store/preferences" },
  { name: "Aplicaciones instaladas", icon: "package", desc: "Apps y canales de venta conectados a la tienda.", adminPath: "apps" },
];

/** Derive the Shopify admin store handle from a *.myshopify.com domain. */
function storeHandle(domain: string | null): string | null {
  if (!domain) return null;
  const m = domain.match(/^([^.]+)\.myshopify\.com$/i);
  return m?.[1] ?? null;
}

export default function ChannelsPage() {
  const connected = isStoreConnected();
  const domain = storeDisplayDomain();
  const handle = storeHandle(domain);
  const adminBase = handle ? `https://admin.shopify.com/store/${handle}` : null;

  return (
    <div>
      <ModuleHeader id="channels">
        <StoreSourceBadge connected={connected} />
      </ModuleHeader>

      <Panel className="mb-6" icon="megaphone" title="Canales de venta y marketing">
        <p className="max-w-3xl text-sm text-muted">
          Los canales externos (Google Merchant, Meta, Pinterest, SEO) y las apps instaladas se
          configuran y se miden dentro del panel de Shopify. PrimeBuild Official Store es de solo
          lectura y no ingiere sus métricas, así que aquí no se inventan cifras: cada canal se explica
          y se enlaza a donde se administra.
        </p>
      </Panel>

      {!connected ? (
        <StoreNotConnected />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {CHANNELS.map((ch) => {
            const href = adminBase ? `${adminBase}/${ch.adminPath}` : null;
            const inner = (
              <Card interactive={!!href} className="h-full p-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-surface-muted text-accent">
                    <Icon name={ch.icon} size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{ch.name}</p>
                    <p className="mt-1 text-xs text-muted">{ch.desc}</p>
                  </div>
                </div>
                <p className="mt-3 flex items-center gap-1 text-[0.7rem] text-faint">
                  {href ? (
                    <>
                      Abrir en el panel de Shopify
                      <Icon name="external-link" size={12} />
                    </>
                  ) : (
                    "Gestionado en el panel de Shopify"
                  )}
                </p>
              </Card>
            );
            return href ? (
              <a key={ch.name} href={href} target="_blank" rel="noreferrer noopener">
                {inner}
              </a>
            ) : (
              <div key={ch.name}>{inner}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
