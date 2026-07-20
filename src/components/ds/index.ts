/**
 * PrimeBuild Official Store — shared Design System (ds).
 *
 * A self-contained, copy-ready set of premium primitives that define the whole
 * commercial console's visual language: dark-first, single indigo→violet accent,
 * semantic tokens (see src/styles/globals.css). These components import nothing
 * app-specific beyond `@/lib/cn`, so the folder can be lifted wholesale into the
 * sibling ecosystem apps (Nexus / CoinOS / Eventra / Partnera / Internal OS)
 * once a real shared package exists.
 *
 * App-specific shell composition (sidebar, topbar, command palette, module
 * header) lives in `@/components/os` and builds on top of these primitives.
 */

export { Icon, isIconName, type IconName } from "./icon";
export { Button, type ButtonProps, type ButtonVariant, type ButtonSize } from "./button";
export { Card, CardHeader, CardTitle, CardDescription, CardContent, type CardProps } from "./card";
export { Badge, Chip, BADGE_KIND_CLASSES, type BadgeKind } from "./badge";
export { StatusBadge, type StatusTone as StatusBadgeTone } from "./status-badge";
export { SourceBadge, type SourceVerification } from "./source-badge";
export { StatusDot, type StatusTone } from "./status-dot";
export { Spinner, Skeleton, SkeletonRows } from "./feedback";
export { Panel } from "./panel";
export { PageHeader } from "./page-header";
export { KpiCard, TrendDelta } from "./kpi-card";
export { MetricCard } from "./metric-card";
export { MoneyValue, QuantityValue, formatMoney, decimalPlaces } from "./values";
export { ExternalLinkAction, isSafeExternalUrl } from "./external-link-action";
export { Sparkline, MiniBars, DonutStat, type BarDatum } from "./charts";
export { DataTable, type Column } from "./data-table";
// Honest states — single source (states.tsx). empty-state.tsx keeps the
// Shopify-specific StoreNotConnected and re-exports NoData for back-compat.
export {
  HonestState,
  NoData,
  ConnectionState,
  PermissionState,
  ErrorState,
  NotImplemented,
  type HonestStateTone,
} from "./states";
export { StoreNotConnected } from "./empty-state";
export { PlannedSpace } from "./planned-space";
export { ActivityTimeline, type ActivityEvent } from "./activity-timeline";
export { SavedViews, type SavedView } from "./saved-views";
export { FilterBar } from "./filter-bar";
export { BulkActionBar, type BulkAction } from "./bulk-action-bar";
export { DetailDrawer } from "./detail-drawer";
export { UnsavedChangesBar } from "./unsaved-changes-bar";
export { SegmentedControl, type TabOption } from "./tabs";
export { Modal } from "./modal";
export { SearchInput, Toolbar } from "./search-input";
