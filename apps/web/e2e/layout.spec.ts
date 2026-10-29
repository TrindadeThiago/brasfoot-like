import { expect, type Page, test } from "@playwright/test";
import { createCareer, simulateSeason, t } from "./helpers";

// 025 SC-001 / FR-010 / FR-011: as telas abrem na nova estrutura, nos dois temas, em 1440, 1024 e
// 768 px, sem rolagem horizontal da página. A 600 px a barra lateral empilha acima do conteúdo.
const WIDTHS = [1440, 1280, 1024, 768];
// 026: as três telas do dia a dia, validadas também contra texto cortado e botões fora da janela.
const DAILY = [
  "/jogo/",
  "/jogo/elenco/",
  "/jogo/escalacao/",
  // 027: as telas de acompanhamento também não cortam texto.
  "/jogo/competicao/",
  "/jogo/competicao/resultados/",
  "/jogo/competicao/artilharia/",
  "/jogo/calendario/",
  "/jogo/historico/",
];
const OUTSIDE = [
  "/",
  "/nova-carreira/",
  "/carreiras/",
  "/configuracoes/",
  "/mods/",
  "/sobre/",
  "/notas-de-versao/",
];
const CLUB = [
  "/jogo/",
  "/jogo/elenco/",
  "/jogo/escalacao/",
  "/jogo/competicao/",
  "/jogo/calendario/",
  "/jogo/financas/",
  "/jogo/historico/",
  "/jogo/mercado/",
  "/jogo/carreira/",
  "/jogo/noticias/",
];

async function expectNoHorizontalScroll(page: Page, label: string): Promise<void> {
  await page.waitForLoadState("networkidle");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, `${label}: rolagem horizontal da página`).toBeLessThanOrEqual(0);
}

/** Elementos com texto escondido por `overflow: hidden` sem reticências (texto cortado de verdade). */
async function expectNoClippedText(page: Page, label: string): Promise<void> {
  const clipped = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("main *, header *")]
      .filter((element) => {
        const style = getComputedStyle(element);
        // O texto só-leitor-de-tela (`visually-hidden`) é cortado de propósito.
        if (element.classList.contains("visually-hidden")) return false;
        return (
          style.overflowX === "hidden" &&
          style.textOverflow !== "ellipsis" &&
          element.scrollWidth > element.clientWidth + 1 &&
          (element.textContent ?? "").trim().length > 0
        );
      })
      .map((element) => `${element.tagName}.${element.className}`)
      .slice(0, 5),
  );
  expect(clipped, `${label}: texto cortado`).toEqual([]);
}

for (const theme of ["dark", "light"] as const) {
  test(`19 telas sem rolagem horizontal em 1440, 1024 e 768 px, tema ${theme}`, async ({
    page,
  }) => {
    test.setTimeout(420_000);
    await page.addInitScript((value) => {
      const key = "brasfoot-like:preferences";
      const prefs = JSON.parse(localStorage.getItem(key) ?? "{}");
      localStorage.setItem(key, JSON.stringify({ ...prefs, theme: value }));
    }, theme);
    await createCareer(page, "Ana Souza", 1);
    const career = new URL(page.url()).searchParams.get("c") ?? "";

    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of OUTSIDE) {
        await page.goto(path);
        await expectNoHorizontalScroll(page, `${path} @${width}`);
      }
      for (const path of CLUB) {
        await page.goto(`${path}?c=${career}`);
        await expect(page.getByRole("navigation", { name: t("nav.menu") })).toBeVisible();
        await expectNoHorizontalScroll(page, `${path} @${width}`);
      }
    }

    // As três telas do dia a dia: sem texto cortado e, no Início, com as ações de jogar à vista.
    for (const width of [1440, 1280, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of DAILY) {
        await page.goto(`${path}?c=${career}`);
        await page.waitForLoadState("networkidle");
        await expectNoClippedText(page, `${path} @${width}`);
      }
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/jogo/?c=${career}`);
    for (const name of [t("home.playLive"), t("home.simulate")]) {
      const box = await page.getByRole("button", { name }).boundingBox();
      expect((box?.y ?? 0) + (box?.height ?? 0), `${name} dentro de 900 px`).toBeLessThanOrEqual(
        900,
      );
    }

    // Finanças: cada aba (com gráficos) sem rolagem horizontal da página nem texto cortado (028).
    for (const width of [1440, 1280, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/jogo/financas/?c=${career}`);
      for (const key of ["overview", "flow", "gate", "stadium", "credit", "history"]) {
        await page.getByRole("tab", { name: t(`finance.tab.${key}`) }).click();
        await expectNoHorizontalScroll(page, `finanças/${key} @${width}`);
        await expectNoClippedText(page, `finanças/${key} @${width}`);
      }
    }

    // Abaixo de 768 px a barra empilha acima do conteúdo, sem perder nenhuma tela.
    await page.setViewportSize({ width: 600, height: 900 });
    await page.goto(`/jogo/elenco/?c=${career}`);
    const nav = page.getByRole("navigation", { name: t("nav.menu") });
    await expect(nav.getByRole("link")).toHaveCount(10);
    const [navBox, mainBox] = await Promise.all([
      nav.boundingBox(),
      page.locator("main").boundingBox(),
    ]);
    expect((navBox?.y ?? 0) + (navBox?.height ?? 0)).toBeLessThanOrEqual((mainBox?.y ?? 0) + 1);
    await expectNoHorizontalScroll(page, "elenco @600");

    // Tela de foco: rodada ao vivo (sem barra lateral).
    await page.setViewportSize({ width: 768, height: 900 });
    await page.goto(`/jogo/?c=${career}`);
    await page.getByRole("button", { name: t("home.playLive") }).click();
    await expect(page.getByRole("region", { name: t("round.myMatch") })).toBeVisible();
    await expect(page.getByRole("navigation", { name: t("nav.menu") })).toHaveCount(0);
    await expectNoHorizontalScroll(page, "rodada @768");

    // Fim de temporada, em cada largura.
    await page.goto(`/jogo/?c=${career}`);
    await simulateSeason(page);
    await expect(page).toHaveURL(/fim-de-temporada/);
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.getByRole("navigation", { name: t("nav.menu") })).toHaveCount(0);
      await expectNoHorizontalScroll(page, `fim-de-temporada @${width}`);
    }
  });
}
