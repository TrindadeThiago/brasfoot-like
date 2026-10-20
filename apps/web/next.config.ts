import type { NextConfig } from "next";

// Static export obrigatório (Constituição v1.1.0): nada de recursos de servidor.
const config: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: [
    "@brasfoot-like/engine",
    "@brasfoot-like/i18n",
    "@brasfoot-like/save",
    "@brasfoot-like/default-mod",
    "@brasfoot-like/modkit",
  ],
};

export default config;
