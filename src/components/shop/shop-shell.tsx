"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCartLines } from "@/lib/official-store-data";

/**
 * Chrome público de PrimeBuild Official Store (Client). Identidad PrimeBuild
 * (chevron dorado, fondo profundo), navegación de tienda y aviso permanente de
 * modo cotización: sin proveedor financiero no se procesa dinero real.
 */

const NAV = [
  { href: "/shop", label: "Inicio" },
  { href: "/shop/catalog", label: "Tienda" },
  { href: "/shop/fast-shipping", label: "Envío rápido" },
  { href: "/shop/bulk", label: "Por volumen" },
  { href: "/shop/account", label: "Mi cuenta" },
];

export function ShopShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const cart = useCartLines();
  const count = cart.items.reduce((acc, l) => acc + l.quantity, 0);

  return (
    <div className="flex min-h-dvh flex-col bg-[#07080c] text-neutral-100">
      <div className="border-b border-amber-500/20 bg-amber-500/5 px-4 py-1.5 text-center text-[0.7rem] text-amber-300/90">
        Inventario físico propio · Precios principales en PB (modo cotización — sin dinero real hasta
        conectar proveedor) · USD siempre visible
      </div>
      <header className="sticky top-0 z-40 border-b border-neutral-800 bg-[#0a0b10]/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/shop" className="flex items-center gap-2.5">
            <Image src="/brand/primebuild-mark.png" alt="PrimeBuild" width={30} height={30} />
            <span className="flex flex-col leading-none">
              <span className="text-sm font-bold tracking-wide">PRIMEBUILD</span>
              <span className="text-[0.6rem] uppercase tracking-[0.2em] text-amber-400">
                Official Store
              </span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  pathname === n.href
                    ? "bg-neutral-800 text-white"
                    : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
                }`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/shop/cart"
            className="relative rounded-lg border border-neutral-700 px-3 py-1.5 text-sm hover:border-amber-400/60"
          >
            Carrito
            {count > 0 ? (
              <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[0.65rem] font-bold text-black">
                {count}
              </span>
            ) : null}
          </Link>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-neutral-900 px-4 py-1.5 md:hidden">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`whitespace-nowrap rounded-lg px-3 py-1 text-xs ${
                pathname === n.href ? "bg-neutral-800 text-white" : "text-neutral-400"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
      <footer className="border-t border-neutral-800 bg-[#0a0b10]">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-neutral-500">
          <span>PrimeBuild Official Store — tienda de inventario físico propio.</span>
          <span className="flex gap-4">
            <Link href="/shop/returns" className="hover:text-neutral-300">
              Devoluciones
            </Link>
            <Link href="/shop/policies" className="hover:text-neutral-300">
              Políticas
            </Link>
            <Link href="/shop/support" className="hover:text-neutral-300">
              Soporte
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
