import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { createCareer, simulateSeason, t } from "./helpers";

// 016 US4 (FR-017–FR-022, SC-004): varredura axe nas telas principais, nos dois temas. Falha com
// violações graves ou críticas.
const PAGES = [
  "/",
  "/carreiras/",
  "/nova-carreira/",
  "/mods/",
  "/configuracoes/",
  "/sobre/",
  "/notas-de-versao/",
];
const GAME = [
  "/jogo/",
  "/jogo/elenco/",
  "/jogo/escalacao/",
  "/jogo/competicao/",
  "/jogo/competicao/resultados/",
  "/jogo/competicao/artilharia/",
  "/jogo/calendario/",
  "/jogo/financas/",
  "/jogo/historico/",
  "/jogo/mercado/",
  "/jogo/carreira/",
  "/jogo/noticias/",
];

async function scan(page: Page, label: string): Promise<string[]> {
  await page.waitForLoadState("networkidle");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  // Garante que a varredura rodou de fato sobre a página.
  expect(results.passes.length, label).toBeGreaterThan(0);
  return results.violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .map(
      (violation) =>
        `${label}: ${violation.id} (${violation.impact}) — ${violation.nodes
          .slice(0, 3)
          .map((node) => node.target.join(" "))
          .join(", ")}`,
    );
}

for (const theme of ["dark", "light"] as const) {
  test(`sem violações graves de acessibilidade no tema ${theme}`, async ({ page }) => {
    test.setTimeout(420_000);
    await page.addInitScript((value) => {
      const key = "brasfoot-like:preferences";
      const prefs = JSON.parse(localStorage.getItem(key) ?? "{}");
      localStorage.setItem(key, JSON.stringify({ ...prefs, theme: value }));
    }, theme);
    await createCareer(page, "Ana Souza", 1);
    const career = new URL(page.url()).searchParams.get("c") ?? "";
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);

    const problems: string[] = [];
    for (const path of PAGES) {
      await page.goto(path);
      problems.push(...(await scan(page, path)));
    }
    for (const path of GAME) {
      await page.goto(`${path}?c=${career}`);
      await expect(page.getByRole("navigation", { name: t("nav.menu") })).toBeVisible();
      problems.push(...(await scan(page, path)));
    }
    // Modal do jogador no Elenco (026), com as ações.
    await page.goto(`/jogo/elenco/?c=${career}`);
    await page
      .getByRole("button", { name: /^Detalhes de / })
      .first()
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    problems.push(...(await scan(page, "/jogo/elenco/ (modal)")));
    await page.keyboard.press("Escape");

    // Ajuda de atalhos aberta.
    await page.keyboard.press("?");
    await expect(page.getByRole("dialog", { name: t("help.title") })).toBeVisible();
    problems.push(...(await scan(page, "ajuda")));
    await page.keyboard.press("Escape");

    // Rodada ao vivo, pausada para a página ficar estável.
    await page.goto(`/jogo/?c=${career}`);
    await page.getByRole("button", { name: t("home.playLive") }).click();
    await expect(page.getByRole("region", { name: t("round.myMatch") })).toBeVisible();
    await page.getByRole("button", { name: t("round.pause") }).click();
    problems.push(...(await scan(page, "/jogo/rodada/")));

    // Fim de temporada (025: tela de foco).
    await page.goto(`/jogo/?c=${career}`);
    await simulateSeason(page);
    await expect(page).toHaveURL(/fim-de-temporada/);
    problems.push(...(await scan(page, "/jogo/fim-de-temporada/")));

    expect(problems).toEqual([]);
  });
}
