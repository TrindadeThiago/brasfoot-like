// Gera as capturas da página Sobre e os ícones do app (016 R11), a partir do build estático, com o
// banco fictício padrão e seed fixa. Uso: pnpm build:web && pnpm screenshots
import { type ChildProcess, spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Page } from "@playwright/test";
import { REPO_ROOT } from "./fs-bank";

const WEB = join(REPO_ROOT, "apps", "web");
const PORT = 4181;
const BASE = `http://localhost:${PORT}`;
const SHOTS = join(WEB, "public", "screenshots");
const ICONS = join(WEB, "public", "icons");
const UI: Record<string, string> = JSON.parse(
  readFileSync(join(REPO_ROOT, "packages", "i18n", "locales", "pt-BR", "ui.json"), "utf8"),
);

function t(key: string, values: Record<string, string | number> = {}): string {
  const template = UI[key];
  if (template === undefined) throw new Error(`chave inexistente: ${key}`);
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ""));
}

async function waitForServer(): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      if ((await fetch(BASE)).ok) return;
    } catch {
      // ainda subindo
    }
    await new Promise((done) => setTimeout(done, 200));
  }
  throw new Error("servidor estático não respondeu");
}

async function icons(page: Page): Promise<void> {
  const svg = readFileSync(join(ICONS, "icon.svg"), "utf8");
  for (const size of [192, 512]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<html><body style="margin:0;background:transparent">${svg.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body></html>`,
    );
    await page.screenshot({ path: join(ICONS, `icon-${size}.png`), omitBackground: true });
  }
}

async function shoot(page: Page, name: string): Promise<void> {
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(SHOTS, `${name}.png`) });
  console.log(`  ${name}.png`);
}

async function main() {
  mkdirSync(SHOTS, { recursive: true });
  const server: ChildProcess = spawn(
    "pnpm",
    [
      "exec",
      "tsx",
      join(REPO_ROOT, "tools", "src", "serve-static.ts"),
      join(WEB, "out"),
      String(PORT),
    ],
    { stdio: "ignore" },
  );
  try {
    await waitForServer();
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await icons(page);

    await page.setViewportSize({ width: 1280, height: 800 });
    // Sem dicas e no tema escuro, para as capturas mostrarem as telas limpas.
    await page.addInitScript(() => {
      const key = "brasfoot-like:preferences";
      if (!localStorage.getItem(key)) {
        localStorage.setItem(
          key,
          JSON.stringify({ theme: "dark", tips: { dismissed: [], skipAll: true } }),
        );
      }
    });
    await page.goto(`${BASE}/nova-carreira/`);
    await page.getByLabel(t("newCareer.managerName")).fill("Ana Souza");
    await page.getByText(t("newCareer.advanced")).click();
    await page.getByLabel(t("newCareer.seed")).fill("lancamento-1");
    const table = page.getByRole("table", {
      name: t("newCareer.clubsCaption", { division: "Série A" }),
    });
    await table.locator("tbody tr").nth(5).click();
    await page.getByRole("button", { name: t("newCareer.confirm") }).click();
    await page.waitForURL(/\/jogo\//);
    for (let round = 0; round < 6; round++) {
      await page.keyboard.press("d");
      await page.waitForTimeout(400);
    }
    await shoot(page, "home");
    await page.keyboard.press("4");
    await page.waitForURL(/competicao/);
    await shoot(page, "table");
    await page.keyboard.press("m");
    await page.waitForURL(/mercado/);
    await shoot(page, "market");
    await page.keyboard.press("c");
    await page.waitForURL(/carreira/);
    await shoot(page, "career");
    await page.keyboard.press("1");
    await page.waitForURL(/\/jogo\/\?/);
    await page.getByRole("button", { name: t("home.playLive") }).click();
    await page.waitForURL(/rodada/);
    await page.getByLabel(t("round.speed")).selectOption("fast");
    await page.waitForTimeout(6000);
    await page.keyboard.press(" ");
    await shoot(page, "round");
    await browser.close();
  } finally {
    server.kill();
  }
}

await main();
