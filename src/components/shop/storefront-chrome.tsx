"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  STOREFRONT_FOOTER_COLUMNS,
  STOREFRONT_FOOTER_CONTENT,
  STOREFRONT_MAIN_MENU,
  type MenuItem,
} from "@/config/storefront-menu";
import { useCartLines } from "@/lib/official-store-data";

/**
 * Chrome del storefront clonado del theme «Primebuild 1.1» (PBOS-SCLP-FABLE-002
 * §6): rewards bar lime, pb-header con dropdowns sin JS (hover/details),
 * pb-footer completo (newsletter, 6 columnas con confianza, garantías, badge)
 * y el modal de bienvenida PB una vez por sesión. Los estilos viven en
 * src/styles/shopify-clone.css, transcritos 1:1 del sitio real.
 */

function ItemLink({
  item,
  className,
  children,
}: {
  item: MenuItem;
  className: string;
  children: React.ReactNode;
}) {
  if (item.external) {
    return (
      <a href={item.href} className={className} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  }
  return (
    <Link href={item.href} className={className}>
      {children}
    </Link>
  );
}

export function RewardsBar() {
  return (
    <div className="pb-rewards-bar">
      <div className="pb-rewards-bar__inner">
        <a
          href="https://primebuildfit.com/pages/rewards-center"
          target="_blank"
          rel="noreferrer"
          className="pb-rewards-bar__brand"
        >
          <span className="pb-rewards-bar__coin-symbol">PB</span>
          PrimeBuild Rewards
        </a>
        <div className="pb-rewards-bar__middle" aria-hidden>
          <div className="pb-rewards-bar__coins">
            <span className="pb-rewards-bar__coin" />
            <span className="pb-rewards-bar__coin" />
            <span className="pb-rewards-bar__coin" />
            <span className="pb-rewards-bar__coin" />
            <span className="pb-rewards-bar__coin" />
          </div>
        </div>
        <a
          href="https://primebuildfit.com/pages/rewards-center"
          target="_blank"
          rel="noreferrer"
          className="pb-rewards-bar__cta"
        >
          Unlock Multipliers →
        </a>
      </div>
    </div>
  );
}

export function StoreHeader() {
  const cart = useCartLines();
  const count = cart.items.reduce((acc, l) => acc + l.quantity, 0);

  return (
    <header className="pb-header">
      <div className="pb-header-inner">
        <Link href="/shop" className="pb-logo" aria-label="PrimeBuild">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/pb-logo-lime.png" alt="PrimeBuild — Built for more" />
        </Link>

        <nav className="pb-nav" aria-label="Principal">
          {STOREFRONT_MAIN_MENU.map((item) => (
            <div key={item.title} className="pb-nav-item">
              <ItemLink item={item} className="pb-nav-link">
                {item.title}
                {item.children ? <span className="pb-caret" /> : null}
              </ItemLink>
              {item.children ? (
                <div className="pb-dropdown">
                  {item.children.map((sub) => (
                    <ItemLink key={sub.title} item={sub} className="pb-dropdown-link">
                      {sub.title}
                    </ItemLink>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </nav>

        <div className="pb-icons">
          <Link href="/shop/search" className="pb-icon-link" aria-label="Buscar">
            <svg viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </Link>
          <Link href="/shop/account" className="pb-icon-link" aria-label="Cuenta">
            <svg viewBox="0 0 24 24">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </Link>
          <Link href="/shop/cart" className="pb-icon-link" aria-label="Carrito">
            <svg viewBox="0 0 24 24">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <path d="M3 6h18" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            {count > 0 ? <span className="pb-cart-count">{count}</span> : null}
          </Link>

          <details className="pb-mobile-toggle">
            <summary aria-label="Menú">
              <span className="pb-burger-line" />
              <span className="pb-burger-line" />
              <span className="pb-burger-line" />
            </summary>
            <div className="pb-mobile-panel">
              {STOREFRONT_MAIN_MENU.map((item) => (
                <div key={item.title}>
                  <ItemLink item={item} className="pb-mobile-link">
                    {item.title}
                  </ItemLink>
                  {item.children ? (
                    <div className="pb-mobile-sub">
                      {item.children.map((sub) => (
                        <ItemLink key={sub.title} item={sub} className="pb-mobile-link">
                          {sub.title}
                        </ItemLink>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}

export function StoreFooter() {
  const [newsletterMsg, setNewsletterMsg] = useState<string | null>(null);
  const c = STOREFRONT_FOOTER_CONTENT;

  return (
    <footer className="pb-ft">
      <div className="pb-ft-news">
        <h2 className="pb-ft-news-title">{c.newsHeading}</h2>
        <p className="pb-ft-news-sub">{c.newsSubtext}</p>
        <form
          className="pb-ft-news-form"
          onSubmit={(e) => {
            e.preventDefault();
            setNewsletterMsg(
              "La suscripción se gestiona en primebuildfit.com — esta tienda no envía correos todavía.",
            );
          }}
        >
          <input className="pb-ft-news-input" type="email" placeholder="Email address" aria-label="Email" />
          <button className="pb-ft-news-btn" type="submit">
            Join
          </button>
        </form>
        {newsletterMsg ? <p className="pb-ft-news-message">{newsletterMsg}</p> : null}
      </div>

      <div className="pb-ft-main">
        <div>
          <p className="pb-ft-brand-title">PRIMEBUILD</p>
          <p className="pb-ft-brand-blurb">{c.brandBlurb}</p>
        </div>
        {STOREFRONT_FOOTER_COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="pb-ft-col-title">{col.title}</p>
            {col.links.map((l) => (
              <ItemLink key={l.title} item={l} className="pb-ft-link">
                {l.title}
              </ItemLink>
            ))}
          </div>
        ))}
        <div className="pb-ft-trust-col">
          {c.trustItems.map((t) => (
            <div key={t.title} className="pb-ft-trust-item">
              <span className="pb-ft-trust-icon">{t.icon}</span>
              <div>
                <p className="pb-ft-trust-title">{t.title}</p>
                <p className="pb-ft-trust-desc">{t.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pb-ft-bottom">
        <div className="pb-ft-bottom-top">
          <div className="pb-ft-badge-brand">
            <span className="pb-ft-badge-mark">PB</span>
            <span className="pb-ft-badge-tagline">{c.tagline}</span>
          </div>
          <div className="pb-ft-guarantees">
            {c.guarantees.map((g) => (
              <div key={g.title} className="pb-ft-guarantee">
                <span className="pb-ft-guarantee-icon">{g.icon}</span>
                <div>
                  <p className="pb-ft-guarantee-title">{g.title}</p>
                  <p className="pb-ft-guarantee-desc">{g.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="pb-ft-bottom-lower">
          <span className="pb-ft-copyright">
            © {new Date().getFullYear()} PrimeBuild · Official Store — inventario físico propio
          </span>
          <span className="pb-ft-payments">PB · USD (modo cotización sin proveedor)</span>
        </div>
      </div>
    </footer>
  );
}

/** Modal de bienvenida clonado (pb-signup-modal); una vez por sesión. */
export function SignupModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("pbSignupModalDismissed") !== "1") setOpen(true);
    } catch {
      /* sin storage no se muestra */
    }
  }, []);

  const dismiss = () => {
    try {
      sessionStorage.setItem("pbSignupModalDismissed", "1");
    } catch {
      /* best effort */
    }
    setOpen(false);
  };

  if (!open) return null;
  return (
    <div className="pb-signup-backdrop" role="dialog" aria-modal aria-label="PrimeBuild Access">
      <div className="pb-signup-modal">
        <button className="pb-signup-modal__close" onClick={dismiss} aria-label="Cerrar">
          ×
        </button>
        <div className="pb-signup-modal__left">
          <div className="pb-signup-modal__badge">
            <div className="pb-signup-modal__badge-logo">PB</div>
            <div className="pb-signup-modal__badge-name">PrimeBuild</div>
            <div className="pb-signup-modal__badge-sub">Rewards Access</div>
            <div className="pb-signup-modal__badge-tagline">
              Your journey
              <br />
              starts here
            </div>
            <div className="pb-signup-modal__badge-coin">PB</div>
          </div>
        </div>
        <div className="pb-signup-modal__right">
          <h2 className="pb-signup-modal__heading">
            Unlock your <span>PrimeBuild access</span>
          </h2>
          <p className="pb-signup-modal__body">
            Join PrimeBuild Rewards and start earning PB Coins, daily rewards, exclusive offers, and
            more.
          </p>
          <a
            className="pb-signup-modal__btn pb-signup-modal__btn--gold"
            href="https://primebuildfit.com/pages/primebuild-account#login"
            target="_blank"
            rel="noreferrer"
          >
            Log in
          </a>
          <a
            className="pb-signup-modal__btn pb-signup-modal__btn--outline"
            href="https://primebuildfit.com/pages/primebuild-account#register"
            target="_blank"
            rel="noreferrer"
          >
            Create account
          </a>
          <p className="pb-signup-modal__or">OR</p>
          <button className="pb-signup-modal__btn pb-signup-modal__btn--outline" onClick={dismiss}>
            Continue as guest
          </button>
          <p className="pb-signup-modal__note">
            🔒 Rewards and PB Coins are only available to PrimeBuild account holders. La identidad
            unificada del ecosistema llegará vía Nexus.
          </p>
        </div>
      </div>
    </div>
  );
}
