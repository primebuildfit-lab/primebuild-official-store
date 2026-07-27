import type { Metadata } from "next";
import { ShopShell } from "@/components/shop/shop-shell";
import "@/styles/shopify-clone.css";

export const metadata: Metadata = {
  title: { default: "PrimeBuild Official Store", template: "%s · PrimeBuild Official Store" },
  description:
    "Tienda oficial de inventario físico propio de PrimeBuild: stock real, envíos rápidos verificados, compras por volumen y precios principales en PB.",
};

/**
 * Client del ecosistema (Internal OS → Product Builder → Client): superficie
 * pública de la Official Store. Sin autoridad sobre su configuración — el
 * Commerce Admin decide catálogo, precios e inventario (AP-4.2 / AP-4.3).
 */
export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <ShopShell>{children}</ShopShell>;
}
