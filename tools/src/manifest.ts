// Gera apps/web/out/manifest.webmanifest a partir das traduções (016 FR-038: o nome do jogo tem
// uma fonte só, `app.name`). Roda no build, antes do precache.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { formatUi } from "@brasfoot-like/i18n";
import { REPO_ROOT } from "./fs-bank";

const BACKGROUND = "#0f1419";

export function manifest() {
  return {
    name: formatUi("app.name"),
    short_name: formatUi("app.name"),
    description: formatUi("app.description"),
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: BACKGROUND,
    theme_color: BACKGROUND,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}

const path = join(REPO_ROOT, "apps", "web", "out", "manifest.webmanifest");
writeFileSync(path, `${JSON.stringify(manifest(), null, 2)}\n`);
console.log("manifest.webmanifest gerado");
