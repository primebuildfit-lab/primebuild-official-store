"use client";

import { RewardsBar, SignupModal, StoreFooter, StoreHeader } from "./storefront-chrome";

/**
 * Shell del storefront (PBOS-SCLP-FABLE-002): reproducción fiel del chrome del
 * Shopify real (rewards bar → header → contenido → footer completo + modal de
 * bienvenida por sesión). Sigue siendo el Client de la Official Store: el
 * inventario, pedidos y precios PB son propios; nada depende del runtime del
 * theme de Shopify.
 */
export function ShopShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="pbsf">
      <RewardsBar />
      <StoreHeader />
      <main className="pbsf-main">{children}</main>
      <StoreFooter />
      <SignupModal />
    </div>
  );
}
