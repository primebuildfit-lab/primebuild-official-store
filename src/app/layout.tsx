import type { Metadata, Viewport } from "next";
import { app } from "@/config/app";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: {
    default: app.name,
    template: `%s · ${app.name}`,
  },
  description: app.description,
  applicationName: app.name,
  appleWebApp: { capable: true, title: app.shortName, statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#050609",
};

/**
 * The console is dark-locked by default ("fondo negro profundo"): the server
 * always renders `data-theme="dark"`, so there is no theme flash. The optional
 * light override is applied on the client by the topbar toggle.
 */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" data-theme="dark" suppressHydrationWarning>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
