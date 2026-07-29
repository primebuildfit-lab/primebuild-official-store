/**
 * Navegación del storefront clonada del menú «main-menu» de Shopify
 * (PBOS-SCLP-FABLE-002 §6, capturado vía Admin API el 2026-07-24) más las
 * columnas del pb-footer. Los handles de colección mapean de forma estable a
 * /shop/collections/:handle (§26); los destinos que solo existen en Shopify
 * (Rewards, páginas informativas) enlazan al sitio real.
 */

export interface MenuItem {
  title: string;
  href: string;
  external?: boolean;
  children?: MenuItem[];
}

const LIVE = "https://primebuildfit.com";

export const STOREFRONT_MAIN_MENU: MenuItem[] = [
  { title: "Shop", href: "/shop/catalog" },
  {
    title: "SPORT",
    href: "/shop/collections/sport",
    children: [
      { title: "HIKING & OUTDOOR", href: "/shop/collections/hiking-outdoor" },
      { title: "GYM TRAINING", href: "/shop/collections/gym-training" },
      { title: "RUNNING", href: "/shop/collections/running" },
      { title: "SWIMMING", href: "/shop/collections/swimming" },
      { title: "YOGA & PILATES", href: "/shop/collections/yoga-pilates" },
    ],
  },
  {
    title: "Prime Essentials",
    href: "/shop/collections/primebuild-essentials",
    children: [
      { title: "Cardio Performance", href: "/shop/collections/cardio-performance" },
      { title: "Core Strength & Stability", href: "/shop/collections/core-strength-stability" },
      { title: "Hydration & Performance", href: "/shop/collections/hydration-performance" },
      { title: "Recovery & Mobility", href: "/shop/collections/recovery-mobility" },
      { title: "Strength Training Essentials", href: "/shop/collections/strength-training-essentials-1" },
    ],
  },
  { title: "Rewards", href: `${LIVE}/pages/rewards-center`, external: true },
  { title: "Future Update", href: `${LIVE}/pages/future-update`, external: true },
];

export interface FooterColumn {
  title: string;
  links: MenuItem[];
}

export const STOREFRONT_FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: "Shop",
    links: [
      { title: "All Products", href: "/shop/catalog" },
      { title: "New Arrivals", href: "/shop/new-arrivals" },
      { title: "Owned Inventory", href: "/shop/owned-inventory" },
      { title: "Business Buyers", href: "/shop/business" },
    ],
  },
  {
    title: "Account",
    links: [
      { title: "Login", href: `${LIVE}/pages/primebuild-account#login`, external: true },
      { title: "Register", href: `${LIVE}/pages/primebuild-account#register`, external: true },
      { title: "My Orders", href: "/shop/account" },
      { title: "Rewards", href: `${LIVE}/pages/rewards-center`, external: true },
    ],
  },
  {
    title: "Company",
    links: [
      { title: "About Us", href: "/shop/about" },
      { title: "How It Works", href: "/shop/how-it-works" },
      { title: "Affiliate Program", href: `${LIVE}/pages/primebuild-affiliate-program`, external: true },
      { title: "Contact Us", href: "/shop/contact" },
    ],
  },
  {
    title: "Help",
    links: [
      { title: "FAQ", href: "/shop/faq" },
      { title: "Shipping Policy", href: "/shop/shipping" },
      { title: "PB Pricing", href: "/shop/pb-pricing" },
      { title: "Track Your Order", href: "/shop/order-status" },
    ],
  },
];

export const STOREFRONT_FOOTER_CONTENT = {
  newsHeading: "Join PrimeBuild",
  newsSubtext: "New drops, training tips, and early access to rewards. No spam.",
  brandBlurb:
    "Premium gear. Proven results. Built for your performance. This is more than a brand. It's your lifestyle.",
  tagline: "Built different. Built to last.",
  trustItems: [
    { icon: "🚚", title: "Fast & Reliable Shipping", description: "Quick delivery on orders so you can keep building." },
    { icon: "🛡️", title: "Secure Checkout", description: "Your information is protected with industry-standard security." },
    { icon: "🏆", title: "Rewards & Perks", description: "Earn points, unlock rewards, and get exclusive benefits." },
  ],
  guarantees: [
    { icon: "✅", title: "Premium Quality", description: "Tested. Trusted. Proven." },
    { icon: "⭐", title: "Athlete Approved", description: "Used by real athletes." },
    { icon: "🛡️", title: "Money Back Guarantee", description: "30-day hassle-free returns." },
  ],
} as const;

/** Home clonada (templates/index.json): franjas de productos destacados. */
export const STOREFRONT_HOME_STRIPS = [
  { heading: "👕 Performance Apparel", collection: "activewear", viewAll: "/shop/collections/activewear" },
  { heading: "💪 Strength & Training Gear", collection: "strength-training-essentials-1", viewAll: "/shop/collections/strength-training-essentials-1" },
  { heading: "🔥 Recovery & Mobility", collection: "recovery-mobility", viewAll: "/shop/collections/recovery-mobility" },
  { heading: "Gear & Accessories", collection: "primebuild-essentials", viewAll: "/shop/collections/primebuild-essentials" },
] as const;

/** Descripciones de categoría de la home (texto literal del theme). */
export const STOREFRONT_CATEGORY_DESCRIPTIONS = [
  {
    eyebrow: "Sport",
    heading: "Built for every discipline",
    body: "From the track to the trail, the pool to the platform — PrimeBuild™ Sport equips you for every discipline. Performance gear engineered for cyclists, runners, swimmers, lifters, and everyone who trains with purpose. Whatever your sport, we build for it.",
    linkLabel: "Shop Sport",
    href: "/shop/collections/sport",
  },
  {
    eyebrow: "Prime Essentials",
    heading: "The gear behind every rep",
    body: "The gear that supports every rep, every recovery day, every rebuild. PrimeBuild™ Essentials covers strength foundations, core stability, recovery tools, cardio performance, and hydration — everything you need to train harder and recover smarter.",
    linkLabel: "Shop Essentials",
    href: "/shop/collections/primebuild-essentials",
  },
] as const;

/** Hero de la home (sección hero del theme, media desde el CDN real). */
export const STOREFRONT_HERO = {
  heading: "Performance Gear, Built for Every Rep",
  ctaLabel: "Shop all",
  ctaHref: "/shop/catalog",
  videoUrl:
    "https://primebuildfit.com/cdn/shop/videos/c/vp/508a582801704f6487f76d9bb61ac659/508a582801704f6487f76d9bb61ac659.HD-1080p-7.2Mbps-85525157.mp4?v=0",
} as const;

/** Tiles del bento «Shop by collection» (imágenes de colección del CDN real). */
export const STOREFRONT_BENTO_TILES = [
  {
    label: "Prime Essentials",
    href: "/shop/collections/primebuild-essentials",
    image: "https://primebuildfit.com/cdn/shop/collections/b0964ebe-61dd-453d-9208-1b58774cd340.png?v=1783124384&width=1000",
  },
  {
    label: "Sport",
    href: "/shop/collections/sport",
    image: "https://primebuildfit.com/cdn/shop/collections/sport.png?v=1782740383&width=1000",
  },
] as const;
