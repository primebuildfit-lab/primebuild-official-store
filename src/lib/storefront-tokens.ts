/**
 * PrimeBuildStorefrontTokens (PBOS-SCLP-FABLE-002 §8).
 *
 * Tokens de diseño extraídos del theme Shopify activo «Primebuild 1.1»
 * (137969598672, MAIN) y del storefront real renderizado (2026-07-24).
 * Son la fuente única del clon: la hoja src/styles/shopify-clone.css los
 * materializa como variables CSS y los tests de paridad los verifican.
 */

export const PRIMEBUILD_STOREFRONT_TOKENS = {
  source: {
    themeId: "gid://shopify/OnlineStoreTheme/137969598672",
    themeName: "Primebuild 1.1",
    themeRole: "MAIN",
    capturedAt: "2026-07-24",
    method: "theme settings via Admin API + storefront real renderizado (docs/theme-reference)",
  },
  colors: {
    background: "#0a0a0a",
    backgroundElevated: "#111",
    backgroundTile: "#141414",
    text: "#f5f5f0",
    textBody: "#b8b8b0",
    textMuted: "#999",
    textFaint: "#888",
    gold: "#c9a227",
    lime: "#c6ff3d",
    line: "#1e1e1e",
    lineSoft: "#1a1a1a",
    lineStrong: "#333",
    dropdownLine: "#262626",
    heroOverlay: "#12121266",
    lightBackground: "#ffffff",
    lightText: "#121212",
  },
  typography: {
    sans: `-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif`,
    serif: `Georgia, "Times New Roman", serif`,
    theme: `Inter, -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif`,
    navSize: "13px",
    navWeight: 700,
    navLetterSpacing: "0.06em",
    serifHeadingSize: "clamp(28px, 4vw, 46px)",
    serifHeadingSpacing: "0.08em",
    cardTitleSize: "13px",
    cardPriceSize: "13px",
  },
  spacing: {
    headerPadding: "26px 32px",
    headerMaxWidth: 1600,
    contentMaxWidth: 1400,
    bentoMaxWidth: 1300,
    catdescMaxWidth: 1200,
    footerMaxWidth: 1500,
    sectionPadding: "72px 24px",
    bentoPadding: "64px 24px",
    gridGap: 28,
    bentoGap: 12,
  },
  radii: {
    tile: 6,
    bentoTile: 4,
    pill: 999,
    dropdown: 8,
    panel: 12,
    trustIcon: 8,
  },
  breakpoints: { mobile: 749, desktopNav: 989, footerNarrow: 1100 },
  animation: {
    imageHover: "transform 0.5s ease",
    imageHoverScale: 1.05,
    bentoHoverScale: 1.06,
    accentUnderline: "width 0.3s ease",
    coinBounce: "1.6s ease-in-out infinite",
  },
  grid: { columnsDesktop: 4, columnsTablet: 3, columnsMobile: 2 },
  components: {
    subcatThumbSize: 116,
    subcatRingActive: "#c9a227",
    cartCountBg: "#c6ff3d",
    badgeBg: "#c9a227",
    sortPillActiveBg: "#c9a227",
    footerColumns: "1.3fr 1fr 1fr 1fr 1fr 1.2fr",
  },
} as const;

export type StorefrontTokens = typeof PRIMEBUILD_STOREFRONT_TOKENS;
