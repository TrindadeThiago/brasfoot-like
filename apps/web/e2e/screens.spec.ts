import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { createCareer, t } from "./helpers";

// Capturas das telas da 031 nos dois temas e nas três larguras, para folhear a olho (quickstart 9).
// Só roda com SCREENS=1 e grava em `apps/web/screens-031/` (fora do git).
test.skip(!process.env.SCREENS, "defina SCREENS=1 para gerar as capturas");

const DIR = join(import.meta.dirname, "..", "screens-031");
const WIDTHS = [1440, 1280, 1024];
const PAGES: [string, string][] = [
  ["menu", "/"],
  ["nova-carreira", "/nova-carreira/"],
  ["carreiras", "/carreiras/"],
  ["configuracoes", "/configuracoes/"],
  ["mods", "/mods/"],
  ["sobre", "/sobre/"],
  ["notas", "/notas-de-versao/"],
];

for (const theme of ["dark", "light"] as const) {
  test(`capturas das telas de entrada, tema ${theme}`, async ({ page }) => {
    test.setTimeout(240_000);
    mkdirSync(DIR, { recursive: true });
    await page.addInitScript((value) => {
      const key = "brasfoot-like:preferences";
      const prefs = JSON.parse(localStorage.getItem(key) ?? "{}");
      localStorage.setItem(key, JSON.stringify({ ...prefs, theme: value }));
    }, theme);
    await createCareer(page, "Ana Souza", 1);
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      for (const [name, path] of PAGES) {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        await page.screenshot({ path: join(DIR, `${theme}-${width}-${name}.png`), fullPage: true });
      }
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/nova-carreira/");
    await page.getByRole("button", { name: t("newCareer.confirm") }).click();
    await page.screenshot({ path: join(DIR, `${theme}-1280-nova-carreira-erros.png`) });
    await page.goto("/carreiras/");
    await page
      .getByRole("button", { name: t("saves.delete") })
      .first()
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.screenshot({ path: join(DIR, `${theme}-1280-carreiras-apagar.png`) });
    await page.keyboard.press("Escape");
    await page.goto("/");
    await page.getByRole("button", { name: t("nav.help") }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.screenshot({ path: join(DIR, `${theme}-1280-ajuda-atalhos.png`) });
  });
}
