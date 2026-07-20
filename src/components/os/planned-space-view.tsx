import { notFound } from "next/navigation";
import { PageHeader, PlannedSpace } from "@/components/ds";
import { getSection } from "@/config/sections";

/**
 * Renders a planned commercial space from the section registry: the standard
 * page header plus an honest "not built yet" state (see components/ds/
 * planned-space.tsx). Every planned route in the PBOS-001 rebuild is a thin
 * wrapper over this, so the honest scaffolding stays in one place.
 */
export function PlannedSpaceView({ sectionId }: { sectionId: string }) {
  const section = getSection(sectionId);
  if (!section) notFound();

  return (
    <div>
      <PageHeader
        eyebrow={section.group}
        title={section.label}
        description={section.summary}
        icon={section.icon}
      />
      <PlannedSpace purpose={section.purpose} order={section.order} scope={section.scope} />
    </div>
  );
}
