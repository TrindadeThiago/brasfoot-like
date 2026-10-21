// Gera apps/web/out/manifest.webmanifest a partir das traduções (016 FR-038: o nome do jogo tem
// uma fonte só, `app.name`) e apps/web/out/version.json com a versão do package.json da raiz
// (lido pelo badge de versão do README). Roda no build, antes do precache.
import { readFileSync, writeFileSync } from "node:fs";
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

const OUT = join(REPO_ROOT, "apps", "web", "out");
writeFileSync(join(OUT, "manifest.webmanifest"), `${JSON.stringify(manifest(), null, 2)}\n`);
const { version } = JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf8")) as {
  version: string;
};
writeFileSync(join(OUT, "version.json"), `${JSON.stringify({ version })}\n`);
console.log(`manifest.webmanifest e version.json (${version}) gerados`);
