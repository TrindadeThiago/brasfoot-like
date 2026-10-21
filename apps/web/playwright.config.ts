import { defineConfig, devices } from "@playwright/test";

// Antes de subir o servidor, o Playwright testa se a porta já responde. No WSL com rede
// "mirrored", conectar numa porta fechada de 127.0.0.1 só falha por timeout (~2,5 min); em ::1 a
// recusa é imediata. Fora do CI a verificação usa ::1 (o servidor escuta em IPv4 e IPv6).
const PROBE_HOST = process.env.CI ? "localhost" : "[::1]";

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  use: { baseURL: "http://localhost:4173", trace: "retain-on-failure" },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: "pnpm exec tsx ../../tools/src/serve-static.ts out 4173",
    url: `http://${PROBE_HOST}:4173`,
    reuseExistingServer: true,
  },
});
