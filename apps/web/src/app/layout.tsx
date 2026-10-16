import { formatUi } from "@brasfoot-like/i18n";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { GameProvider } from "../game/GameProvider";
import "../styles/global.css";
import { RegisterServiceWorker } from "./register-sw";

export const metadata: Metadata = {
  title: formatUi("app.title"),
  description: formatUi("app.tagline"),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <GameProvider>{children}</GameProvider>
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
