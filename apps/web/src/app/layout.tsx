import { formatUi } from "@brasfoot-like/i18n";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { GameProvider } from "../game/GameProvider";
import { GlobalShortcuts } from "../ui/GlobalShortcuts";
import { SiteAnalytics } from "../ui/SiteAnalytics";
import { THEME_SCRIPT, ThemeSync } from "../ui/ThemeProvider";
import { UpdateNotice } from "../ui/UpdateNotice";
import "../styles/global.css";
import { RegisterServiceWorker } from "./register-sw";

// Endereço público (016): usado só para as URLs absolutas das prévias de link.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://treinador-fc.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: formatUi("app.name"),
  description: formatUi("app.description"),
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon.svg", apple: "/icons/icon-192.png" },
  openGraph: {
    title: formatUi("app.name"),
    description: formatUi("app.description"),
    images: ["/screenshots/home.png"],
    type: "website",
    locale: "pt_BR",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // `data-theme` é definido pelo script antes da hidratação.
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: script fixo do próprio jogo, aplica o tema antes da pintura */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <ThemeSync />
        <GameProvider>
          <GlobalShortcuts>{children}</GlobalShortcuts>
          <UpdateNotice />
        </GameProvider>
        <RegisterServiceWorker />
        <SiteAnalytics />
      </body>
    </html>
  );
}
