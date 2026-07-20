import { PlannedSpaceView } from "@/components/os/planned-space-view";

/**
 * Planned commercial space — defined in the section registry, not built yet.
 * Renders an honest "espacio definido — aún no construido" state.
 * See src/config/sections.ts (id "online-pages") and its `order`.
 */
export default function Page() {
  return <PlannedSpaceView sectionId="online-pages" />;
}
