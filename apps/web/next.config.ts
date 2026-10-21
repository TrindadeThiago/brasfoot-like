import { readFileSync } from "node:fs";
import type { NextConfig } from "next";

// Versão do jogo: fonte única no package.json da raiz (016).
const { version } = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
) as { version: string };

// Static export obrigatório (Constituição v1.1.0): nada de recursos de servidor.
const config: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_APP_VERSION: version },
  transpilePackages: [
    "@brasfoot-like/engine",
    "@brasfoot-like/i18n",
    "@brasfoot-like/save",
    "@brasfoot-like/default-mod",
    "@brasfoot-like/modkit",
  ],
};

export default config;
