import { OsShell } from "@/components/os/os-shell";
import { isStoreConnected } from "@/server/integrations/store/config";

export const dynamic = "force-dynamic";

/**
 * The PrimeBuild Official Store shell. Passes down the honest store-connected
 * flag so the chrome reflects whether the live store is available.
 */
export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const generatedAt = new Intl.DateTimeFormat("es", { timeStyle: "short" }).format(new Date());
  return (
    <OsShell storeConnected={isStoreConnected()} generatedAt={generatedAt}>
      {children}
    </OsShell>
  );
}
